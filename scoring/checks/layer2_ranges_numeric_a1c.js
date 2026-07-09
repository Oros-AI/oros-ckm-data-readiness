// scoring/checks/layer2_ranges_numeric_a1c.js
// Layer-2 value-plausibility check for the A1C variable (7f — a1c_fallback pathway).
//
// Answers, per DM-cohort patient: do the patient's A1C values fall within the
// clinically plausible range? Score is the fraction of qualifying observations
// in range (in_range / total); PASS only if every qualifying value is in
// range. Patients with no qualifying A1C observation are NOT_APPLICABLE —
// missingness is layer1's finding (layer1_notnull_fields_a1c), not a
// plausibility failure.
//
// No seeded bug targets A1C: results are expected to be identical across
// datasets A/B/C. Like layer1, this check shapes the a1c_fallback pathway.
//
// Nothing hardcoded (Core Constraint): the plausible range and expected units
// come from the check entry's params ({min_value, max_value, expected_units}),
// the A1C LOINC codes from the variable's code_references.loinc, the diagnosis
// cohort from the diabetes module's condition.value_sets.diagnosis.codes, and
// the anchor from constants.js EVALUATION_DATE (YYYYMMDD string compare; see
// layer6 for the rationale). The cohort predicate is inherited verbatim from
// layer1_notnull_fields_a1c — the two checks must always see the same
// denominator.
//
// Guards (throw loudly, never degrade silently):
// - Unit guard: every qualifying row's value_units must equal
//   params.expected_units. A mismatch means the range bounds don't apply —
//   scoring would be meaningless.
// - Numeric guard: every qualifying value must be a plain decimal. A
//   non-numeric A1C value is a data shape this check cannot score.
//
// Qualifying = code match + effective_date <= anchor (anchored, matching
// layer1's window). No status filter here per the check spec — layer1 owns
// completed-status usability semantics.
//
// Returns CheckResultRow[] shaped for scoring/lib/writer.js writeCheckResults.
// Never writes check_results itself.

import { EVALUATION_DATE } from '../lib/constants.js';

export const CHECK_NAME = 'layer2_ranges_numeric_a1c';
export const VARIABLE_NAME = 'A1C';
export const CHECK_SCOPE = 'ehr';
export const CHECK_LAYER = 'layer2';
export const PRIORITY = 'High';
export const THRESHOLD = 0.98;

const USE_CASE_NAME = 'diabetes_risk_stratification';

// Plain-decimal pattern; must stay in sync with NUMERIC_SQL_PATTERN below.
const NUMERIC_SQL_PATTERN = '^[0-9]+(\\.[0-9]+)?$';

// Translate a config code pattern ("E10.*") to a SQL LIKE prefix ("E10%").
// Same contract as layer1/layer6: any shape other than "<prefix>.*" is a
// config error — fail fast.
function codePatternToLike(pattern) {
  if (typeof pattern !== 'string' || !pattern.endsWith('.*') || pattern.length <= 2) {
    throw new Error(
      `${CHECK_NAME}: unsupported code pattern ${JSON.stringify(pattern)} — expected "<prefix>.*"`,
    );
  }
  return `${pattern.slice(0, -2)}%`;
}

// Const exports give the orchestrator safe registration-time reads; this
// assertion keeps the loaded config as the source of truth — throws on
// priority/threshold drift and on missing/malformed params. The range bounds
// themselves are config-owned (not module constants), per the 7e params
// precedent — the module validates their shape, it does not restate them.
async function loadConfig(client) {
  const result = await client.query(
    `SELECT ucs.variables, cm.config_json
     FROM use_case_specifications ucs
     JOIN condition_modules cm ON cm.condition_id = ucs.condition_id
     WHERE ucs.use_case_name = $1`,
    [USE_CASE_NAME],
  );
  if (result.rows.length === 0) {
    throw new Error(
      `${CHECK_NAME}: no use_case_specifications row for '${USE_CASE_NAME}' — run the config loader first`,
    );
  }

  const { variables, config_json: configJson } = result.rows[0];
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

  const params = entry.params;
  if (params == null || typeof params !== 'object') {
    throw new Error(`${CHECK_NAME}: params block is missing — reload the config`);
  }
  const { min_value: minValue, max_value: maxValue, expected_units: expectedUnits } = params;
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue) || minValue >= maxValue) {
    throw new Error(
      `${CHECK_NAME}: params.min_value/max_value must be finite numbers with min < max — got ${JSON.stringify({ min_value: minValue, max_value: maxValue })}`,
    );
  }
  if (typeof expectedUnits !== 'string' || expectedUnits.length === 0) {
    throw new Error(
      `${CHECK_NAME}: params.expected_units must be a non-empty string — got ${JSON.stringify(expectedUnits)}`,
    );
  }

  const loincCodes = variable.code_references?.loinc;
  if (!Array.isArray(loincCodes) || loincCodes.length === 0) {
    throw new Error(`${CHECK_NAME}: variable '${VARIABLE_NAME}' has no code_references.loinc`);
  }

  const diagnosisCodes = configJson?.condition?.value_sets?.diagnosis?.codes;
  if (!Array.isArray(diagnosisCodes) || diagnosisCodes.length === 0) {
    throw new Error(`${CHECK_NAME}: condition.value_sets.diagnosis.codes missing in loaded config`);
  }

  return {
    minValue,
    maxValue,
    expectedUnits,
    loincCodes,
    diagnosisPatterns: diagnosisCodes.map(codePatternToLike),
  };
}

// Cohort: DISTINCT active-diagnosis patients (predicate inherited verbatim
// from layer1_notnull_fields_a1c); one row each, with per-patient counts of
// qualifying rows, guard violations (non-numeric values, unexpected units),
// in-range values, and the out-of-range rows as evidence. Non-numeric values
// are excluded from the range comparison via CASE (never cast) — they surface
// through the numeric guard instead.
const SQL = `
  WITH cohort AS (
    SELECT DISTINCT c.patient_id
    FROM conditions c
    WHERE c.demo_session_id = $1
      AND c.code LIKE ANY($2::text[])
      AND (c.clinical_status IS NULL OR c.clinical_status = 'active')
  )
  SELECT
    ch.patient_id,
    p.organization_id,
    COUNT(o.*)::int AS qualifying_rows,
    COUNT(o.*) FILTER (WHERE o.value !~ '${NUMERIC_SQL_PATTERN}')::int AS non_numeric_rows,
    COUNT(o.*) FILTER (WHERE o.value_units IS DISTINCT FROM $7::text)::int AS unit_mismatch_rows,
    COUNT(o.*) FILTER (
      WHERE (CASE WHEN o.value ~ '${NUMERIC_SQL_PATTERN}' THEN o.value::numeric END)
            BETWEEN $5::numeric AND $6::numeric
    )::int AS in_range_rows,
    COALESCE(
      jsonb_agg(
        jsonb_build_object('observation_id', o.observation_id, 'value', o.value)
        ORDER BY o.observation_id
      ) FILTER (
        WHERE (CASE WHEN o.value ~ '${NUMERIC_SQL_PATTERN}' THEN o.value::numeric END) < $5::numeric
           OR (CASE WHEN o.value ~ '${NUMERIC_SQL_PATTERN}' THEN o.value::numeric END) > $6::numeric
      ),
      '[]'::jsonb
    ) AS out_of_range
  FROM cohort ch
  JOIN patients p
    ON p.patient_id = ch.patient_id
   AND p.demo_session_id = $1
  LEFT JOIN observations o
    ON o.patient_id = ch.patient_id
   AND o.demo_session_id = $1
   AND o.code = ANY($3::text[])
   AND o.effective_date <= $4
  GROUP BY ch.patient_id, p.organization_id
  ORDER BY ch.patient_id
`;

/**
 * @param {import('pg').PoolClient} client - client inside the caller's transaction
 * @param {string} sessionId - demo_session_id to evaluate
 * @returns {Promise<Array<object>>} CheckResultRow[] — one per DM-cohort patient
 */
export async function runCheck(client, sessionId) {
  const { minValue, maxValue, expectedUnits, loincCodes, diagnosisPatterns } =
    await loadConfig(client);
  const anchor = EVALUATION_DATE.replaceAll('-', '');

  const result = await client.query(SQL, [
    sessionId,
    diagnosisPatterns,
    loincCodes,
    anchor,
    minValue,
    maxValue,
    expectedUnits,
  ]);

  const nonNumeric = result.rows.filter((r) => r.non_numeric_rows > 0);
  if (nonNumeric.length > 0) {
    throw new Error(
      `${CHECK_NAME}: non-numeric A1C value(s) in qualifying rows for session ${sessionId} — patients: ${nonNumeric.map((r) => `${r.patient_id} (${r.non_numeric_rows})`).join(', ')}`,
    );
  }
  const unitMismatch = result.rows.filter((r) => r.unit_mismatch_rows > 0);
  if (unitMismatch.length > 0) {
    throw new Error(
      `${CHECK_NAME}: value_units != '${expectedUnits}' in qualifying rows for session ${sessionId} — patients: ${unitMismatch.map((r) => `${r.patient_id} (${r.unit_mismatch_rows})`).join(', ')}`,
    );
  }

  return result.rows.map((row) => {
    const base = {
      patient_id: row.patient_id,
      organization_id: row.organization_id,
      check_name: CHECK_NAME,
      variable_name: VARIABLE_NAME,
      check_scope: CHECK_SCOPE,
      check_layer: CHECK_LAYER,
      priority: PRIORITY,
      threshold: THRESHOLD,
      window_days: null, // anchored but unwindowed — all history up to the anchor
      demo_session_id: sessionId,
    };

    if (row.qualifying_rows === 0) {
      return {
        ...base,
        status: 'NOT_APPLICABLE',
        score: null,
        observed_value: 'no qualifying A1C observation in window.',
      };
    }

    const evidence = {
      min: minValue,
      max: maxValue,
      units: expectedUnits,
      total: row.qualifying_rows,
      in_range: row.in_range_rows,
    };
    const pass = row.in_range_rows === row.qualifying_rows;
    if (!pass) evidence.out_of_range = row.out_of_range;

    return {
      ...base,
      status: pass ? 'PASS' : 'FAIL',
      score: row.in_range_rows / row.qualifying_rows,
      observed_value: JSON.stringify(evidence),
    };
  });
}
