// scoring/checks/device_derived_metric_consistency_cgm.js
// Device derived-metric concordance check for diabetes_risk_stratification (7e — Bug 6).
//
// Recomputes Time-in-Range from raw cgm_readings over the patient's
// cgm_window_metadata analysis window and compares it to the stored
// derived_from_cgm TIR observation. Every clinical parameter (glucose range
// bounds, density floor, LOINC code, tolerance) comes from the check's config
// entry in use_case_specifications — nothing hardcoded (Core Constraint:
// condition-specific logic lives in config).
//
// Population: one row per patient with a stored TIR observation in the
// session (the CGM cohort — 25/session), NOT all patients; non-CGM patients
// have no derived metric to validate.
//
// Status mapping (first matching rule wins):
//   density < params.min_temporal_density → NOT_APPLICABLE
//     (density precondition: a TIR recomputed off a degraded denominator —
//      Bug 1 unjoinable readings, Bug 2 thinned readings — would diverge from
//      the stored value and steal those bugs' findings; derived-metric
//      validity requires density to pass first, so those patients route to
//      their own checks and Bug 6 surfaces only on its seeded patients)
//   |recomputed − stored| ≤ tolerance     → PASS
//   else                                  → FAIL
//
// Date anchor: the analysis window comes entirely from cgm_window_metadata
// (reference_date 2024-11-14). No NOW(); no EVALUATION_DATE needed here.
//
// Returns CheckResultRow[] shaped for scoring/lib/writer.js writeCheckResults.
// Never writes check_results itself.

export const CHECK_NAME = 'device_derived_metric_consistency_cgm';
export const VARIABLE_NAME = 'CGM Glucose';
export const CHECK_SCOPE = 'device';
export const CHECK_LAYER = null;

// PRIORITY and THRESHOLD are config-driven (unlike layer6's literals) — they
// are live bindings populated from the loaded use_case_specifications row the
// first time runCheck loads the check entry. Do not hardcode values here.
export let PRIORITY = null;
export let THRESHOLD = null;

const USE_CASE_NAME = 'diabetes_risk_stratification';

const PARAM_KEYS = [
  'metric',
  'loinc_code',
  'range_low',
  'range_high',
  'inclusive',
  'value_scale',
  'min_temporal_density',
];

// Load this check's entry (threshold, priority, params) from the loaded
// config — same source layer6 reads, located inside the CGM Glucose variable
// of the diabetes_risk_stratification spec. Fails fast on anything missing.
async function loadCheckEntry(client) {
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
  if (typeof entry.threshold !== 'number' || !entry.priority) {
    throw new Error(`${CHECK_NAME}: check entry is missing threshold or priority`);
  }

  const params = entry.params;
  if (!params || typeof params !== 'object') {
    throw new Error(`${CHECK_NAME}: check entry has no params object — reload the config`);
  }
  for (const key of PARAM_KEYS) {
    if (params[key] === undefined || params[key] === null) {
      throw new Error(`${CHECK_NAME}: params is missing required key '${key}'`);
    }
  }
  if (params.value_scale !== 'percent') {
    throw new Error(
      `${CHECK_NAME}: unsupported params.value_scale ${JSON.stringify(params.value_scale)} — only 'percent' is implemented`,
    );
  }

  PRIORITY = entry.priority;
  THRESHOLD = entry.threshold;
  return entry;
}

// One row per patient with a stored TIR observation in the session.
//
// Density is computed LIVE from the joinable raw readings, never from the
// precomputed cgm_window_metadata.actual_readings column: Bug 1 patients'
// readings carry unjoinable UUID patient ids, so their live join count is 0
// even where the metadata column says otherwise. Patients with no metadata
// row or no joinable readings get density 0 via COALESCE.
//
// The stored value is cast defensively (non-numeric → NULL) so a malformed
// value cannot abort the scoring transaction; runCheck fails fast on NULL.
//
// $6 = inclusive flag: in-range test is >= / <= when true, > / < when false —
// both bounds parameterized either way.
const CONCORDANCE_SQL = `
  WITH tir AS (
    SELECT
      o.patient_id,
      o.organization_id,
      CASE WHEN o.value ~ '^[0-9]+(\\.[0-9]+)?$' THEN o.value::numeric END AS stored_value
    FROM observations o
    WHERE o.demo_session_id = $1
      AND o.source = 'derived_from_cgm'
      AND o.interpretation = $2
      AND o.code = $3
  ),
  windowed AS (
    SELECT
      w.patient_id,
      w.window_days,
      w.expected_readings,
      COUNT(r.*)::int AS joined_readings,
      COUNT(r.value)::int AS nonnull_readings,
      COUNT(r.value) FILTER (
        WHERE CASE WHEN $6::boolean
                   THEN r.value >= $4 AND r.value <= $5
                   ELSE r.value >  $4 AND r.value <  $5
              END
      )::int AS in_range_readings
    FROM cgm_window_metadata w
    LEFT JOIN cgm_readings r
      ON r.patient_id = w.patient_id
     AND r.demo_session_id = w.demo_session_id
     AND r.system_time::date BETWEEN w.analysis_window_start AND w.analysis_window_end
    WHERE w.demo_session_id = $1
    GROUP BY w.patient_id, w.window_days, w.expected_readings
  )
  SELECT
    t.patient_id,
    t.organization_id,
    t.stored_value,
    win.window_days,
    win.expected_readings,
    COALESCE(win.joined_readings, 0) AS joined_readings,
    COALESCE(win.nonnull_readings, 0) AS nonnull_readings,
    COALESCE(win.in_range_readings, 0) AS in_range_readings,
    CASE
      WHEN win.expected_readings > 0
      THEN COALESCE(win.joined_readings, 0)::float8 / win.expected_readings
      ELSE 0
    END AS density
  FROM tir t
  LEFT JOIN windowed win ON win.patient_id = t.patient_id
  ORDER BY t.patient_id
`;

/**
 * @param {import('pg').PoolClient} client - client inside the caller's transaction
 * @param {string} sessionId - demo_session_id to evaluate
 * @returns {Promise<Array<object>>} CheckResultRow[] — one per patient with a stored TIR
 */
export async function runCheck(client, sessionId) {
  const entry = await loadCheckEntry(client);
  const { params } = entry;

  const result = await client.query(CONCORDANCE_SQL, [
    sessionId,
    params.metric,
    params.loinc_code,
    params.range_low,
    params.range_high,
    params.inclusive,
  ]);

  // threshold is a fraction (0.02); stored/recomputed values are percent.
  const tolerancePp = entry.threshold * 100;

  return result.rows.map((row) => {
    if (row.stored_value === null) {
      // Population invariant: the patient was selected BY having a TIR row,
      // so a non-numeric stored value is corrupt data — fail fast rather
      // than invent an unspecified status.
      throw new Error(
        `${CHECK_NAME}: non-numeric stored ${params.metric} value for patient ${row.patient_id}`,
      );
    }

    const storedPct = Number(row.stored_value);
    const density = row.density;
    const densityDetail =
      `density=${density.toFixed(4)} (${row.joined_readings}/${row.expected_readings ?? 0})`;

    let status;
    let score;
    let observedValue;

    if (density < params.min_temporal_density) {
      status = 'NOT_APPLICABLE';
      score = null;
      observedValue =
        'insufficient CGM density to validate derived metric; ' +
        `${densityDetail}; stored=${storedPct.toFixed(2)}%`;
    } else {
      const recomputedPct = (100 * row.in_range_readings) / row.nonnull_readings;
      const absDiffPp = Math.abs(recomputedPct - storedPct);
      status = absDiffPp <= tolerancePp ? 'PASS' : 'FAIL';
      // score = absolute difference in threshold units (fraction of full
      // scale), directly comparable to threshold and within the 0–1 CHECK.
      score = absDiffPp / 100;
      observedValue =
        `stored=${storedPct.toFixed(2)}%; recomputed=${recomputedPct.toFixed(2)}%; ` +
        `abs_diff=${absDiffPp.toFixed(2)}pp; ${densityDetail}`;
    }

    return {
      patient_id: row.patient_id,
      organization_id: row.organization_id,
      check_name: CHECK_NAME,
      variable_name: VARIABLE_NAME,
      check_scope: CHECK_SCOPE,
      check_layer: CHECK_LAYER,
      priority: entry.priority,
      status,
      score,
      threshold: entry.threshold,
      observed_value: observedValue,
      window_days: row.window_days,
      demo_session_id: sessionId,
    };
  });
}
