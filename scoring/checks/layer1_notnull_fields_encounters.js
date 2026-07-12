// scoring/checks/layer1_notnull_fields_encounters.js
// Layer-1 structural conformance audit over encounters (ext Add-1 — the
// vbc_reporting "Encounter Record" variable's only check).
//
// Answers, per patient with any encounter in the session: does EVERY
// encounter row carry all required structural fields PRESENT AND NON-EMPTY?
// This extends the 7f presence audit: the operative predicate is
// NULLIF(field, '') IS NOT NULL — an EMPTY STRING counts as missing. That
// is deliberate and load-bearing: the Add-1 garbles load as '' under the
// ext loader rule (empty strings are preserved for NOT NULL encounters
// text columns), never as NULL, so a NULL-only audit would see nothing.
// The predicate handles both anyway (all four current required fields are
// NOT NULL columns; the check must not depend on that).
//
// Window (ext-5b): the cohort AND the audited rows are scoped to the use
// case's reporting window — window_start = EVALUATION_DATE minus the vbc
// population_definition qualifying-encounters lookback_months (read from
// the loaded config, shape-asserted, never hardcoded), string-compared
// INCLUSIVE both ends (fitness_recency_a1c convention). CRITICAL: the
// window is DATE-ONLY — class and the other audited fields never filter
// the audit (a garbled class must not remove a row from the audit; the
// Add-1 seeds live in exactly those fields). Rows with malformed dates
// (Bug 5 territory) sort outside the window lexicographically and drop
// from this audit — date validity is layer5's concern, structural
// presence is this check's. This windowing removes the
// eligibility-vs-readiness conflation that pulled patients with no
// in-window encounters into the vbc row set.
//
// Cohort: every patient with >=1 IN-WINDOW encounter row in the session —
// no diagnosis or class filter; structural feed conformance is
// population-independent. No NOT_APPLICABLE branch: cohort membership
// guarantees >=1 in-window encounter row.
//
// Nothing hardcoded (Core Constraint): the required-field list comes from
// the check entry's params.required_fields, shape-validated against the
// known encounters columns (fields are interpolated into SQL as column
// identifiers — allowlist, never raw config content); the window lookback
// comes from population_definition; the anchor from constants.js
// EVALUATION_DATE. Nothing anchors to NOW().
//
// Returns CheckResultRow[] shaped for scoring/lib/writer.js writeCheckResults.
// Never writes check_results itself.

import { EVALUATION_DATE } from '../lib/constants.js';

export const CHECK_NAME = 'layer1_notnull_fields_encounters';
export const VARIABLE_NAME = 'Encounter Record';
export const CHECK_SCOPE = 'ehr';
export const CHECK_LAYER = 'layer1';
export const PRIORITY = 'High';
export const THRESHOLD = 1.0;

const USE_CASE_NAME = 'vbc_reporting';

// The encounters table's columns (V003 DDL) — params.required_fields is
// validated as a non-empty subset of these before any SQL interpolation.
const KNOWN_ENCOUNTER_COLUMNS = new Set([
  'encounter_id',
  'patient_id',
  'organization_id',
  'encounter_date',
  'encounter_time',
  'class',
  'encounter_reason_code',
  'encounter_reason_code_type',
  'provider_id',
  'provider_id_type',
  'status',
  'insurance_types',
]);

// Assert-on-loaded-entry shape (device_derived_metric_consistency_cgm
// precedent): the module loads its entry anyway for params, so this takes
// the loaded entry and asserts only — throws on priority/threshold drift.
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

// window_start = evaluation date minus N CALENDAR months, as a YYYYMMDD
// string (fitness_recency_a1c convention: pure integer arithmetic, no Date
// object; day clamps to the target month's last day if shorter).
function computeWindowStart(evaluationDate, lookbackMonths) {
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

// Loads the check's config entry and returns the validated required-field
// list plus the reporting-window lookback. Shape validation only — the
// field list and the lookback are config-owned.
async function loadConfig(client) {
  const result = await client.query(
    'SELECT variables, population_definition FROM use_case_specifications WHERE use_case_name = $1',
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
  assertConfigAgreement(entry);

  const requiredFields = entry.params?.required_fields;
  if (!Array.isArray(requiredFields) || requiredFields.length === 0) {
    throw new Error(
      `${CHECK_NAME}: params.required_fields is missing or empty — reload the config`,
    );
  }
  for (const field of requiredFields) {
    if (typeof field !== 'string' || !KNOWN_ENCOUNTER_COLUMNS.has(field)) {
      throw new Error(
        `${CHECK_NAME}: params.required_fields contains ${JSON.stringify(field)} — not a known encounters column`,
      );
    }
  }

  // Reporting window: the vbc qualifying-encounters lookback owns it.
  // Shape-asserted (positive integer); the value is config-owned — never
  // hardcode 24.
  const criteria = result.rows[0].population_definition?.eligibility_criteria;
  const criterion = Array.isArray(criteria)
    ? criteria.find((c) => c.criterion_id === 'qualifying_encounters')
    : null;
  if (!criterion) {
    throw new Error(
      `${CHECK_NAME}: population_definition has no 'qualifying_encounters' eligibility criterion — reload the config`,
    );
  }
  if (!Number.isInteger(criterion.lookback_months) || criterion.lookback_months <= 0) {
    throw new Error(
      `${CHECK_NAME}: qualifying_encounters lookback_months must be a positive integer, got ${JSON.stringify(criterion.lookback_months)}`,
    );
  }

  return { requiredFields, lookbackMonths: criterion.lookback_months };
}

// Per IN-WINDOW encounter row, collect the required fields that are missing
// (NULL or empty string); per patient, count conformant rows and gather
// failing encounter_ids with their missing fields as evidence. Field names
// in the CASE expressions are allowlist-validated identifiers (see
// loadConfig). The window predicate is DATE-ONLY (string BETWEEN, inclusive
// both ends) — audited fields never filter the audit.
function buildSql(requiredFields) {
  const missingCases = requiredFields
    .map((f) => `CASE WHEN NULLIF(e.${f}::text, '') IS NULL THEN '${f}' END`)
    .join(', ');

  return `
    WITH per_encounter AS (
      SELECT
        e.patient_id,
        e.encounter_id,
        concat_ws(',', ${missingCases}) AS missing_fields
      FROM encounters e
      WHERE e.demo_session_id = $1
        AND e.encounter_date BETWEEN $2 AND $3
    )
    SELECT
      pe.patient_id,
      p.organization_id,
      COUNT(*)::int AS total_encounters,
      COUNT(*) FILTER (WHERE pe.missing_fields <> '')::int AS nonconformant_count,
      array_agg(pe.encounter_id || '[' || pe.missing_fields || ']' ORDER BY pe.encounter_id)
        FILTER (WHERE pe.missing_fields <> '') AS failures
    FROM per_encounter pe
    JOIN patients p
      ON p.patient_id = pe.patient_id
     AND p.demo_session_id = $1
    GROUP BY pe.patient_id, p.organization_id
    ORDER BY pe.patient_id
  `;
}

/**
 * @param {import('pg').PoolClient} client - client inside the caller's transaction
 * @param {string} sessionId - demo_session_id to evaluate
 * @returns {Promise<Array<object>>} CheckResultRow[] — one per patient with in-window encounters
 */
export async function runCheck(client, sessionId) {
  const { requiredFields, lookbackMonths } = await loadConfig(client);
  const windowEnd = EVALUATION_DATE.replaceAll('-', '');
  const windowStart = computeWindowStart(EVALUATION_DATE, lookbackMonths);

  const result = await client.query(buildSql(requiredFields), [sessionId, windowStart, windowEnd]);

  return result.rows.map((row) => {
    // Binary strict PASS: every encounter row conformant on all required
    // fields; any nonconformant row fails the patient.
    const pass = row.nonconformant_count === 0;
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
        ? `conformant_encounters=${row.total_encounters}/${row.total_encounters} (${requiredFields.join(',')})`
        : `nonconformant=${row.nonconformant_count}/${row.total_encounters}: ${row.failures.join(', ')}`,
      window_days: null, // structural audit — no window
      demo_session_id: sessionId,
    };
  });
}
