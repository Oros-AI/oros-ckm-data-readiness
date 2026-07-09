// scoring/index.js
// Thin orchestrator for the deterministic scoring engine — checks stage only
// (7g A1). Sequences the eleven check modules per session; contains NO scoring
// logic, NO condition logic, NO status mapping. Aggregation (7g B), pathway
// evaluation (7h), use-case readiness (7i), and work items (7j) come later.
//
// Usage:  node scoring/index.js --session <A|B|C|all|session-uuid>
//   Letters resolve via demo_sessions.dataset_state; a raw session UUID is
//   accepted and must exist in demo_sessions.
//
// Startup: configs load once via config_loader (all-or-nothing transaction);
// any failure exits 1 before a single check runs. There is no startup-time
// config-drift sweep — every check module asserts its own config agreement
// inside runCheck (assertConfigAgreement / loadConfig pattern), so drift fails
// fast inside the drifting check's own transaction and aborts the run naming
// the check.
//
// Execution: per session, checks run sequentially, each in its own
// transaction (withTransaction): runCheck → writer.js upsert. Upserts are
// idempotent on (check_name, patient_id, demo_session_id), so a partial run
// is safe to rerun. The first check failure aborts the run with exit 1 after
// naming the check and session. Exit 0 only if all checks on all requested
// sessions complete.

import { pool, withTransaction } from './lib/db.js';
import { loadConfigs } from './lib/config_loader.js';
import { writeCheckResults } from './lib/writer.js';

import * as layer6DenomRiskstrat from './checks/layer6_denom_riskstrat.js';
import * as devicePatientLinkageCgm from './checks/device_patient_linkage_cgm.js';
import * as deviceTemporalDensityCgm14d from './checks/device_temporal_density_cgm_14d.js';
import * as deviceDerivedMetricConsistencyCgm from './checks/device_derived_metric_consistency_cgm.js';
import * as layer1NotnullFieldsA1c from './checks/layer1_notnull_fields_a1c.js';
import * as layer2RangesNumericA1c from './checks/layer2_ranges_numeric_a1c.js';
import * as layer5DateConcordanceA1c from './checks/layer5_date_concordance_a1c.js';
import * as layer1NotnullFieldsSmoking from './checks/layer1_notnull_fields_smoking.js';
import * as layer3MappedValues from './checks/layer3_mapped_values.js';
import * as layer2ValueStandards from './checks/layer2_value_standards.js';
import * as layer5DateConcordance from './checks/layer5_date_concordance.js';

// Fixed registry order — deterministic logging only; results are
// order-independent by design (each check owns its own cohort and rows).
const CHECKS = [
  layer6DenomRiskstrat,
  devicePatientLinkageCgm,
  deviceTemporalDensityCgm14d,
  deviceDerivedMetricConsistencyCgm,
  layer1NotnullFieldsA1c,
  layer2RangesNumericA1c,
  layer5DateConcordanceA1c,
  layer1NotnullFieldsSmoking,
  layer3MappedValues,
  layer2ValueStandards,
  layer5DateConcordance,
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function usage() {
  console.error('Usage: node scoring/index.js --session <A|B|C|all|session-uuid>');
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const flagIndex = args.indexOf('--session');
  if (flagIndex === -1 || !args[flagIndex + 1] || args.length !== 2) {
    usage();
    process.exit(1);
  }
  return args[flagIndex + 1];
}

// Resolve the --session selector against demo_sessions. Letters match
// dataset_state; a UUID must be a known session_id. Returns
// [{ sessionId, label }] in dataset_state order.
async function resolveSessions(selector) {
  const result = await pool.query(
    'SELECT session_id, dataset_state FROM demo_sessions ORDER BY dataset_state',
  );
  const sessions = result.rows.map((r) => ({ sessionId: r.session_id, label: r.dataset_state }));

  if (selector.toLowerCase() === 'all') return sessions;

  if (UUID_RE.test(selector)) {
    const match = sessions.find((s) => s.sessionId === selector.toLowerCase());
    if (!match) {
      throw new Error(`session UUID ${selector} not found in demo_sessions`);
    }
    return [match];
  }

  const match = sessions.find((s) => s.label.toLowerCase() === selector.toLowerCase());
  if (!match) {
    throw new Error(
      `unknown session selector ${JSON.stringify(selector)} — expected A, B, C, all, or a session UUID`,
    );
  }
  return [match];
}

function tally(rows) {
  const counts = { PASS: 0, FAIL: 0, PARTIAL: 0, NOT_APPLICABLE: 0 };
  for (const row of rows) {
    if (!(row.status in counts)) {
      throw new Error(`unexpected check status ${JSON.stringify(row.status)}`);
    }
    counts[row.status] += 1;
  }
  return counts;
}

function summaryLine(counts) {
  const partial = counts.PARTIAL > 0 ? ` PARTIAL=${counts.PARTIAL}` : '';
  return `PASS=${counts.PASS} FAIL=${counts.FAIL}${partial} N_A=${counts.NOT_APPLICABLE}`;
}

async function main() {
  const selector = parseArgs(process.argv);

  console.log('CKM scoring engine — checks stage');
  console.log('Loading condition-module configs…');
  await loadConfigs({ verbose: true }); // throws → caught below, exit 1

  const sessions = await resolveSessions(selector);
  let grandTotal = 0;

  for (const { sessionId, label } of sessions) {
    console.log(`\n=== Session ${label} (${sessionId}) ===`);
    const rollup = [];

    for (const check of CHECKS) {
      let written;
      let counts;
      try {
        ({ written, counts } = await withTransaction(async (client) => {
          const rows = await check.runCheck(client, sessionId);
          const rowCount = await writeCheckResults(client, rows);
          return { written: rowCount, counts: tally(rows) };
        }));
      } catch (err) {
        console.error(
          `\n❌ Check ${check.CHECK_NAME} failed on session ${label} — run aborted (transaction rolled back).`,
        );
        console.error(`   ${err.message}`);
        throw err;
      }
      grandTotal += written;
      console.log(
        `${check.CHECK_NAME.padEnd(38)} | ${label} | rows=${String(written).padStart(2)} | ${summaryLine(counts)}`,
      );
      rollup.push({ check: check.CHECK_NAME, written, counts });
    }

    console.log(`\n--- Session ${label} roll-up ---`);
    console.log(
      `${'check_name'.padEnd(38)} | rows | PASS | FAIL | PARTIAL | N_A`,
    );
    for (const r of rollup) {
      console.log(
        `${r.check.padEnd(38)} | ${String(r.written).padStart(4)} | ${String(r.counts.PASS).padStart(4)} | ${String(r.counts.FAIL).padStart(4)} | ${String(r.counts.PARTIAL).padStart(7)} | ${String(r.counts.NOT_APPLICABLE).padStart(3)}`,
      );
    }
    const sessionTotal = rollup.reduce((sum, r) => sum + r.written, 0);
    console.log(`Session ${label} total rows: ${sessionTotal}`);
  }

  console.log(`\nAll requested sessions complete. Total rows written: ${grandTotal}`);
}

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (err) => {
    if (err?.message) console.error(`\nScoring run failed: ${err.message}`);
    await pool.end().catch(() => {});
    process.exit(1);
  });
