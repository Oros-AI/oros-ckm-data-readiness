// scoring/checks/device_temporal_density_cgm_14d.js
// Device temporal-density check for diabetes_risk_stratification (7e2 — Bug 2).
//
// Answers, per CGM-cohort patient: does the raw device stream cover enough of
// the 14-day analysis window to support weekly stratification? Bug 2 seeds
// thinned streams (~49–57% coverage) for patients whose stored metrics were
// computed on full data.
//
// Density definition — 7e's semantics verbatim (the canonical shared
// definition; see device_derived_metric_consistency_cgm.js):
//   numerator   = COUNT(r.*) of joinable cgm_readings rows in-window — no
//                 value-null or limit-status filter
//   denominator = m.expected_readings from cgm_window_metadata
//   window test = r.system_time::date BETWEEN m.analysis_window_start AND
//                 m.analysis_window_end (inclusive both ends, date-cast)
// The precomputed m.actual_readings column is NEVER consulted for the verdict:
// it is stale for Bug 1 patients (healthy counts for unjoinable streams) —
// live count only.
//
// Cohort: cgm_window_metadata rows joined to patients WHERE cgm_available
// (25/session).
//
// Status mapping (first matching rule wins):
//   joinable_count = 0 → NOT_APPLICABLE
//     (linkage precondition: Bug 1 patients surface on
//      device_patient_linkage_cgm, not here — mirrors 7e's density
//      precondition so each bug lands on its own check)
//   density >= threshold → PASS
//   density <  threshold → FAIL
//
// No root-cause (adherence-vs-transmission) logic lives here — the engine has
// no basis to distinguish them from a window count; responsible_role flows
// from config remediation_defaults untouched.
//
// The analysis window comes entirely from cgm_window_metadata; nothing
// anchors to NOW().
//
// Returns CheckResultRow[] shaped for scoring/lib/writer.js writeCheckResults.
// Never writes check_results itself.

export const CHECK_NAME = 'device_temporal_density_cgm_14d';
export const VARIABLE_NAME = 'CGM Glucose';
export const CHECK_SCOPE = 'device';
export const CHECK_LAYER = null;
export const PRIORITY = 'High';
export const THRESHOLD = 0.70;

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

// One row per CGM-cohort patient with the live in-window reading count.
const DENSITY_SQL = `
  SELECT
    m.patient_id,
    p.organization_id,
    m.window_days,
    m.expected_readings,
    COUNT(r.*)::int AS joinable_count
  FROM cgm_window_metadata m
  JOIN patients p
    ON p.patient_id = m.patient_id
   AND p.demo_session_id = m.demo_session_id
   AND p.cgm_available
  LEFT JOIN cgm_readings r
    ON r.patient_id = m.patient_id
   AND r.demo_session_id = m.demo_session_id
   AND r.system_time::date BETWEEN m.analysis_window_start AND m.analysis_window_end
  WHERE m.demo_session_id = $1
  GROUP BY m.patient_id, p.organization_id, m.window_days, m.expected_readings
  ORDER BY m.patient_id
`;

/**
 * @param {import('pg').PoolClient} client - client inside the caller's transaction
 * @param {string} sessionId - demo_session_id to evaluate
 * @returns {Promise<Array<object>>} CheckResultRow[] — one per CGM-cohort patient
 */
export async function runCheck(client, sessionId) {
  await assertConfigAgreement(client);

  const result = await client.query(DENSITY_SQL, [sessionId]);

  return result.rows.map((row) => {
    let status;
    let score;
    let observedValue;

    if (row.joinable_count === 0) {
      status = 'NOT_APPLICABLE';
      score = null;
      observedValue =
        `no joinable readings — see device_patient_linkage_cgm (0/${row.expected_readings})`;
    } else {
      const density = row.joinable_count / row.expected_readings;
      status = density >= THRESHOLD ? 'PASS' : 'FAIL';
      score = density; // continuous score = window coverage fraction
      observedValue =
        `density=${density.toFixed(4)} (${row.joinable_count}/${row.expected_readings}, ` +
        `floor ${THRESHOLD.toFixed(2)})`;
    }

    return {
      patient_id: row.patient_id,
      organization_id: row.organization_id,
      check_name: CHECK_NAME,
      variable_name: VARIABLE_NAME,
      check_scope: CHECK_SCOPE,
      check_layer: CHECK_LAYER,
      priority: PRIORITY,
      status,
      score,
      threshold: THRESHOLD,
      observed_value: observedValue,
      window_days: row.window_days,
      demo_session_id: sessionId,
    };
  });
}
