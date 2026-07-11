// scoring/lib/pathway_evaluator.js
// Pathway evaluation (7h) — walks each use case's variable_pathways over the
// variable_readiness_scores surface and writes use_case_pathway_results, one
// row per patient per use case per session. Implements the ratified 7h
// design decisions (CLAUDE.md §3, planning thread 2026-07-11):
//
//   D1 — result mapping is generic via pathway_role: the first pathway in
//   evaluation_order satisfying pass_criterion wins; role 'primary' →
//   'primary_pass', role 'fallback' → 'fallback_pass', active_pathway_id =
//   the winning pathway_id. No pathway wins → 'no_valid_pathway',
//   active_pathway_id NULL. Any pathway_role outside {primary, fallback}
//   throws; the derived result must be a member of the config's
//   result_values, else throw.
//
//   D2 — pass_criterion 'all_variables_ready' (the only v0.1 value; anything
//   else throws) is satisfied iff EVERY variable in the pathway has a
//   variable_readiness_scores row for (patient, session) with
//   overall_status = 'READY' exactly. PARTIALLY_READY does not satisfy it.
//
//   D3 — a pathway variable with NO row for that (patient, session) fails
//   the pass_criterion. Missing ≠ error, missing ≠ pass.
//
//   D4 — the row-set per use case per session is the distinct patients
//   holding ≥1 variable_readiness_scores row for any of that use case's
//   pathway variables, derived from the variable_pathways JSONB. No
//   eligibility filtering (7h pre-check §3.6 verified the geometry).
//
// Structural contract: the evaluator consumes overall_status ONLY — the
// SELECT below does not read readiness_score, technical_score, or
// blocking_checks. Config-driven throughout: no use case, variable, or
// pathway name is hardcoded (Core Constraint: adding a condition must not
// require engine code changes).
//
// Transaction ownership: the caller. Both functions receive a pg client
// already inside the caller's transaction (aggregator.js pattern).

const ROLE_RESULT = new Map([
  ['primary', 'primary_pass'],
  ['fallback', 'fallback_pass'],
]);

// Validate one use case's variable_pathways block and return its pathways
// resolved into evaluation_order, each as { pathwayId, role, variables }.
function resolvePathways(useCaseName, variablePathways) {
  if (!variablePathways || typeof variablePathways !== 'object') {
    throw new Error(
      `pathway_evaluator: use case "${useCaseName}" has no variable_pathways block`,
    );
  }
  const { pathways, evaluation_order: evaluationOrder, result_values: resultValues } =
    variablePathways;
  if (!Array.isArray(pathways) || pathways.length === 0) {
    throw new Error(`pathway_evaluator: use case "${useCaseName}" has no pathways`);
  }
  if (!Array.isArray(evaluationOrder) || evaluationOrder.length === 0) {
    throw new Error(`pathway_evaluator: use case "${useCaseName}" has no evaluation_order`);
  }
  if (!Array.isArray(resultValues) || resultValues.length === 0) {
    throw new Error(`pathway_evaluator: use case "${useCaseName}" has no result_values`);
  }

  const byId = new Map(pathways.map((p) => [p.pathway_id, p]));
  return evaluationOrder.map((pathwayId) => {
    const pathway = byId.get(pathwayId);
    if (!pathway) {
      throw new Error(
        `pathway_evaluator: evaluation_order entry "${pathwayId}" of use case ` +
          `"${useCaseName}" resolves to no pathway`,
      );
    }
    if (!ROLE_RESULT.has(pathway.pathway_role)) {
      throw new Error(
        `pathway_evaluator: pathway "${pathwayId}" of use case "${useCaseName}" has ` +
          `pathway_role ${JSON.stringify(pathway.pathway_role)} — expected primary or fallback`,
      );
    }
    // D2: only pass_criterion value in v0.1 — anything else is a config the
    // engine does not know how to evaluate; fail loudly, never guess.
    if (pathway.pass_criterion !== 'all_variables_ready') {
      throw new Error(
        `pathway_evaluator: pathway "${pathwayId}" of use case "${useCaseName}" has ` +
          `pass_criterion ${JSON.stringify(pathway.pass_criterion)} — only ` +
          `"all_variables_ready" is supported in v0.1`,
      );
    }
    if (!Array.isArray(pathway.variables) || pathway.variables.length === 0) {
      throw new Error(
        `pathway_evaluator: pathway "${pathwayId}" of use case "${useCaseName}" has no variables`,
      );
    }
    return {
      pathwayId,
      role: pathway.pathway_role,
      variables: pathway.variables,
    };
  });
}

/**
 * Evaluate pathways into use_case_pathway_results rows for one session,
 * across every loaded use case.
 *
 * @param {import('pg').PoolClient} client - client inside the caller's transaction
 * @param {string} sessionId - demo_session_id
 * @param {Array<{use_case_name: string, variable_pathways: object}>}
 *   useCaseSpecs - use_case_specifications rows (loaded once by the caller)
 * @returns {Promise<Array<object>>} rows keyed by WRITE_FIELDS below
 */
export async function evaluatePathways(client, sessionId, useCaseSpecs) {
  const out = [];

  for (const spec of useCaseSpecs) {
    const orderedPathways = resolvePathways(spec.use_case_name, spec.variable_pathways);
    const resultValues = new Set(spec.variable_pathways.result_values);

    // Union of the use case's pathway variables (D4 row-set basis).
    const allVariables = [...new Set(orderedPathways.flatMap((p) => p.variables))];

    // Structural (D2 analog of the aggregator's Decision 2): overall_status
    // only — readiness_score / technical_score / blocking_checks are
    // deliberately not read.
    const res = await client.query(
      `SELECT patient_id, variable_name, overall_status, organization_id
         FROM variable_readiness_scores
        WHERE demo_session_id = $1 AND variable_name = ANY($2::varchar[])
        ORDER BY patient_id, variable_name`,
      [sessionId, allVariables],
    );

    // Group per patient: variable → overall_status. D4: every patient with
    // ≥1 row is in the row-set; D3 handles variables they lack rows for.
    const byPatient = new Map();
    for (const row of res.rows) {
      if (!byPatient.has(row.patient_id)) {
        byPatient.set(row.patient_id, { statuses: new Map(), orgs: new Set() });
      }
      const entry = byPatient.get(row.patient_id);
      entry.statuses.set(row.variable_name, row.overall_status);
      entry.orgs.add(row.organization_id);
    }

    for (const [patientId, { statuses, orgs }] of byPatient) {
      // organization_id rides along from the variable rows; disagreement
      // means corrupted upstream data — fail loudly (mirrors the
      // aggregator; pre-check §3.7 verified zero conflicts).
      if (orgs.size !== 1) {
        throw new Error(
          `pathway_evaluator: patient ${patientId} has conflicting organization_id values ` +
            `(${[...orgs].join(', ')}) across variables of use case "${spec.use_case_name}"`,
        );
      }

      // D1/D2/D3: walk evaluation_order; first pathway whose EVERY variable
      // has a row with overall_status exactly 'READY' wins. A missing row
      // fails the criterion the same way a non-READY status does.
      let pathwayResult = 'no_valid_pathway';
      let activePathwayId = null;
      for (const pathway of orderedPathways) {
        const satisfied = pathway.variables.every(
          (variableName) => statuses.get(variableName) === 'READY',
        );
        if (satisfied) {
          pathwayResult = ROLE_RESULT.get(pathway.role);
          activePathwayId = pathway.pathwayId;
          break;
        }
      }

      // D1: the derived result must be one the config declared it can emit.
      if (!resultValues.has(pathwayResult)) {
        throw new Error(
          `pathway_evaluator: derived result "${pathwayResult}" for patient ${patientId} ` +
            `is not among result_values of use case "${spec.use_case_name}"`,
        );
      }

      out.push({
        patient_id: patientId,
        use_case_name: spec.use_case_name,
        pathway_result: pathwayResult,
        active_pathway_id: activePathwayId,
        organization_id: [...orgs][0],
        demo_session_id: sessionId,
      });
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Writer — idempotent upsert into use_case_pathway_results. Lives here (not
// in writer.js, which stays check_results-only — aggregator precedent) but
// follows its batched-UNNEST pattern exactly. Arbiter:
// uq_use_case_pathway_results_upsert (V013). evaluated_at has no column
// default — NOW() is supplied explicitly on both insert and update.
// ---------------------------------------------------------------------------

const WRITE_FIELDS = [
  'patient_id',
  'use_case_name',
  'pathway_result',
  'active_pathway_id',
  'organization_id',
  'demo_session_id',
];

const UPSERT_SQL = `
  INSERT INTO use_case_pathway_results (
    pathway_result_id, patient_id, use_case_name, pathway_result,
    active_pathway_id, organization_id, evaluated_at, demo_session_id
  )
  SELECT
    gen_random_uuid(), t.patient_id, t.use_case_name, t.pathway_result,
    t.active_pathway_id, t.organization_id, NOW(), t.demo_session_id
  FROM UNNEST(
    $1::varchar[], $2::varchar[], $3::varchar[],
    $4::varchar[], $5::varchar[], $6::uuid[]
  ) AS t(
    patient_id, use_case_name, pathway_result,
    active_pathway_id, organization_id, demo_session_id
  )
  ON CONFLICT (patient_id, use_case_name, demo_session_id) DO UPDATE SET
    pathway_result    = EXCLUDED.pathway_result,
    active_pathway_id = EXCLUDED.active_pathway_id,
    organization_id   = EXCLUDED.organization_id,
    evaluated_at      = NOW()
`;

/**
 * Upsert pathway-result rows in a single batched statement.
 *
 * @param {import('pg').PoolClient} client - client inside the caller's transaction
 * @param {Array<object>} rows - rows from evaluatePathways()
 * @returns {Promise<number>} count of rows written (inserted or updated)
 */
export async function writePathwayResults(client, rows) {
  if (!Array.isArray(rows)) {
    throw new TypeError('writePathwayResults: rows must be an array');
  }
  if (rows.length === 0) return 0;

  const columns = WRITE_FIELDS.map((field) => rows.map((row) => row[field] ?? null));

  const result = await client.query(UPSERT_SQL, columns);
  return result.rowCount;
}
