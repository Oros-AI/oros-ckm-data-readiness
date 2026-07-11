#!/usr/bin/env node
/**
 * CKM Data Readiness — ext surgical observations append (sessions A and C)
 * ========================================================================
 * Appends the ext-window A1C recency backfill rows to the two EXISTING
 * sessions A and C, sourcing every row from the already-edited canonical
 * CSVs — never from literals in this script. Session B is deliberately
 * untouched: its backfill rides the ext reload.
 *
 * Built on the 7k script's exact pattern (scripts/append_observations_7k.js):
 * CSV-sourced, loader-rowBuilder-derived, fixed session anchors, idempotent,
 * structurally incapable of creating a demo_sessions row.
 *
 * Usage:
 *   node append_observations_ext.js --dry-run   # print built rows, no DB connection
 *   node append_observations_ext.js             # print built rows, then insert
 *
 * Design constraints:
 * - Row selection: EXACTLY the ext backfill observation_ids per dataset
 *   (ext-1 allocation; patient-keyed IDs shared across datasets):
 *     A: OBS001442..OBS001448 (7 rows)
 *     C: OBS001442, OBS001443, OBS001445, OBS001446 (4 rows)
 *   Any CSV yielding a different count aborts before any write.
 * - Rows map through the loader's own observations rowBuilder, reused
 *   VERBATIM from scripts/load_dataset.js lines 239-253 (with its n()
 *   helper, lines 108-113); empty encounter_id → NULL is CORRECT here
 *   (ratified NULL-linkage backfill).
 * - Sessions: hardcoded map to the fixed §6 anchors for A and C only;
 *   verified against demo_sessions.dataset_state before any write. This
 *   script contains no statement that writes the sessions table.
 * - Idempotency: ON CONFLICT (observation_id, demo_session_id) DO NOTHING
 *   (Tier-1 append-only; the tuple is pk_observations). Inserted/skipped
 *   accounting printed per session.
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

// Sessions A and C only — B is untouched by design.
const SESSION_ANCHORS = {
  A: '929ce033-41e7-4516-b70c-240e07257f8d',
  C: '44ce72be-0629-47ba-bde0-dc52c854536d',
};

const DATASET_FILES = {
  A: path.join(DATA_BASE_PATH, 'dataset_a_clean', 'observations_dataset_a.csv'),
  C: path.join(DATA_BASE_PATH, 'dataset_c_remediated', 'observations_dataset_c.csv'),
};

// ext-1 allocation — the only rows this script touches.
const NEW_IDS = {
  A: ['OBS001442', 'OBS001443', 'OBS001444', 'OBS001445', 'OBS001446', 'OBS001447', 'OBS001448'],
  C: ['OBS001442', 'OBS001443', 'OBS001445', 'OBS001446'],
};

// ---------------------------------------------------------------------------
// Reused VERBATIM from scripts/load_dataset.js (not importable — that file
// exports nothing and runs main() at require time):
//   n()                      — load_dataset.js lines 108-113
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

// Idempotency clause appended at execute time (Tier-1 append-only — DO
// NOTHING, never DO UPDATE; the conflict tuple is pk_observations).
const ON_CONFLICT_CLAUSE = '\n        ON CONFLICT (observation_id, demo_session_id) DO NOTHING';

// ---------------------------------------------------------------------------
// CSV row selection
// ---------------------------------------------------------------------------

function loadNewRows(dataset) {
  const filepath = DATASET_FILES[dataset];
  if (!fs.existsSync(filepath)) {
    throw new Error(`CSV file not found: ${filepath}`);
  }
  const wanted = new Set(NEW_IDS[dataset]);
  const rows = parse(fs.readFileSync(filepath, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });
  const selected = rows.filter((r) => wanted.has(r.observation_id));
  if (selected.length !== wanted.size) {
    throw new Error(
      `dataset ${dataset}: expected exactly ${wanted.size} ext rows in ${filepath}, ` +
        `found ${selected.length} — aborting`,
    );
  }
  return selected;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const dryRun = process.argv.includes('--dry-run');

function builtRowsForDataset(dataset) {
  const sid = SESSION_ANCHORS[dataset];
  return loadNewRows(dataset).map((row) => observationsRowBuilder(row, sid));
}

// Print tuple: (session, observation_id, patient_id, encounter_id,
// effective_date, value, value_units) — params indices 0/1/3/5/9/10.
function printBuiltRow(dataset, built) {
  const p = built.params;
  const v = (x) => (x === null ? 'NULL' : x);
  console.log(
    `  [${dataset}] observation_id=${v(p[0])} | patient_id=${v(p[1])} | encounter_id=${v(p[3])} | ` +
      `effective_date=${v(p[5])} | value=${v(p[9])} | value_units=${v(p[10])}`,
  );
}

async function main() {
  console.log('\n=== ext surgical observations append (sessions A and C) ===');
  console.log(`Mode: ${dryRun ? 'DRY-RUN (no DB connection will be opened)' : 'EXECUTE'}\n`);

  const perDataset = {};
  for (const dataset of ['A', 'C']) {
    perDataset[dataset] = builtRowsForDataset(dataset);
  }

  console.log('Built rows (derivation verification — encounter_id must be NULL on all):');
  let total = 0;
  for (const dataset of ['A', 'C']) {
    for (const built of perDataset[dataset]) {
      printBuiltRow(dataset, built);
      total += 1;
    }
  }
  console.log(`Total built rows: ${total}\n`);

  if (dryRun) {
    console.log('DRY-RUN complete. No DB connection opened, no transaction, no writes.');
    return;
  }

  const CONNECTION = process.env.CKM_DIRECT;
  if (!CONNECTION) {
    console.error('\nError: CKM_DIRECT environment variable not set.\n');
    process.exit(1);
  }
  const client = new Client({ connectionString: CONNECTION });

  try {
    await client.connect();
    console.log('  ✓ Connected to Neon (ckm_readiness)');

    // Anchor verification — the fixed sessions must exist with the matching
    // dataset_state. This script never creates or alters session rows.
    for (const dataset of ['A', 'C']) {
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
    console.log('  ✓ Session anchors A and C verified against demo_sessions');

    await client.query('BEGIN');

    for (const dataset of ['A', 'C']) {
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
    console.log('\n  ✅ Append complete (idempotent — re-runs report inserted=0).\n');
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
