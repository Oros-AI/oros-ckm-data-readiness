#!/usr/bin/env node
/**
 * CKM Data Readiness — Dataset Loader
 * =====================================
 * Loads a complete dataset (A, B, or C) into the ckm_readiness Neon database.
 * Creates a demo session record and loads all 10 tables in FK-safe order.
 * All records are tagged with the session ID for clean demo resets.
 *
 * Usage:
 *   node load_dataset.js --dataset a
 *
 * Requires CKM_DIRECT environment variable (set in .env file):
 *   CKM_DIRECT="postgresql://neondb_owner:PASSWORD@ep-...neon.tech/ckm_readiness?sslmode=require"
 *
 * Load order (respects foreign key constraints):
 *   patients → providers → encounters → conditions → medications →
 *   observations → cgm_readings → cgm_window_metadata → bp_readings → weight_readings
 */

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// =============================================================================
// Configuration
// =============================================================================

const DATA_BASE_PATH = '/Volumes/OrosFast/workspace/data/ckm-readiness/synthetic';

const DATASET_DIR_MAP = {
  A: 'dataset_a_clean',
  B: 'dataset_b_buggy',
  C: 'dataset_c_remediated'
};

const DATASET_SUFFIX_MAP = { A: 'a', B: 'b', C: 'c' };

// Expected row counts from the reconciliation doc — used for verification
const EXPECTED_COUNTS = {
  A: {
    patients: 50, providers: 15, encounters: 490, conditions: 463,
    medications: 604, observations: 1420, cgm_readings: 90462,
    cgm_window_metadata: 25, bp_readings: 328, weight_readings: 70
  },
  B: {
    patients: 50, providers: 15, encounters: 490, conditions: 463,
    medications: 604, observations: 1414, cgm_readings: 78717,
    cgm_window_metadata: 25, bp_readings: 328, weight_readings: 70
  },
  C: {
    patients: 50, providers: 15, encounters: 490, conditions: 463,
    medications: 604, observations: 1414, cgm_readings: 78717,
    cgm_window_metadata: 25, bp_readings: 328, weight_readings: 70
  }
};

// =============================================================================
// Argument parsing
// =============================================================================

const args = process.argv.slice(2);
const datasetIdx = args.indexOf('--dataset');

if (datasetIdx === -1 || !args[datasetIdx + 1]) {
  console.error('\nUsage: node load_dataset.js --dataset [a|b|c]\n');
  process.exit(1);
}

const DATASET = args[datasetIdx + 1].toUpperCase();

if (!['A', 'B', 'C'].includes(DATASET)) {
  console.error(`\nInvalid dataset: "${DATASET}". Must be a, b, or c.\n`);
  process.exit(1);
}

const CONNECTION = process.env.CKM_DIRECT;
if (!CONNECTION) {
  console.error('\nError: CKM_DIRECT environment variable not set.');
  console.error('Add it to your .env file in this directory.\n');
  process.exit(1);
}

const SUFFIX = DATASET_SUFFIX_MAP[DATASET];
const DATASET_DIR = path.join(DATA_BASE_PATH, DATASET_DIR_MAP[DATASET]);

// =============================================================================
// Helper functions
// =============================================================================

// Load and parse a CSV file
function loadCSV(filename) {
  const filepath = path.join(DATASET_DIR, filename);
  if (!fs.existsSync(filepath)) {
    throw new Error(`CSV file not found: ${filepath}`);
  }
  const content = fs.readFileSync(filepath, 'utf-8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true
  });
}

// Convert empty strings and NULL literals to JavaScript null
function n(val) {
  if (val === '' || val === 'NULL' || val === 'null' || val === 'None' || val === undefined) {
    return null;
  }
  return val;
}

// ext: empty-preserving variant of n() for NOT NULL text columns — a
// deliberately empty CSV cell loads as '' (empty string), never NULL
// (n() would turn it into NULL and violate the column's NOT NULL
// constraint; the Add-1 structural-garble seeds carry empty class /
// provider_id by design). Scoped to the encounters rowBuilder only —
// generalization to other tables' NOT NULL columns is a parked item.
function ee(val) {
  const v = n(val);
  return v === null ? '' : v;
}

// Convert string to boolean
function toBool(val) {
  if (val === null || val === undefined || val === '') return null;
  const v = String(val).toLowerCase().trim();
  return v === 'true' || v === '1' || v === 't' || v === 'yes';
}

// Convert to integer, return null if not parseable
function toInt(val) {
  if (n(val) === null) return null;
  const parsed = parseInt(val);
  return isNaN(parsed) ? null : parsed;
}

// Convert to float, return null if not parseable
function toFloat(val) {
  if (n(val) === null) return null;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? null : parsed;
}

// Batch insert with progress reporting
async function loadTable(client, tableName, rows, buildRow, sessionId) {
  if (rows.length === 0) {
    console.log(`  ⚠  ${tableName}: 0 rows (empty CSV)`);
    return 0;
  }

  const BATCH_SIZE = 200;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    for (const row of batch) {
      const { sql, params } = buildRow(row, sessionId);
      await client.query(sql, params);
      inserted++;
    }
    // Progress indicator for large files
    if (rows.length > 1000) {
      const pct = Math.round((Math.min(i + BATCH_SIZE, rows.length) / rows.length) * 100);
      process.stdout.write(`\r  Loading ${tableName}: ${pct}%`);
    }
  }

  if (rows.length > 1000) process.stdout.write('\r');
  console.log(`  ✓  ${tableName}: ${inserted} rows`);
  return inserted;
}

// =============================================================================
// Row builders — one per table
// Maps CSV column names to database column names
// =============================================================================

const rowBuilders = {

  patients: (row, sid) => ({
    sql: `INSERT INTO patients
            (patient_id, organization_id, provider_id, provider_id_type,
             birth_date, postal_code, gender, race_1, ethnicity, language,
             insurance_type_1, education_level, cgm_available, date_of_death,
             demo_session_id, loaded_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())`,
    params: [
      n(row.patient_id), n(row.organization_id), n(row.provider_id),
      n(row.provider_id_type) ?? 'npi',
      n(row.birth_date), n(row.postal_code), n(row.gender),
      n(row.race_1), n(row.ethnicity), n(row.language),
      n(row.insurance_type_1), n(row.education_level),
      toBool(row.cgm_available), n(row.date_of_death), sid
    ]
  }),

  providers: (row, sid) => ({
    sql: `INSERT INTO providers (npi_id, organization_id, provider_type, pos_id, demo_session_id)
          VALUES ($1,$2,$3,$4,$5)`,
    params: [n(row.npi_id), n(row.organization_id), n(row.provider_type), n(row.pos_id), sid]
  }),

  encounters: (row, sid) => ({
    sql: `INSERT INTO encounters
            (encounter_id, patient_id, organization_id, encounter_date, encounter_time,
             class, encounter_reason_code, encounter_reason_code_type,
             provider_id, provider_id_type, status, insurance_types, demo_session_id)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    // ext: NOT NULL text columns (encounter_id, patient_id, organization_id,
    // encounter_date, class, provider_id, provider_id_type, status) use ee()
    // — empty CSV cell loads as '', never NULL. Nullable columns keep n().
    // provider_id_type's old `?? 'npi'` default is subsumed: all CSV rows
    // carry an explicit value (verified 2026-07-11, zero empty cells).
    params: [
      ee(row.encounter_id), ee(row.patient_id), ee(row.organization_id),
      ee(row.encounter_date), n(row.encounter_time), ee(row.class),
      n(row.encounter_reason_code), n(row.encounter_reason_code_type),
      ee(row.provider_id), ee(row.provider_id_type),
      ee(row.status), n(row.insurance_types), sid
    ]
  }),

  conditions: (row, sid) => ({
    sql: `INSERT INTO conditions
            (condition_id, patient_id, organization_id, encounter_id,
             code, code_type, onset_date, date_recorded,
             clinical_status, verification_status, order_num, demo_session_id)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    params: [
      n(row.condition_id), n(row.patient_id), n(row.organization_id), n(row.encounter_id),
      n(row.code), n(row.code_type) ?? 'icd10',
      n(row.onset_date), n(row.date_recorded),
      n(row.clinical_status), n(row.verification_status),
      toInt(row.order_num), sid
    ]
  }),

  medications: (row, sid) => ({
    sql: `INSERT INTO medications
            (medication_id, patient_id, organization_id, encounter_id,
             code, code_type, drug_name, drug_class, drug_sub_class,
             status, date_written, demo_session_id)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    params: [
      n(row.medication_id), n(row.patient_id), n(row.organization_id), n(row.encounter_id),
      n(row.code), n(row.code_type) ?? 'rxnorm',
      n(row.drug_name), n(row.drug_class), n(row.drug_sub_class),
      n(row.status), n(row.date_written), sid
    ]
  }),

  observations: (row, sid) => ({
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
  }),

  cgm_readings: (row, sid) => ({
    sql: `INSERT INTO cgm_readings
            (record_id, patient_id, user_id, system_time, display_time,
             transmitter_id, transmitter_ticks, value, status, trend, trend_rate,
             unit, display_device, transmitter_generation, demo_session_id)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    params: [
      n(row.record_id), n(row.user_id), n(row.user_id),
      n(row.system_time), n(row.display_time), n(row.transmitter_id),
      toInt(row.transmitter_ticks),
      toInt(row.value),
      n(row.status), n(row.trend),
      toFloat(row.trend_rate),
      n(row.unit) ?? 'mg/dL',
      n(row.display_device), n(row.transmitter_generation), sid
    ]
  }),

  cgm_window_metadata: (row, sid) => ({
    sql: `INSERT INTO cgm_window_metadata
            (patient_id, reference_date, analysis_window_start, analysis_window_end,
             window_days, expected_readings, actual_readings, temporal_density, demo_session_id)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    params: [
      n(row.patient_id), n(row.reference_date),
      n(row.analysis_window_start), n(row.analysis_window_end),
      toInt(row.window_days), toInt(row.expected_readings),
      toInt(row.actual_readings), toFloat(row.temporal_density), sid
    ]
  }),

  // CSV columns: systolic_bp → value_primary, diastolic_bp → value_secondary
  bp_readings: (row, sid) => ({
    sql: `INSERT INTO bp_readings
            (record_id, patient_id, device_id, device_type,
             timestamp_utc, timestamp_local, value_primary, value_secondary, unit, demo_session_id)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    params: [
      n(row.record_id), n(row.patient_id), n(row.device_id),
      n(row.device_type) ?? 'bp_cuff',
      n(row.timestamp_utc), n(row.timestamp_local),
      toFloat(row.systolic_bp),   // systolic_bp → value_primary
      toInt(row.diastolic_bp),    // diastolic_bp → value_secondary
      n(row.unit) ?? 'mmHg', sid
    ]
  }),

  // CSV columns: value → value_primary; value_secondary always NULL for weight
  weight_readings: (row, sid) => ({
    sql: `INSERT INTO weight_readings
            (record_id, patient_id, device_id, device_type,
             timestamp_utc, timestamp_local, value_primary, value_secondary, unit, demo_session_id)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    params: [
      n(row.record_id), n(row.patient_id), n(row.device_id),
      n(row.device_type) ?? 'connected_scale',
      n(row.timestamp_utc), n(row.timestamp_local),
      toFloat(row.value),   // value → value_primary
      null,                 // value_secondary always NULL for weight
      n(row.unit) ?? 'kg', sid
    ]
  })
};

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   CKM Data Readiness — Dataset Loader ║');
  console.log('╚══════════════════════════════════════╝\n');
  console.log(`  Dataset:  ${DATASET} (${DATASET_DIR_MAP[DATASET]})`);
  console.log(`  Source:   ${DATASET_DIR}\n`);

  // Verify dataset directory exists
  if (!fs.existsSync(DATASET_DIR)) {
    console.error(`❌ Dataset directory not found: ${DATASET_DIR}`);
    process.exit(1);
  }

  const client = new Client({ connectionString: CONNECTION });

  try {
    await client.connect();
    console.log('  ✓ Connected to Neon (ckm_readiness)\n');

    await client.query('BEGIN');

    // Create demo session
    console.log('  Creating demo session...');
    const sessionResult = await client.query(
      `INSERT INTO demo_sessions (dataset_state, audience_type, created_by, notes, is_active)
       VALUES ($1, 'Admin', 'load_dataset.js', $2, TRUE)
       RETURNING session_id`,
      [DATASET, `Dataset ${DATASET} loaded ${new Date().toISOString()}`]
    );
    const SESSION_ID = sessionResult.rows[0].session_id;
    console.log(`  ✓ Session: ${SESSION_ID}\n`);

    // Load each table in FK-safe order
    const tableOrder = [
      ['patients',            `patients_dataset_${SUFFIX}.csv`],
      ['providers',           `providers_dataset_${SUFFIX}.csv`],
      ['encounters',          `encounters_dataset_${SUFFIX}.csv`],
      ['conditions',          `conditions_dataset_${SUFFIX}.csv`],
      ['medications',         `medications_dataset_${SUFFIX}.csv`],
      ['observations',        `observations_dataset_${SUFFIX}.csv`],
      ['cgm_readings',        `cgm_readings_dataset_${SUFFIX}.csv`],
      ['cgm_window_metadata', `cgm_window_metadata_dataset_${SUFFIX}.csv`],
      ['bp_readings',         `bp_readings_dataset_${SUFFIX}.csv`],
      ['weight_readings',     `weight_readings_dataset_${SUFFIX}.csv`]
    ];

    const counts = {};
    for (const [tableName, csvFile] of tableOrder) {
      const rows = loadCSV(csvFile);
      counts[tableName] = await loadTable(client, tableName, rows, rowBuilders[tableName], SESSION_ID);
    }

    await client.query('COMMIT');

    // Verification against expected counts
    console.log('\n  ── Verification ──────────────────────────────────');
    const expected = EXPECTED_COUNTS[DATASET];
    let allMatch = true;

    for (const [table, count] of Object.entries(counts)) {
      const exp = expected[table];
      const match = count === exp;
      if (!match) allMatch = false;
      const icon = match ? '✓' : '✗';
      const note = match ? '' : ` (expected ${exp})`;
      console.log(`  ${icon}  ${table.padEnd(24)} ${String(count).padStart(6)} rows${note}`);
    }

    console.log('\n  ─────────────────────────────────────────────────');
    if (allMatch) {
      console.log('  ✅ All row counts match. Dataset loaded cleanly.\n');
    } else {
      console.log('  ⚠️  Some counts differ from expected. Review above.\n');
    }

    console.log(`  Session ID: ${SESSION_ID}`);
    console.log(`  To reset:   node reset_session.js --session ${SESSION_ID}\n`);

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\n  ❌ Load failed — transaction rolled back.');
    console.error(`  Error: ${err.message}\n`);
    if (err.detail) console.error(`  Detail: ${err.detail}\n`);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
