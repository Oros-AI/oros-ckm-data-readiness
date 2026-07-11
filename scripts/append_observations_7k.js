#!/usr/bin/env node
/**
 * CKM Data Readiness — 7k surgical observations append
 * =====================================================
 * Appends the 21 ratified 7k fix rows (20 smoking 72166-2 + 1 PAT000041
 * A1C 4548-4) to the three EXISTING demo sessions, sourcing every row from
 * the already-edited canonical CSVs — never from literals in this script.
 * Ratified by the planning thread 2026-07-11: surgical CSV-sourced append,
 * NOT reset-and-reload; the CLAUDE.md §6 session anchors never move.
 *
 * Usage:
 *   node append_observations_7k.js --dry-run   # print all 63 mapped rows, no DB connection
 *   node append_observations_7k.js --execute   # insert (only on explicit approval)
 *
 * Design constraints (all ratified):
 * - Row selection: EXACTLY the 21 allocated observation_ids
 *   OBS001421..OBS001441 per dataset CSV (7k Phase 1 step 0d allocation).
 *   Any CSV yielding more or fewer than 21 aborts before any write.
 * - Rows map through the loader's own observations rowBuilder, reused
 *   VERBATIM from scripts/load_dataset.js lines 239-253 (with its n()
 *   helper, lines 108-113). It is not importable: load_dataset.js exports
 *   nothing and runs main() at require time.
 * - Sessions: hardcoded map to the three FIXED §6 anchors (choice stated in
 *   the evidence file). Before any write the script verifies each anchor
 *   exists in demo_sessions with the matching dataset_state and aborts on
 *   any mismatch. This script contains NO INSERT INTO demo_sessions — it
 *   is structurally incapable of creating a session row.
 * - Idempotency: ON CONFLICT ON CONSTRAINT pk_observations DO NOTHING
 *   (arbiter = PK (observation_id, demo_session_id), step 0c). Deliberate
 *   deviation from the engine writers' DO UPDATE, planning-thread ratified:
 *   Tier 1 is append-only — a re-run must never modify an existing raw row.
 *   Inserted/skipped accounting printed per session.
 * - --dry-run prints every column of all 63 mapped rows and exits without
 *   opening any DB connection at all (a fortiori, no write transaction).
 */

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// ---------------------------------------------------------------------------
// Fixed configuration
// ---------------------------------------------------------------------------

const DATA_BASE_PATH = '/Volumes/OrosFast/workspace/data/ckm-readiness/synthetic';

// The three fixed session anchors (CLAUDE.md §6). Hardcoded by ratified
// choice; verified against demo_sessions.dataset_state before any write.
const SESSION_ANCHORS = {
  A: '929ce033-41e7-4516-b70c-240e07257f8d',
  B: 'a40afd78-0ded-4481-8a7d-04811f4f28ed',
  C: '44ce72be-0629-47ba-bde0-dc52c854536d',
};

const DATASET_FILES = {
  A: path.join(DATA_BASE_PATH, 'dataset_a_clean', 'observations_dataset_a.csv'),
  B: path.join(DATA_BASE_PATH, 'dataset_b_buggy', 'observations_dataset_b.csv'),
  C: path.join(DATA_BASE_PATH, 'dataset_c_remediated', 'observations_dataset_c.csv'),
};

// Step 0d allocation: OBS001421..OBS001441 — the only rows this script touches.
const NEW_OBSERVATION_IDS = new Set(
  Array.from({ length: 21 }, (_, i) => `OBS${String(1421 + i).padStart(6, '0')}`),
);

// DB column order produced by the observations rowBuilder below.
const DB_COLUMNS = [
  'observation_id', 'patient_id', 'organization_id', 'encounter_id',
  'category', 'effective_date', 'effective_time',
  'code', 'code_type', 'value', 'value_units', 'status', 'source',
  'interpretation', 'demo_session_id',
];

// ---------------------------------------------------------------------------
// Reused VERBATIM from scripts/load_dataset.js (not importable — that file
// exports nothing and runs main() at require time):
//   n()                    — load_dataset.js lines 108-113
//   rowBuilders.observations — load_dataset.js lines 239-253
// ---------------------------------------------------------------------------

// Convert empty strings and NULL literals to JavaScript null
function n(val) {
  if (val === '' || val === 'NULL' || val === 'null' || val === 'None' || val === undefined) {
    return null;
  }
  return val;
}

const observationsRowBuilder = (row, sid) => ({
  sql: `INSERT INTO observations
          (observation_id, patient_id, organization_id, encounter_id,
           category, effective_date, effective_time,
           code, code_type, value, value_units, status, source, interpretation,
           demo_session_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
  params: [
    n(row.observation_id), n(row.patient_id), n(row.organization_id), n(row.encounter_id),
    n(row.category), n(row.effective_date), n(row.effective_time),
    n(row.code), n(row.code_type) ?? 'loinc',
    n(row.value), n(row.value_units), n(row.status),
    n(row.source) ?? 'ehr', n(row.interpretation), sid
  ]
});

// The ONLY change applied to the reused SQL: the idempotency clause below is
// appended at execute time. Tier 1 is append-only, so DO NOTHING (never
// DO UPDATE) — a re-run must not modify an existing raw row.
const ON_CONFLICT_CLAUSE = '\n        ON CONFLICT ON CONSTRAINT pk_observations DO NOTHING';

// ---------------------------------------------------------------------------
// CSV row selection
// ---------------------------------------------------------------------------

function loadNewRows(dataset) {
  const filepath = DATASET_FILES[dataset];
  if (!fs.existsSync(filepath)) {
    throw new Error(`CSV file not found: ${filepath}`);
  }
  const content = fs.readFileSync(filepath, 'utf-8');
  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  const selected = rows.filter((r) => NEW_OBSERVATION_IDS.has(r.observation_id));
  if (selected.length !== NEW_OBSERVATION_IDS.size) {
    throw new Error(
      `dataset ${dataset}: expected exactly ${NEW_OBSERVATION_IDS.size} new rows ` +
        `(OBS001421..OBS001441) in ${filepath}, found ${selected.length} — aborting`,
    );
  }
  return selected;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const execute = args.includes('--execute');

if (dryRun === execute) {
  console.error('\nUsage: node append_observations_7k.js --dry-run | --execute\n');
  process.exit(1);
}

function mappedRowsForDataset(dataset) {
  const sid = SESSION_ANCHORS[dataset];
  return loadNewRows(dataset).map((row) => observationsRowBuilder(row, sid));
}

function printMappedRow(dataset, built) {
  const cells = DB_COLUMNS.map((col, i) => `${col}=${built.params[i] === null ? 'NULL' : built.params[i]}`);
  console.log(`  [${dataset}] ${cells.join(' | ')}`);
}

async function main() {
  console.log('\n=== 7k surgical observations append ===');
  console.log(`Mode: ${dryRun ? 'DRY-RUN (no DB connection will be opened)' : 'EXECUTE'}\n`);

  // Map all rows first — CSV selection errors abort in both modes.
  const perDataset = {};
  for (const dataset of ['A', 'B', 'C']) {
    perDataset[dataset] = mappedRowsForDataset(dataset);
  }

  if (dryRun) {
    let total = 0;
    for (const dataset of ['A', 'B', 'C']) {
      console.log(`--- Dataset ${dataset} → session ${SESSION_ANCHORS[dataset]} (${perDataset[dataset].length} rows) ---`);
      for (const built of perDataset[dataset]) {
        printMappedRow(dataset, built);
        total += 1;
      }
      console.log('');
    }
    console.log(`DRY-RUN complete: ${total} mapped rows printed. No DB connection opened, no transaction, no writes.`);
    return;
  }

  // EXECUTE mode
  const CONNECTION = process.env.CKM_DIRECT;
  if (!CONNECTION) {
    console.error('\nError: CKM_DIRECT environment variable not set.\n');
    process.exit(1);
  }
  const client = new Client({ connectionString: CONNECTION });

  try {
    await client.connect();
    console.log('  ✓ Connected to Neon (ckm_readiness)');

    // Anchor verification — every fixed session must exist with the
    // matching dataset_state. This script never creates session rows.
    for (const dataset of ['A', 'B', 'C']) {
      const res = await client.query(
        'SELECT dataset_state FROM demo_sessions WHERE session_id = $1',
        [SESSION_ANCHORS[dataset]],
      );
      if (res.rows.length !== 1 || res.rows[0].dataset_state !== dataset) {
        throw new Error(
          `session anchor ${SESSION_ANCHORS[dataset]} for dataset ${dataset} not found ` +
            `or dataset_state mismatch (got ${JSON.stringify(res.rows[0]?.dataset_state)}) — aborting`,
        );
      }
    }
    console.log('  ✓ All three session anchors verified against demo_sessions');

    await client.query('BEGIN');

    for (const dataset of ['A', 'B', 'C']) {
      let inserted = 0;
      let skipped = 0;
      for (const built of perDataset[dataset]) {
        const result = await client.query(built.sql + ON_CONFLICT_CLAUSE, built.params);
        if (result.rowCount === 1) inserted += 1;
        else skipped += 1;
      }
      console.log(
        `  Dataset ${dataset} (session ${SESSION_ANCHORS[dataset]}): inserted=${inserted} skipped=${skipped} of ${perDataset[dataset].length}`,
      );
    }

    await client.query('COMMIT');
    console.log('\n  ✅ Append complete (idempotent — safe to re-run; re-runs report skipped=21).\n');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\n  ❌ Append failed — transaction rolled back.');
    console.error(`  Error: ${err.message}\n`);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
