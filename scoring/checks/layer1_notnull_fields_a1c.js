// scoring/checks/layer1_notnull_fields_a1c.js
// Layer-1 completeness check for the A1C variable (7f — a1c_fallback pathway).
//
// Answers, per DM-cohort patient: does at least one usable A1C observation
// exist — a completed lab result on or before the evaluation anchor with
// every required field populated? Presence-ever semantics: this layer audits
// that a usable value was ever captured; recency belongs to other layers.
//
// No seeded bug targets A1C: results are expected to be identical across
// datasets A/B/C. The check exists to shape the a1c_fallback pathway (the
// clinical narrative: A1C is often missing or stale, which is why the CGM
// pathway is evaluated first), not to surface a demo bug.
//
// Nothing hardcoded (Core Constraint): A1C LOINC codes come from the
// variable's code_references.loinc, the required-field list from the check
// entry's params.required_fields, the diagnosis cohort from the diabetes
// module's condition.value_sets.diagnosis.codes, and the anchor from
// constants.js EVALUATION_DATE (compared as a YYYYMMDD string — observation
// effective_date is VARCHAR(8), and well-formed YYYYMMDD compares correctly
// lexicographically; see layer6 for the rationale).
//
// Returns CheckResultRow[] shaped for scoring/lib/writer.js writeCheckResults.
// Never writes check_results itself.

import { EVALUATION_DATE } from '../lib/constants.js';

export const CHECK_NAME = 'layer1_notnull_fields_a1c';
export const VARIABLE_NAME = 'A1C';
export const CHECK_SCOPE = 'ehr';
export const CHECK_LAYER = 'layer1';
export const PRIORITY = 'High';
export const THRESHOLD = 1;

const USE_CASE_NAME = 'diabetes_risk_stratification';

// Required-field names are interpolated into SQL as column identifiers, so
// they are validated against this strict pattern (fail fast on anything else)
// — never raw string interpolation of arbitrary config content.
const SAFE_IDENTIFIER = /^[a-z][a-z0-9_]*$/;

// Translate a config code pattern ("E10.*") to a SQL LIKE prefix ("E10%").
// Same contract as layer6: any shape other than "<prefix>.*" is a config
// error — fail fast.
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
// priority/threshold drift and on a missing/empty params.required_fields.
// Returns everything the query needs from config in one round-trip.
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

  const requiredFields = entry.params?.required_fields;
  if (!Array.isArray(requiredFields) || requiredFields.length === 0) {
    throw new Error(
      `${CHECK_NAME}: params.required_fields is missing or empty — reload the config`,
    );
  }
  for (const field of requiredFields) {
    if (typeof field !== 'string' || !SAFE_IDENTIFIER.test(field)) {
      throw new Error(
        `${CHECK_NAME}: params.required_fields contains an invalid column name ${JSON.stringify(field)}`,
      );
    }
  }

  const loincCodes = variable.code_references?.loinc;
  if (!Array.isArray(loincCodes) || loincCodes.length === 0) {
    throw new Error(`${CHECK_NAME}: variable '${VARIABLE_NAME}' has no code_references.loinc`);
  }

  const diagnosisCodes = configJson?.condition?.value_sets?.diagnosis?.codes;
  if (!Array.isArray(diagnosisCodes) || diagnosisCodes.length === 0) {
    throw new Error(`${CHECK_NAME}: condition.value_sets.diagnosis.codes missing in loaded config`);
  }

  return { requiredFields, loincCodes, diagnosisPatterns: diagnosisCodes.map(codePatternToLike) };
}

// Cohort: DISTINCT active-diagnosis patients; one row each, with counts of
// their A1C observations (total) and qualifying rows (completed, on/before
// the anchor, every required field populated). Field names in the qualifying
// predicate are validated identifiers (see SAFE_IDENTIFIER).
function buildSql(requiredFields) {
  const fieldConditions = requiredFields
    .map((f) => `o.${f} IS NOT NULL AND o.${f} <> ''`)
    .join(' AND ');
  const qualifying =
    `o.status = 'completed' AND o.effective_date <= $4 AND ${fieldConditions}`;

  return `
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
      COUNT(o.*) FILTER (WHERE ${qualifying})::int AS qualifying_rows,
      MAX(o.effective_date) FILTER (WHERE ${qualifying}) AS latest_qualifying_date
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
}

/**
 * @param {import('pg').PoolClient} client - client inside the caller's transaction
 * @param {string} sessionId - demo_session_id to evaluate
 * @returns {Promise<Array<object>>} CheckResultRow[] — one per DM-cohort patient
 */
export async function runCheck(client, sessionId) {
  const { requiredFields, loincCodes, diagnosisPatterns } = await loadConfig(client);
  const anchor = EVALUATION_DATE.replaceAll('-', '');

  const result = await client.query(buildSql(requiredFields), [
    sessionId,
    diagnosisPatterns,
    loincCodes,
    anchor,
  ]);

  return result.rows.map((row) => {
    const pass = row.qualifying_rows > 0;
    return {
      patient_id: row.patient_id,
      organization_id: row.organization_id,
      check_name: CHECK_NAME,
      variable_name: VARIABLE_NAME,
      check_scope: CHECK_SCOPE,
      check_layer: CHECK_LAYER,
      priority: PRIORITY,
      status: pass ? 'PASS' : 'FAIL',
      score: null, // binary check — no continuous score
      threshold: THRESHOLD,
      observed_value: pass
        ? `qualifying_a1c_rows=${row.qualifying_rows} (of ${row.total_rows} total; latest ${row.latest_qualifying_date})`
        : `qualifying_a1c_rows=0 (${row.total_rows} total A1C rows)`,
      window_days: null, // presence-ever semantics — no window
      demo_session_id: sessionId,
    };
  });
}
