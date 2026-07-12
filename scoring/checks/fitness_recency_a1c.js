// scoring/checks/fitness_recency_a1c.js
// Fit-for-purpose recency check for the A1C variable (ext Add-2).
//
// Answers, per DM-cohort patient: does at least one A1C observation fall
// inside the variable's configured recency window (lookback from the
// evaluation anchor)? A lab value that exists but is stale cannot carry
// glycemic monitoring — this is the fit-for-purpose gap the a1c_fallback
// pathway narrative rests on (A1C is often missing OR not recent enough,
// which is why the CGM pathway is evaluated first).
//
// Taxonomy: check_scope 'ehr' with check_layer NULL — fit-for-purpose
// recency is not one of the layer1–5 conformance layers (device-check
// precedent for NULL check_layer). Presence stays layer1's finding:
// a patient with ZERO A1C rows is NOT_APPLICABLE here, never FAIL —
// layer1_notnull_fields_a1c already owns that failure.
//
// Nothing hardcoded (Core Constraint): the lookback comes from the A1C
// variable's recency block in the loaded config (shape-asserted, values
// config-owned — never hardcode 6), the LOINC set from
// code_references.loinc, the diagnosis cohort from
// condition.value_sets.diagnosis.codes (predicate inherited verbatim from
// layer1_notnull_fields_a1c), and the anchor from constants.js
// EVALUATION_DATE.
//
// Window semantics: anchor_start = EVALUATION_DATE minus lookback_months
// CALENDAR months, computed once in JS to a YYYYMMDD string; qualifying =
// LOINC match AND anchor_start <= effective_date <= EVALUATION_DATE as a
// lexicographic string comparison, INCLUSIVE both ends. The inclusive
// boundary is load-bearing: PAT000001/PAT000003 sit exactly on the window
// start (effective_date 20240514 for the 6-month lookback from 2024-11-14)
// and must PASS; PAT000050 at 20240509 sits just outside and must FAIL.
//
// Returns CheckResultRow[] shaped for scoring/lib/writer.js writeCheckResults.
// Never writes check_results itself.

import { EVALUATION_DATE } from '../lib/constants.js';

export const CHECK_NAME = 'fitness_recency_a1c';
export const VARIABLE_NAME = 'A1C';
export const CHECK_SCOPE = 'ehr';
export const CHECK_LAYER = null;
export const PRIORITY = 'High';
export const THRESHOLD = 1.0;

const USE_CASE_NAME = 'diabetes_risk_stratification';

// Translate a config code pattern ("E10.*") to a SQL LIKE prefix ("E10%").
// Same contract as layer6/layer1: any shape other than "<prefix>.*" is a
// config error — fail fast.
function codePatternToLike(pattern) {
  if (typeof pattern !== 'string' || !pattern.endsWith('.*') || pattern.length <= 2) {
    throw new Error(
      `${CHECK_NAME}: unsupported code pattern ${JSON.stringify(pattern)} — expected "<prefix>.*"`,
    );
  }
  return `${pattern.slice(0, -2)}%`;
}

// Assert-on-loaded-entry shape (device_derived_metric_consistency_cgm
// precedent): the module loads its config entry anyway, so this takes the
// loaded entry and asserts only — throws on priority/threshold drift.
function assertConfigAgreement(entry) {
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

// Shape-assert the variable's recency block. Values are config-owned; only
// the SHAPE is enforced here — this module supports exactly the
// lookback-from-evaluation-date mode and refuses anything else loudly.
function assertRecencyShape(recency) {
  if (recency == null || typeof recency !== 'object') {
    throw new Error(`${CHECK_NAME}: variable '${VARIABLE_NAME}' has no recency block in loaded config`);
  }
  if (recency.mode !== 'lookback') {
    throw new Error(
      `${CHECK_NAME}: unsupported recency.mode ${JSON.stringify(recency.mode)} — this check implements only 'lookback'`,
    );
  }
  if (recency.reference_anchor !== 'evaluation_date') {
    throw new Error(
      `${CHECK_NAME}: unsupported recency.reference_anchor ${JSON.stringify(recency.reference_anchor)} — this check anchors only to 'evaluation_date'`,
    );
  }
  if (!Number.isInteger(recency.lookback_months) || recency.lookback_months <= 0) {
    throw new Error(
      `${CHECK_NAME}: recency.lookback_months must be a positive integer, got ${JSON.stringify(recency.lookback_months)}`,
    );
  }
}

// anchor_start = evaluation date minus N CALENDAR months, as a YYYYMMDD
// string. Pure integer arithmetic — no Date object, no timezone. If the
// target month is shorter than the anchor day (e.g. the 31st back to a
// 30-day month), the day clamps to the target month's last day; cannot
// arise with the current anchor (day 14) but the arithmetic must be total.
function computeAnchorStart(evaluationDate, lookbackMonths) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(evaluationDate);
  if (!match) {
    throw new Error(`${CHECK_NAME}: EVALUATION_DATE ${JSON.stringify(evaluationDate)} is not YYYY-MM-DD`);
  }
  let year = Number(match[1]);
  let month = Number(match[2]) - lookbackMonths;
  let day = Number(match[3]);
  while (month <= 0) {
    month += 12;
    year -= 1;
  }
  const daysInMonth = [31, (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28,
    31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  if (day > daysInMonth) day = daysInMonth;
  return `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
}

// Loads everything the query needs from config in one round-trip and
// asserts config agreement + recency shape (fail fast, never degrade).
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
  assertConfigAgreement(entry);
  assertRecencyShape(variable.recency);

  const loincCodes = variable.code_references?.loinc;
  if (!Array.isArray(loincCodes) || loincCodes.length === 0) {
    throw new Error(`${CHECK_NAME}: variable '${VARIABLE_NAME}' has no code_references.loinc`);
  }

  const diagnosisCodes = configJson?.condition?.value_sets?.diagnosis?.codes;
  if (!Array.isArray(diagnosisCodes) || diagnosisCodes.length === 0) {
    throw new Error(`${CHECK_NAME}: condition.value_sets.diagnosis.codes missing in loaded config`);
  }

  return {
    loincCodes,
    diagnosisPatterns: diagnosisCodes.map(codePatternToLike),
    lookbackMonths: variable.recency.lookback_months,
  };
}

// Cohort predicate inherited VERBATIM from layer1_notnull_fields_a1c
// (LIKE ANY E10%/E11% + NULL-or-active status). Per patient: total A1C
// rows, in-window rows (string BETWEEN, inclusive both ends), latest
// in-window date, latest date overall (evidence when nothing is in-window).
const RECENCY_SQL = `
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
    COUNT(o.*)::int AS total_rows,
    COUNT(o.*) FILTER (WHERE o.effective_date BETWEEN $4 AND $5)::int AS in_window_rows,
    MAX(o.effective_date) FILTER (WHERE o.effective_date BETWEEN $4 AND $5) AS latest_in_window,
    MAX(o.effective_date) AS latest_overall
  FROM cohort ch
  JOIN patients p
    ON p.patient_id = ch.patient_id
   AND p.demo_session_id = $1
  LEFT JOIN observations o
    ON o.patient_id = ch.patient_id
   AND o.demo_session_id = $1
   AND o.code = ANY($3::text[])
  GROUP BY ch.patient_id, p.organization_id
  ORDER BY ch.patient_id
`;

/**
 * @param {import('pg').PoolClient} client - client inside the caller's transaction
 * @param {string} sessionId - demo_session_id to evaluate
 * @returns {Promise<Array<object>>} CheckResultRow[] — one per DM-cohort patient
 */
export async function runCheck(client, sessionId) {
  const { loincCodes, diagnosisPatterns, lookbackMonths } = await loadConfig(client);
  const anchorEnd = EVALUATION_DATE.replaceAll('-', '');
  const anchorStart = computeAnchorStart(EVALUATION_DATE, lookbackMonths);

  const result = await client.query(RECENCY_SQL, [
    sessionId,
    diagnosisPatterns,
    loincCodes,
    anchorStart,
    anchorEnd,
  ]);

  const window = `window=${anchorStart}..${anchorEnd}`;

  return result.rows.map((row) => {
    let status;
    let observedValue;
    if (row.total_rows === 0) {
      // Zero A1C rows in the session: presence is layer1's finding, not a
      // recency failure — NOT_APPLICABLE, never FAIL.
      status = 'NOT_APPLICABLE';
      observedValue = `${window}; a1c_rows=0 (presence is layer1's finding)`;
    } else if (row.in_window_rows > 0) {
      status = 'PASS';
      observedValue = `${window}; in_window=${row.in_window_rows} of ${row.total_rows}; latest_in_window=${row.latest_in_window}`;
    } else {
      // Rows exist but none in-window (includes only-post-anchor rows).
      status = 'FAIL';
      observedValue = `${window}; in_window=0 of ${row.total_rows}; latest_a1c=${row.latest_overall}`;
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
      score: null, // binary check — no continuous score
      threshold: THRESHOLD,
      observed_value: observedValue,
      window_days: null, // calendar-month lookback — bounds live in observed_value
      demo_session_id: sessionId,
    };
  });
}
