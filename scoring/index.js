// scoring/index.js
// Thin orchestrator for the deterministic scoring engine — checks stage
// (7g A1), aggregation stage (7g B1), pathway evaluation (7h), use-case
// readiness (7i), then work items (7j). Sequences the eleven check modules
// per session, rolls check_results up into variable_readiness_scores via
// lib/aggregator.js, walks the config pathways into
// use_case_pathway_results via lib/pathway_evaluator.js, joins pathway
// verdicts to the variable surface into use_case_readiness via
// lib/use_case_writer.js, then generates one remediation_work_items row
// per FAIL via lib/work_item_generator.js; contains NO scoring logic, NO
// condition logic, NO status mapping.
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
// naming the check and session. After the checks stage, the aggregation
// stage runs in its own transaction per session (aggregateVariables →
// writeVariableScores upsert on (variable_name, patient_id,
// demo_session_id)), then the pathway stage in its own transaction per
// session (evaluatePathways → writePathwayResults upsert on (patient_id,
// use_case_name, demo_session_id)), then the use-case readiness stage in
// its own transaction per session (computeUseCaseReadiness →
// writeUseCaseReadiness upsert on the same tuple, V014 arbiter), then the
// work-items stage in its own transaction per session (generateWorkItems →
// writeWorkItems upsert on (check_result_id), V015 arbiter). Exit 0
// only if all stages on all requested sessions complete.

import { pool, withTransaction } from './lib/db.js';
import { loadConfigs } from './lib/config_loader.js';
import { writeCheckResults } from './lib/writer.js';
import { aggregateVariables, writeVariableScores } from './lib/aggregator.js';
import { evaluatePathways, writePathwayResults } from './lib/pathway_evaluator.js';
import { computeUseCaseReadiness, writeUseCaseReadiness } from './lib/use_case_writer.js';
import {
  buildRemediationLookup,
  generateWorkItems,
  writeWorkItems,
} from './lib/work_item_generator.js';

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

// The aggregator and pathway evaluator are config-driven off the loaded
// use_case_specifications rows (config-of-record, written by config_loader
// at startup); fetched once and shared across sessions. ORDER BY makes the
// per-variable log order deterministic — results are order-independent.
async function loadUseCaseSpecs() {
  const result = await pool.query(
    'SELECT use_case_name, variables, variable_pathways, computation FROM use_case_specifications ORDER BY use_case_name',
  );
  return result.rows;
}

// Per-use-case primary_pass/fallback_pass/no_valid_pathway tally for the
// pathway-stage summary.
function tallyPathways(rows) {
  const byUseCase = new Map();
  for (const row of rows) {
    if (!byUseCase.has(row.use_case_name)) {
      byUseCase.set(row.use_case_name, {
        rows: 0,
        primary_pass: 0,
        fallback_pass: 0,
        no_valid_pathway: 0,
      });
    }
    const t = byUseCase.get(row.use_case_name);
    t.rows += 1;
    t[row.pathway_result] += 1;
  }
  return byUseCase;
}

// Per-use-case READY/PARTIALLY_READY/NOT_READY tally for the use-case
// readiness stage summary.
function tallyUseCases(rows) {
  const byUseCase = new Map();
  for (const row of rows) {
    if (!byUseCase.has(row.use_case_name)) {
      byUseCase.set(row.use_case_name, { rows: 0, READY: 0, PARTIALLY_READY: 0, NOT_READY: 0 });
    }
    const t = byUseCase.get(row.use_case_name);
    t.rows += 1;
    t[row.overall_status] += 1;
  }
  return byUseCase;
}

// The work-item generator's remediation lookup is built from the loaded
// condition-module config snapshots (config-of-record, written by
// config_loader at startup); fetched once and shared across sessions.
async function loadConditionConfigs() {
  const result = await pool.query(
    'SELECT config_json FROM condition_modules ORDER BY condition_id',
  );
  return result.rows;
}

// Per-use-case work-item tally for the work-items stage summary.
function tallyWorkItems(rows) {
  const byUseCase = new Map();
  for (const row of rows) {
    byUseCase.set(row.use_case_name, (byUseCase.get(row.use_case_name) ?? 0) + 1);
  }
  return byUseCase;
}

// Per-variable READY/PARTIALLY_READY/NOT_READY tally for the stage summary.
function tallyVariables(rows) {
  const byVariable = new Map();
  for (const row of rows) {
    if (!byVariable.has(row.variable_name)) {
      byVariable.set(row.variable_name, { rows: 0, READY: 0, PARTIALLY_READY: 0, NOT_READY: 0 });
    }
    const t = byVariable.get(row.variable_name);
    t.rows += 1;
    t[row.overall_status] += 1;
  }
  return byVariable;
}

async function main() {
  const selector = parseArgs(process.argv);

  console.log('CKM scoring engine — checks + aggregation stages');
  console.log('Loading condition-module configs…');
  await loadConfigs({ verbose: true }); // throws → caught below, exit 1

  const useCaseSpecs = await loadUseCaseSpecs();
  const remediationLookup = buildRemediationLookup(await loadConditionConfigs());
  const sessions = await resolveSessions(selector);
  let grandTotal = 0;
  let grandVariableTotal = 0;
  let grandPathwayTotal = 0;
  let grandReadinessTotal = 0;
  let grandWorkItemTotal = 0;

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

    // --- Aggregation stage (7g B1) — own transaction per session ---
    let aggregated;
    try {
      aggregated = await withTransaction(async (client) => {
        const rows = await aggregateVariables(client, sessionId, useCaseSpecs);
        const written = await writeVariableScores(client, rows);
        return { rows, written };
      });
    } catch (err) {
      console.error(
        `\n❌ Aggregation failed on session ${label} — run aborted (transaction rolled back).`,
      );
      console.error(`   ${err.message}`);
      throw err;
    }

    console.log(`\n--- Session ${label} aggregation (variable_readiness_scores) ---`);
    console.log(`${'variable_name'.padEnd(20)} | rows | READY | PARTIALLY_READY | NOT_READY`);
    for (const [variableName, t] of tallyVariables(aggregated.rows)) {
      console.log(
        `${variableName.padEnd(20)} | ${String(t.rows).padStart(4)} | ${String(t.READY).padStart(5)} | ${String(t.PARTIALLY_READY).padStart(15)} | ${String(t.NOT_READY).padStart(9)}`,
      );
    }
    console.log(`Session ${label} variable rows written: ${aggregated.written}`);
    grandVariableTotal += aggregated.written;

    // --- Pathway stage (7h) — own transaction per session ---
    let pathways;
    try {
      pathways = await withTransaction(async (client) => {
        const rows = await evaluatePathways(client, sessionId, useCaseSpecs);
        const written = await writePathwayResults(client, rows);
        return { rows, written };
      });
    } catch (err) {
      console.error(
        `\n❌ Pathway evaluation failed on session ${label} — run aborted (transaction rolled back).`,
      );
      console.error(`   ${err.message}`);
      throw err;
    }

    console.log(`\n--- Session ${label} pathways (use_case_pathway_results) ---`);
    console.log(
      `${'use_case_name'.padEnd(34)} | rows | primary_pass | fallback_pass | no_valid_pathway`,
    );
    for (const [useCaseName, t] of tallyPathways(pathways.rows)) {
      console.log(
        `${useCaseName.padEnd(34)} | ${String(t.rows).padStart(4)} | ${String(t.primary_pass).padStart(12)} | ${String(t.fallback_pass).padStart(13)} | ${String(t.no_valid_pathway).padStart(16)}`,
      );
    }
    console.log(`Session ${label} pathway rows written: ${pathways.written}`);
    grandPathwayTotal += pathways.written;

    // --- Use-case readiness stage (7i) — own transaction per session ---
    let readiness;
    try {
      readiness = await withTransaction(async (client) => {
        const rows = await computeUseCaseReadiness(client, sessionId, useCaseSpecs);
        const written = await writeUseCaseReadiness(client, rows);
        return { rows, written };
      });
    } catch (err) {
      console.error(
        `\n❌ Use-case readiness failed on session ${label} — run aborted (transaction rolled back).`,
      );
      console.error(`   ${err.message}`);
      throw err;
    }

    console.log(`\n--- Session ${label} use-case readiness (use_case_readiness) ---`);
    console.log(
      `${'use_case_name'.padEnd(34)} | rows | READY | PARTIALLY_READY | NOT_READY`,
    );
    for (const [useCaseName, t] of tallyUseCases(readiness.rows)) {
      console.log(
        `${useCaseName.padEnd(34)} | ${String(t.rows).padStart(4)} | ${String(t.READY).padStart(5)} | ${String(t.PARTIALLY_READY).padStart(15)} | ${String(t.NOT_READY).padStart(9)}`,
      );
    }
    console.log(`Session ${label} readiness rows written: ${readiness.written}`);
    grandReadinessTotal += readiness.written;

    // --- Work-items stage (7j) — own transaction per session ---
    let workItems;
    try {
      workItems = await withTransaction(async (client) => {
        const rows = await generateWorkItems(client, sessionId, remediationLookup);
        const written = await writeWorkItems(client, rows);
        return { rows, written };
      });
    } catch (err) {
      console.error(
        `\n❌ Work-item generation failed on session ${label} — run aborted (transaction rolled back).`,
      );
      console.error(`   ${err.message}`);
      throw err;
    }

    console.log(`\n--- Session ${label} work items (remediation_work_items) ---`);
    console.log(`${'use_case_name'.padEnd(34)} | items`);
    for (const [useCaseName, count] of tallyWorkItems(workItems.rows)) {
      console.log(`${useCaseName.padEnd(34)} | ${String(count).padStart(5)}`);
    }
    console.log(`Session ${label} work items written: ${workItems.written}`);
    grandWorkItemTotal += workItems.written;
  }

  console.log(
    `\nAll requested sessions complete. Total check rows written: ${grandTotal}; ` +
      `total variable rows written: ${grandVariableTotal}; ` +
      `total pathway rows written: ${grandPathwayTotal}; ` +
      `total readiness rows written: ${grandReadinessTotal}; ` +
      `total work items written: ${grandWorkItemTotal}`,
  );
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
