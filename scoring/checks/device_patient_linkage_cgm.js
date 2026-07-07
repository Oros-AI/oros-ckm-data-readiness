// scoring/checks/device_patient_linkage_cgm.js
// Device identity-linkage check for diabetes_risk_stratification (7e2 — Bug 1).
//
// Answers, per CGM-cohort patient: do any raw cgm_readings rows actually join
// to this patient? Bug 1 seeds device streams whose patient_id is a device
// UUID matching no patients row, so those patients have readings "in the
// system" that the platform cannot attribute to them.
//
// Cohort: patients WHERE cgm_available (25/session) — the check's denominator,
// same convention as device_derived_metric_consistency_cgm's 25-row output.
// Binary per patient: any joinable reading → PASS; zero → FAIL. No
// NOT_APPLICABLE rows.
//
// Linkage is derived LIVE from the join, never from cgm_window_metadata: its
// precomputed densities are healthy (0.84–0.97) for exactly the Bug 1
// patients whose streams are unjoinable — consulting it would mask the bug.
//
// Evidence is per-patient only (joinable reading count, 0 on FAIL). The
// orphan device UUIDs are deliberately NOT referenced: the engine cannot
// attribute an unmatched device stream to a specific patient — building that
// crosswalk IS the remediation (Technology Vendor), not the check's job.
//
// No date logic; nothing anchors to NOW().
//
// Returns CheckResultRow[] shaped for scoring/lib/writer.js writeCheckResults.
// Never writes check_results itself.

export const CHECK_NAME = 'device_patient_linkage_cgm';
export const VARIABLE_NAME = 'CGM Glucose';
export const CHECK_SCOPE = 'device';
export const CHECK_LAYER = null;
export const PRIORITY = 'High';
export const THRESHOLD = 1.0;

const USE_CASE_NAME = 'diabetes_risk_stratification';

// Const exports give the orchestrator safe registration-time reads (layer6
// pattern); this assertion keeps the loaded config as the source of truth —
// if the config entry drifts from the exports, fail fast rather than write
// rows stamped with stale values.
async function assertConfigAgreement(client) {
  const result = await client.query(
    'SELECT variables FROM use_case_specifications WHERE use_case_name = $1',
    [USE_CASE_NAME],
  );
  if (result.rows.length === 0) {
    throw new Error(
      `${CHECK_NAME}: no use_case_specifications row for '${USE_CASE_NAME}' — run the config loader first`,
    );
  }

  const variables = result.rows[0].variables;
  const variable = Array.isArray(variables)
    ? variables.find((v) => v.variable_name === VARIABLE_NAME)
    : null;
  if (!variable) {
    throw new Error(`${CHECK_NAME}: variable '${VARIABLE_NAME}' not found in loaded config`);
  }

  const entry = (variable.checks ?? []).find((c) => c.check_name === CHECK_NAME);
  if (!entry) {
    throw new Error(
      `${CHECK_NAME}: check entry not found under variable '${VARIABLE_NAME}' in loaded config`,
    );
  }

  if (entry.priority !== PRIORITY) {
    throw new Error(
      `${CHECK_NAME}: config priority ${JSON.stringify(entry.priority)} does not match module PRIORITY '${PRIORITY}' — reconcile config and module`,
    );
  }
  if (entry.threshold !== THRESHOLD) {
    throw new Error(
      `${CHECK_NAME}: config threshold ${JSON.stringify(entry.threshold)} does not match module THRESHOLD ${THRESHOLD} — reconcile config and module`,
    );
  }
}

// One row per CGM-cohort patient with the live joinable-reading count.
const LINKAGE_SQL = `
  SELECT
    p.patient_id,
    p.organization_id,
    COUNT(r.record_id)::int AS joinable_count
  FROM patients p
  LEFT JOIN cgm_readings r
    ON r.patient_id = p.patient_id
   AND r.demo_session_id = p.demo_session_id
  WHERE p.cgm_available
    AND p.demo_session_id = $1
  GROUP BY p.patient_id, p.organization_id
  ORDER BY p.patient_id
`;

/**
 * @param {import('pg').PoolClient} client - client inside the caller's transaction
 * @param {string} sessionId - demo_session_id to evaluate
 * @returns {Promise<Array<object>>} CheckResultRow[] — one per CGM-cohort patient
 */
export async function runCheck(client, sessionId) {
  await assertConfigAgreement(client);

  const result = await client.query(LINKAGE_SQL, [sessionId]);

  return result.rows.map((row) => ({
    patient_id: row.patient_id,
    organization_id: row.organization_id,
    check_name: CHECK_NAME,
    variable_name: VARIABLE_NAME,
    check_scope: CHECK_SCOPE,
    check_layer: CHECK_LAYER,
    priority: PRIORITY,
    status: row.joinable_count > 0 ? 'PASS' : 'FAIL',
    score: null, // binary check — no continuous score
    threshold: THRESHOLD,
    observed_value: `joinable_cgm_readings=${row.joinable_count} (expected >0)`,
    window_days: null, // linkage is date-independent
    demo_session_id: sessionId,
  }));
}
