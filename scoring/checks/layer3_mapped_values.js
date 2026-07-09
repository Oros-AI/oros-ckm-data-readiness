// scoring/checks/layer3_mapped_values.js
// Layer-3 terminology-mapping check for the Medication Code variable
// (7f — Bug 4, medications / RxNorm; care_coordination module).
//
// Answers, per care-coordination-cohort patient: do the patient's medication
// codes all map to the configured RxNorm vocabulary subset? Score is the
// fraction of medication rows whose code is in params.valid_codes; PASS only
// if every row maps. Patients with zero medication rows are NOT_APPLICABLE —
// unexercised in current data (every cohort patient has meds), but the
// policy is implemented, not assumed.
//
// Bug 4 (Dataset B): three seeded medication rows carry invalid codes —
// 999999 (non-existent but format-clean numeric), INVALID01 (non-numeric),
// 00000 (placeholder). Membership against the configured set catches all
// three; a format-only test would miss two. Fully resolved in Dataset C.
//
// Row scope is ALL medications rows for cohort patients, regardless of
// medications.status — terminology validity is status-independent
// (deliberate: seeded row MED000378 is 'stopped' and must stay in scope).
//
// Nothing hardcoded (Core Constraint): the cohort comes from the module's
// population_definition (code_patterns + status_requirement), the valid-code
// set from the check entry's params.valid_codes (shape-validated, not
// value-matched — the set is config-owned), and the expected code system
// from the variable's code_references.code_system.
//
// Cohort pattern handling (mirrors check 2's guard): a code_patterns entry
// ending in ".*" is a prefix pattern (E10.* -> LIKE 'E10%'); an entry with
// no ".*" is an exact match (I10). ".*" anywhere but the tail throws.
//
// Returns CheckResultRow[] shaped for scoring/lib/writer.js writeCheckResults.
// Never writes check_results itself.

export const CHECK_NAME = 'layer3_mapped_values'; // full name == registry short name here
export const VARIABLE_NAME = 'Medication Code';
export const CHECK_SCOPE = 'ehr';
export const CHECK_LAYER = 'layer3';
export const PRIORITY = 'Medium';
export const THRESHOLD = 1.0;

const USE_CASE_NAME = 'care_coordination';

// Split config code_patterns into LIKE prefixes and exact codes.
// "<prefix>.*" -> prefix LIKE; no ".*" -> exact; ".*" anywhere else -> throw.
function splitCodePatterns(patterns) {
  const likePatterns = [];
  const exactCodes = [];
  for (const entry of patterns) {
    if (typeof entry !== 'string' || entry.length === 0) {
      throw new Error(
        `${CHECK_NAME}: invalid code pattern entry ${JSON.stringify(entry)} in population_definition`,
      );
    }
    const idx = entry.indexOf('.*');
    if (idx === -1) {
      exactCodes.push(entry);
    } else if (idx === entry.length - 2 && entry.length > 2) {
      likePatterns.push(`${entry.slice(0, -2)}%`);
    } else {
      throw new Error(
        `${CHECK_NAME}: unsupported code pattern ${JSON.stringify(entry)} — ".*" is only supported as a tail wildcard ("<prefix>.*")`,
      );
    }
  }
  return { likePatterns, exactCodes };
}

// Const exports give the orchestrator safe registration-time reads; this
// assertion keeps the loaded config as the source of truth — throws on
// priority/threshold drift and on missing/malformed params.valid_codes
// (shape only: non-empty array of non-empty strings; values are config-owned).
async function loadConfig(client) {
  const result = await client.query(
    `SELECT ucs.variables, ucs.population_definition
     FROM use_case_specifications ucs
     WHERE ucs.use_case_name = $1`,
    [USE_CASE_NAME],
  );
  if (result.rows.length === 0) {
    throw new Error(
      `${CHECK_NAME}: no use_case_specifications row for '${USE_CASE_NAME}' — run the config loader first`,
    );
  }

  const { variables, population_definition: populationDefinition } = result.rows[0];
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

  const validCodes = entry.params?.valid_codes;
  if (!Array.isArray(validCodes) || validCodes.length === 0) {
    throw new Error(
      `${CHECK_NAME}: params.valid_codes is missing or empty — reload the config`,
    );
  }
  for (const code of validCodes) {
    if (typeof code !== 'string' || code.length === 0) {
      throw new Error(
        `${CHECK_NAME}: params.valid_codes contains an invalid entry ${JSON.stringify(code)}`,
      );
    }
  }

  const codeSystem = variable.code_references?.code_system;
  if (typeof codeSystem !== 'string' || codeSystem.length === 0) {
    throw new Error(
      `${CHECK_NAME}: variable '${VARIABLE_NAME}' has no code_references.code_system`,
    );
  }

  const criterion = populationDefinition?.eligibility_criteria?.[0];
  const codePatterns = criterion?.code_patterns;
  const statusRequirement = criterion?.status_requirement;
  if (!Array.isArray(codePatterns) || codePatterns.length === 0) {
    throw new Error(
      `${CHECK_NAME}: population_definition.eligibility_criteria[0].code_patterns missing in loaded config`,
    );
  }
  if (typeof statusRequirement !== 'string' || statusRequirement.length === 0) {
    throw new Error(
      `${CHECK_NAME}: population_definition.eligibility_criteria[0].status_requirement missing in loaded config`,
    );
  }

  return {
    validCodes,
    codeSystem,
    statusRequirement,
    ...splitCodePatterns(codePatterns),
  };
}

// Cohort: DISTINCT patients with an eligible diagnosis (pattern-or-exact
// code match, strict status per config status_requirement). One row per
// cohort patient with total/valid medication-row counts, a code_type guard
// counter, and the distinct invalid codes as evidence. Row scope is all
// medications regardless of status (see header).
const SQL = `
  WITH cohort AS (
    SELECT DISTINCT c.patient_id
    FROM conditions c
    WHERE c.demo_session_id = $1
      AND (c.code LIKE ANY($2::text[]) OR c.code = ANY($3::text[]))
      AND c.clinical_status = $4
  )
  SELECT
    ch.patient_id,
    p.organization_id,
    COUNT(m.*)::int AS total_rows,
    COUNT(m.*) FILTER (WHERE m.code = ANY($5::text[]))::int AS valid_rows,
    COUNT(m.*) FILTER (WHERE m.code_type IS DISTINCT FROM $6::text)::int AS codetype_mismatch_rows,
    COALESCE(
      array_agg(DISTINCT m.code) FILTER (WHERE m.code <> ALL($5::text[])),
      '{}'
    ) AS invalid_codes
  FROM cohort ch
  JOIN patients p
    ON p.patient_id = ch.patient_id
   AND p.demo_session_id = $1
  LEFT JOIN medications m
    ON m.patient_id = ch.patient_id
   AND m.demo_session_id = $1
  GROUP BY ch.patient_id, p.organization_id
  ORDER BY ch.patient_id
`;

/**
 * @param {import('pg').PoolClient} client - client inside the caller's transaction
 * @param {string} sessionId - demo_session_id to evaluate
 * @returns {Promise<Array<object>>} CheckResultRow[] — one per cohort patient
 */
export async function runCheck(client, sessionId) {
  const { validCodes, codeSystem, statusRequirement, likePatterns, exactCodes } =
    await loadConfig(client);

  const result = await client.query(SQL, [
    sessionId,
    likePatterns,
    exactCodes,
    statusRequirement,
    validCodes,
    codeSystem,
  ]);

  const codeTypeMismatch = result.rows.filter((r) => r.codetype_mismatch_rows > 0);
  if (codeTypeMismatch.length > 0) {
    throw new Error(
      `${CHECK_NAME}: medications.code_type != '${codeSystem}' in scope for session ${sessionId} — patients: ${codeTypeMismatch.map((r) => `${r.patient_id} (${r.codetype_mismatch_rows})`).join(', ')}`,
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
      window_days: null,
      demo_session_id: sessionId,
    };

    if (row.total_rows === 0) {
      return {
        ...base,
        status: 'NOT_APPLICABLE',
        score: null,
        observed_value: 'no medication rows for patient.',
      };
    }

    const evidence = { total: row.total_rows, valid: row.valid_rows };
    const pass = row.valid_rows === row.total_rows;
    if (!pass) evidence.invalid_codes = row.invalid_codes.join(',');

    return {
      ...base,
      status: pass ? 'PASS' : 'FAIL',
      score: row.valid_rows / row.total_rows,
      observed_value: JSON.stringify(evidence),
    };
  });
}
