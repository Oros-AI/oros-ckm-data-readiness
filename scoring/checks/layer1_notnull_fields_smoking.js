// scoring/checks/layer1_notnull_fields_smoking.js
// Layer-1 completeness check for the Smoking Status variable (7f — Bug 3).
//
// Answers, per HTN-cohort patient: does at least one usable smoking-status
// observation exist — a completed social-history entry on or before the
// evaluation anchor with every required field populated? Presence-ever
// semantics: this layer audits that a usable value was ever captured;
// recency belongs to other layers.
//
// Bug 3 (Dataset B): smoking-status observations are missing for a slice of
// the hypertension cohort — never captured at the point of care, so the
// remediation routes to the Primary Care Site (the platform cannot populate
// clinical data that was never collected). Unresolved in Dataset C by design.
//
// Nothing hardcoded (Core Constraint): the smoking LOINC codes come from the
// variable's code_references.loinc, the required-field list from the check
// entry's params.required_fields, the diagnosis cohort from the hypertension
// module's condition.value_sets.diagnosis.codes, and the anchor from
// constants.js EVALUATION_DATE (compared as a YYYYMMDD string — observation
// effective_date is VARCHAR(8), and well-formed YYYYMMDD compares correctly
// lexicographically; see layer6 for the rationale).
//
// Cohort matching differs from the a1c twin in two approved ways:
// - Exact-code match (c.code = ANY(...)): the hypertension value set is
//   exact ICD-10 codes ("I10"), not "<prefix>.*" patterns. Any code that
//   contains ".*" is a config error here — throw rather than silently
//   exact-matching a pattern string.
// - Strict clinical_status = 'active' (no NULL admission), per the module
//   spec and the stub's population_definition status_requirement.
//
// Returns CheckResultRow[] shaped for scoring/lib/writer.js writeCheckResults.
// Never writes check_results itself.

import { EVALUATION_DATE } from '../lib/constants.js';

export const CHECK_NAME = 'layer1_notnull_fields_smoking';
export const VARIABLE_NAME = 'Smoking Status';
export const CHECK_SCOPE = 'ehr';
export const CHECK_LAYER = 'layer1';
export const PRIORITY = 'Medium';
export const THRESHOLD = 1;

const USE_CASE_NAME = 'hypertension_risk_stratification';

// Required-field names are interpolated into SQL as column identifiers, so
// they are validated against this strict pattern (fail fast on anything else)
// — never raw string interpolation of arbitrary config content.
const SAFE_IDENTIFIER = /^[a-z][a-z0-9_]*$/;

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
  // Exact-match contract: this check matches diagnosis codes literally. A
  // "<prefix>.*" pattern here would silently match nothing — refuse it.
  for (const code of diagnosisCodes) {
    if (typeof code !== 'string' || code.includes('.*')) {
      throw new Error(
        `${CHECK_NAME}: condition.value_sets.diagnosis.codes in the hypertension config contains ${JSON.stringify(code)} — this check exact-matches codes and does not support ".*" patterns`,
      );
    }
  }

  return { requiredFields, loincCodes, diagnosisCodes };
}

// Cohort: DISTINCT active-diagnosis patients; one row each, with counts of
// their smoking-status observations (total) and qualifying rows (completed,
// on/before the anchor, every required field populated). Field names in the
// qualifying predicate are validated identifiers (see SAFE_IDENTIFIER).
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
        AND c.code = ANY($2::text[])
        AND c.clinical_status = 'active'
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
 * @returns {Promise<Array<object>>} CheckResultRow[] — one per HTN-cohort patient
 */
export async function runCheck(client, sessionId) {
  const { requiredFields, loincCodes, diagnosisCodes } = await loadConfig(client);
  const anchor = EVALUATION_DATE.replaceAll('-', '');

  const result = await client.query(buildSql(requiredFields), [
    sessionId,
    diagnosisCodes,
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
      score: null, // binary check — no continuous score (approved deviation from the spec's score-0/1 language)
      threshold: THRESHOLD,
      observed_value: pass
        ? `qualifying_smoking_rows=${row.qualifying_rows} (of ${row.total_rows} total; latest ${row.latest_qualifying_date})`
        : `qualifying_smoking_rows=0 (${row.total_rows} total smoking rows)`,
      window_days: null, // presence-ever semantics — no window
      demo_session_id: sessionId,
    };
  });
}
