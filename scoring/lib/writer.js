// scoring/lib/writer.js
// Idempotent check-result writer — the ONLY module in scoring/ permitted to
// INSERT into check_results. Check modules (scoring/checks/) return
// CheckResultRow[] and never write directly (CLAUDE.md §7).
//
// Upsert contract (CLAUDE.md §7 / §14): one batched
// INSERT ... ON CONFLICT (check_name, patient_id, demo_session_id) DO UPDATE
// per call — the arbiter is uq_check_results_upsert (V012). Never
// DELETE+INSERT (collides with ON DELETE RESTRICT FKs; 2026-06-22 finding).
//
// Transaction ownership: the caller. The writer receives a pg client already
// inside the caller's transaction (same pattern as config_loader.js /
// withTransaction) and never commits, rolls back, or touches the pool.

// Column order here defines the UNNEST parameter order below.
// Matches Data Model §4.1; check_result_id and evaluated_at are supplied by
// the statement itself (gen_random_uuid() / NOW()), not by the caller.
const ROW_FIELDS = [
  'patient_id',
  'organization_id',
  'check_name',
  'variable_name',
  'check_scope',
  'check_layer',
  'priority',
  'status',
  'score',
  'threshold',
  'observed_value',
  'window_days',
  'demo_session_id',
];

const UPSERT_SQL = `
  INSERT INTO check_results (
    check_result_id, patient_id, organization_id, check_name, variable_name,
    check_scope, check_layer, priority, status, score, threshold,
    observed_value, window_days, evaluated_at, demo_session_id
  )
  SELECT
    gen_random_uuid(), t.patient_id, t.organization_id, t.check_name,
    t.variable_name, t.check_scope, t.check_layer, t.priority, t.status,
    t.score, t.threshold, t.observed_value, t.window_days, NOW(),
    t.demo_session_id
  FROM UNNEST(
    $1::varchar[],  $2::varchar[],  $3::varchar[],  $4::varchar[],
    $5::varchar[],  $6::varchar[],  $7::varchar[],  $8::varchar[],
    $9::float8[],   $10::float8[],  $11::text[],    $12::int[],
    $13::uuid[]
  ) AS t(
    patient_id, organization_id, check_name, variable_name, check_scope,
    check_layer, priority, status, score, threshold, observed_value,
    window_days, demo_session_id
  )
  ON CONFLICT (check_name, patient_id, demo_session_id) DO UPDATE SET
    status          = EXCLUDED.status,
    score           = EXCLUDED.score,
    observed_value  = EXCLUDED.observed_value,
    threshold       = EXCLUDED.threshold,
    priority        = EXCLUDED.priority,
    window_days     = EXCLUDED.window_days,
    check_scope     = EXCLUDED.check_scope,
    check_layer     = EXCLUDED.check_layer,
    variable_name   = EXCLUDED.variable_name,
    organization_id = EXCLUDED.organization_id,
    evaluated_at    = NOW()
`;

/**
 * Upsert a batch of check-result rows in a single statement (one DB
 * round-trip). Fully parameterized via UNNEST column arrays — 13 parameters
 * regardless of row count, safe for any characters in observed_value.
 *
 * @param {import('pg').PoolClient} client - client inside the caller's transaction
 * @param {Array<object>} rows - CheckResultRow objects keyed by ROW_FIELDS;
 *   nullable columns (check_layer, score, threshold, observed_value,
 *   window_days) may be null or undefined
 * @returns {Promise<number>} count of rows written (inserted or updated)
 */
export async function writeCheckResults(client, rows) {
  if (!Array.isArray(rows)) {
    throw new TypeError('writeCheckResults: rows must be an array');
  }
  if (rows.length === 0) return 0;

  // Pivot row objects into one array per column (undefined → null).
  const columns = ROW_FIELDS.map((field) => rows.map((row) => row[field] ?? null));

  const result = await client.query(UPSERT_SQL, columns);
  return result.rowCount;
}
