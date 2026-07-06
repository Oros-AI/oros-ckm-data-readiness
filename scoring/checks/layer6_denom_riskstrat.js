// scoring/checks/layer6_denom_riskstrat.js
// Eligibility / denominator check for diabetes_risk_stratification (7d).
// First check module — establishes the shape the others mirror (CLAUDE.md §7).
//
// Evaluates every patient in the session against the three eligibility
// criteria loaded from use_case_specifications.population_definition (never
// hardcoded — Core Constraint: condition-specific logic lives in config):
//   1. active_dm_diagnosis    — active ICD-10 E10.*/E11.* diagnosis
//   2. qualifying_encounters  — ≥ minimum_count encounters of a qualifying
//                               class within lookback_months of EVALUATION_DATE
//   3. active_enrollment      — see the criterion-3 comment in the query below
//
// Status mapping (engine behavior contract, CLAUDE.md §8):
//   criterion 1 unmet             → NOT_APPLICABLE (not a diabetes patient)
//   criterion 1 met, 2 or 3 unmet → FAIL           (genuine eligibility gap)
//   all three met                 → PASS
//
// Returns CheckResultRow[] (one per patient) shaped for
// scoring/lib/writer.js writeCheckResults. Never writes check_results itself.

import { EVALUATION_DATE } from '../lib/constants.js';

export const CHECK_NAME = 'layer6_denom_riskstrat';
export const VARIABLE_NAME = 'Eligibility';
export const CHECK_SCOPE = 'use_case';
export const CHECK_LAYER = null;
export const PRIORITY = 'High';
export const THRESHOLD = 1.0;

const USE_CASE_NAME = 'diabetes_risk_stratification';

// check_results.window_days — the 24-month encounter lookback expressed in
// days (matches the Technical Specification's registry entry for this check).
const WINDOW_DAYS = 730;

// Translate a config code_pattern ("E10.*") to a SQL LIKE prefix ("E10%").
// The dotted codes in the data (E10.9, E11.40, …) all match the bare prefix;
// any pattern shape other than "<prefix>.*" is a config error — fail fast.
function codePatternToLike(pattern) {
  if (typeof pattern !== 'string' || !pattern.endsWith('.*') || pattern.length <= 2) {
    throw new Error(
      `${CHECK_NAME}: unsupported code_pattern ${JSON.stringify(pattern)} — expected "<prefix>.*"`,
    );
  }
  return `${pattern.slice(0, -2)}%`;
}

// YYYYMMDD string N months before an ISO date (YYYY-MM-DD). encounter_date is
// VARCHAR(8) YYYYMMDD, which compares correctly as a string, so the window is
// evaluated lexicographically — no to_date() on data (see query comment).
function monthsBeforeCompact(isoDate, months) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1 - months, d));
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function requireKeys(criterion, criterionId, keys) {
  for (const key of keys) {
    if (criterion[key] === undefined || criterion[key] === null) {
      throw new Error(
        `${CHECK_NAME}: eligibility criterion '${criterionId}' is missing required key '${key}'`,
      );
    }
  }
  return criterion;
}

// Load the three eligibility criteria from the loaded config. Fails fast with
// a clear error if the spec row or any expected criterion/key is missing.
async function loadEligibilityCriteria(client) {
  const result = await client.query(
    'SELECT population_definition FROM use_case_specifications WHERE use_case_name = $1',
    [USE_CASE_NAME],
  );
  if (result.rows.length === 0) {
    throw new Error(
      `${CHECK_NAME}: no use_case_specifications row for '${USE_CASE_NAME}' — run the config loader first`,
    );
  }

  const criteria = result.rows[0].population_definition?.eligibility_criteria;
  if (!Array.isArray(criteria)) {
    throw new Error(
      `${CHECK_NAME}: population_definition.eligibility_criteria missing or not an array for '${USE_CASE_NAME}'`,
    );
  }

  const byId = (id) => {
    const criterion = criteria.find((c) => c.criterion_id === id);
    if (!criterion) {
      throw new Error(`${CHECK_NAME}: eligibility criterion '${id}' not found in config`);
    }
    return criterion;
  };

  return {
    dmDiagnosis: requireKeys(byId('active_dm_diagnosis'), 'active_dm_diagnosis', [
      'code_patterns',
      'status_requirement',
    ]),
    qualifyingEncounters: requireKeys(byId('qualifying_encounters'), 'qualifying_encounters', [
      'minimum_count',
      'lookback_months',
      'qualifying_classes',
    ]),
    activeEnrollment: requireKeys(byId('active_enrollment'), 'active_enrollment', [
      'requires_active_organization',
    ]),
  };
}

// One row per patient in the session, criterion booleans computed in SQL.
//
// Criterion 2 date handling: encounter_date is VARCHAR(8). The ~ '^\d{8}$'
// guard is REQUIRED — Bug 5 (Dataset B) seeds malformed dates, and an
// unguarded to_date() would throw and abort the whole scoring transaction.
// Well-formed YYYYMMDD strings compare correctly lexicographically, so the
// window test uses plain string comparison instead of to_date() — this also
// survives digit-valid-but-calendar-invalid values (e.g. '20241340'), which
// would pass the regex yet still make to_date() throw. Malformed-date rows
// simply don't count as qualifying.
const ELIGIBILITY_SQL = `
  SELECT
    p.patient_id,
    p.organization_id,
    EXISTS (
      SELECT 1
      FROM conditions c
      WHERE c.patient_id = p.patient_id
        AND c.demo_session_id = p.demo_session_id
        AND c.code_type = 'icd10'
        AND c.clinical_status = $2
        AND c.code LIKE ANY($3::text[])
    ) AS has_dm_diagnosis,
    (
      SELECT COUNT(*)
      FROM encounters e
      WHERE e.patient_id = p.patient_id
        AND e.demo_session_id = p.demo_session_id
        AND e.class = ANY($4::text[])
        AND e.encounter_date ~ '^\\d{8}$'
        AND e.encounter_date >= $5
        AND e.encounter_date <= $6
    )::int AS qualifying_encounter_count,
    -- Criterion 3 (active_enrollment): the config's requires_active_organization
    -- can't be evaluated against org status — the POC schema has no
    -- organizations table or org-status flag (patients.organization_id is
    -- NOT NULL with no FK). The only data-supported reading is patient-level:
    -- organization_id present (trivially true) AND not deceased. Production
    -- with real enrollment data would evaluate actual org-participation status.
    (p.date_of_death IS NULL) AS active_enrollment
  FROM patients p
  WHERE p.demo_session_id = $1
  ORDER BY p.patient_id
`;

/**
 * @param {import('pg').PoolClient} client - client inside the caller's transaction
 * @param {string} sessionId - demo_session_id to evaluate
 * @returns {Promise<Array<object>>} CheckResultRow[] — one per patient
 */
export async function runCheck(client, sessionId) {
  const { dmDiagnosis, qualifyingEncounters, activeEnrollment } =
    await loadEligibilityCriteria(client);

  // requires_active_organization is read for fail-fast config validation; its
  // evaluation is the patient-level reading documented in the SQL above.
  void activeEnrollment.requires_active_organization;

  const likePatterns = dmDiagnosis.code_patterns.map(codePatternToLike);
  const windowStart = monthsBeforeCompact(EVALUATION_DATE, qualifyingEncounters.lookback_months);
  const windowEnd = EVALUATION_DATE.replaceAll('-', '');

  const result = await client.query(ELIGIBILITY_SQL, [
    sessionId,
    dmDiagnosis.status_requirement,
    likePatterns,
    qualifyingEncounters.qualifying_classes,
    windowStart,
    windowEnd,
  ]);

  return result.rows.map((row) => {
    const hasDm = row.has_dm_diagnosis;
    const encounterCount = row.qualifying_encounter_count;
    const encountersMet = encounterCount >= qualifyingEncounters.minimum_count;
    const enrolled = row.active_enrollment;

    let status;
    if (!hasDm) {
      status = 'NOT_APPLICABLE';
    } else if (encountersMet && enrolled) {
      status = 'PASS';
    } else {
      status = 'FAIL';
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
      observed_value:
        `dm_diagnosis=${hasDm}; ` +
        `qualifying_encounters=${encounterCount}/${qualifyingEncounters.minimum_count}; ` +
        `active_enrollment=${enrolled}`,
      window_days: WINDOW_DAYS,
      demo_session_id: sessionId,
    };
  });
}
