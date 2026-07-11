// scoring/lib/use_case_writer.js
// Use-case readiness (7i) — joins each use case's pathway verdict
// (use_case_pathway_results) to its variable surface
// (variable_readiness_scores) and writes use_case_readiness, one row per
// pathway row per session. Implements the 7i contract (planning thread,
// 2026-07-11):
//
//   Scoring pathway — active_pathway_id when the pathway_result is a pass;
//   the LAST pathway in the config's evaluation_order when
//   no_valid_pathway (the score still reflects remediation progress, per
//   the engine behavior contract step 5). A scoring pathway with zero
//   variable rows for (patient, session) throws naming
//   patient/use case/pathway — a geometry violation is surfaced, never
//   rescued.
//
//   computation PRESENT — fitness_score = pathway_weighted_average over
//   the scoring pathway's variables. v0.1 constraint: a multi-variable
//   scoring pathway throws ("pathway_weighted_average multi-variable not
//   implemented in v0.1"); single-variable degenerates to that variable's
//   readiness_score, written exactly (already exact — no float drift).
//   overall_status from computation.status_label.thresholds, sorted
//   min_score DESC, first band where fitness_score >= min_score. Bands are
//   shape-validated at use (statuses within the canonical three,
//   min_score < max_score, finite) — never value-matched.
//
//   computation IS NULL (boolean/pathway-only modules) — fitness_score =
//   NULL (V014 dropped the NOT NULL for exactly this); overall_status =
//   READY on any pass, NOT_READY on no_valid_pathway.
//
//   required_variables = the scoring pathway's variables in config
//   variables[] order. blocking_variables = the subset whose variable
//   overall_status = 'NOT_READY'; partial_variables = the subset
//   'PARTIALLY_READY'; a required variable with NO variable row counts as
//   blocking (7h D3 mirror). Empty subsets are NULL, never empty arrays.
//
// Structural contract: inputs are use_case_pathway_results and
// variable_readiness_scores (readiness_score + overall_status only) —
// check_results, technical_score, blocking_checks, and thresholds from
// check rows are never read. Config-driven throughout: no use case,
// pathway, variable, band, or weight values hardcoded.
//
// Transaction ownership: the caller. Both functions receive a pg client
// already inside the caller's transaction (aggregator/pathway_evaluator
// pattern).

const CANONICAL_STATUSES = new Set(['READY', 'PARTIALLY_READY', 'NOT_READY']);

// Resolve the use case's variable_pathways into pathwayId → config-ordered
// variable list, plus the evaluation_order itself. Light revalidation only —
// the pathway evaluator already enforced roles/criteria; here we need the
// geometry (ids resolvable, variables non-empty, order non-empty).
function resolvePathwayMap(useCaseName, variablePathways, configVariableOrder) {
  if (!variablePathways || typeof variablePathways !== 'object') {
    throw new Error(`use_case_writer: use case "${useCaseName}" has no variable_pathways block`);
  }
  const { pathways, evaluation_order: evaluationOrder } = variablePathways;
  if (!Array.isArray(pathways) || pathways.length === 0) {
    throw new Error(`use_case_writer: use case "${useCaseName}" has no pathways`);
  }
  if (!Array.isArray(evaluationOrder) || evaluationOrder.length === 0) {
    throw new Error(`use_case_writer: use case "${useCaseName}" has no evaluation_order`);
  }

  const position = new Map(configVariableOrder.map((name, i) => [name, i]));
  const byId = new Map();
  for (const pathway of pathways) {
    if (!Array.isArray(pathway.variables) || pathway.variables.length === 0) {
      throw new Error(
        `use_case_writer: pathway "${pathway.pathway_id}" of use case "${useCaseName}" has no variables`,
      );
    }
    for (const name of pathway.variables) {
      if (!position.has(name)) {
        throw new Error(
          `use_case_writer: pathway "${pathway.pathway_id}" of use case "${useCaseName}" ` +
            `references variable "${name}" absent from the use case's variables[]`,
        );
      }
    }
    // required_variables contract: config variables[] order preserved.
    const ordered = [...pathway.variables].sort((a, b) => position.get(a) - position.get(b));
    byId.set(pathway.pathway_id, ordered);
  }
  for (const pathwayId of evaluationOrder) {
    if (!byId.has(pathwayId)) {
      throw new Error(
        `use_case_writer: evaluation_order entry "${pathwayId}" of use case "${useCaseName}" ` +
          'resolves to no pathway',
      );
    }
  }
  return { byId, evaluationOrder };
}

// Shape-validate the status_label threshold bands at use, then map a score.
// Bands are config-owned; the engine checks their shape (canonical statuses,
// finite bounds, min < max) and never value-matches the numbers.
function bandStatus(score, computation, useCaseName) {
  const bands = computation?.status_label?.thresholds;
  if (!Array.isArray(bands) || bands.length === 0) {
    throw new Error(
      `use_case_writer: use case "${useCaseName}" has a computation block but no ` +
        'status_label.thresholds bands',
    );
  }
  for (const band of bands) {
    if (!CANONICAL_STATUSES.has(band.status)) {
      throw new Error(
        `use_case_writer: use case "${useCaseName}" band status ${JSON.stringify(band.status)} ` +
          'is not a canonical readiness status',
      );
    }
    if (
      typeof band.min_score !== 'number' || !Number.isFinite(band.min_score) ||
      typeof band.max_score !== 'number' || !Number.isFinite(band.max_score) ||
      !(band.min_score < band.max_score)
    ) {
      throw new Error(
        `use_case_writer: use case "${useCaseName}" band "${band.status}" has invalid bounds ` +
          `[${JSON.stringify(band.min_score)}, ${JSON.stringify(band.max_score)}]`,
      );
    }
  }
  const sorted = [...bands].sort((a, b) => b.min_score - a.min_score);
  for (const band of sorted) {
    if (score >= band.min_score) return band.status;
  }
  throw new Error(
    `use_case_writer: score ${score} matches no status_label band of use case "${useCaseName}"`,
  );
}

/**
 * Compute use_case_readiness rows for one session, across every loaded use
 * case — one output row per use_case_pathway_results row.
 *
 * @param {import('pg').PoolClient} client - client inside the caller's transaction
 * @param {string} sessionId - demo_session_id
 * @param {Array<{use_case_name: string, variables: Array<object>, variable_pathways: object, computation: object|null}>}
 *   useCaseSpecs - use_case_specifications rows (loaded once by the caller)
 * @returns {Promise<Array<object>>} rows keyed by WRITE_FIELDS below
 */
export async function computeUseCaseReadiness(client, sessionId, useCaseSpecs) {
  const out = [];

  for (const spec of useCaseSpecs) {
    const configVariableOrder = spec.variables.map((v) => v.variable_name);
    const { byId, evaluationOrder } = resolvePathwayMap(
      spec.use_case_name,
      spec.variable_pathways,
      configVariableOrder,
    );
    const lastPathwayId = evaluationOrder[evaluationOrder.length - 1];
    const allVariables = [...new Set([...byId.values()].flat())];

    const pathwayRows = await client.query(
      `SELECT patient_id, pathway_result, active_pathway_id, organization_id
         FROM use_case_pathway_results
        WHERE demo_session_id = $1 AND use_case_name = $2
        ORDER BY patient_id`,
      [sessionId, spec.use_case_name],
    );

    // Structural: readiness_score + overall_status only — technical_score
    // and blocking_checks are deliberately not read.
    const variableRows = await client.query(
      `SELECT patient_id, variable_name, readiness_score, overall_status
         FROM variable_readiness_scores
        WHERE demo_session_id = $1 AND variable_name = ANY($2::varchar[])
        ORDER BY patient_id, variable_name`,
      [sessionId, allVariables],
    );

    const byPatient = new Map();
    for (const row of variableRows.rows) {
      if (!byPatient.has(row.patient_id)) byPatient.set(row.patient_id, new Map());
      byPatient.get(row.patient_id).set(row.variable_name, row);
    }

    for (const pathwayRow of pathwayRows.rows) {
      const scoringPathwayId =
        pathwayRow.pathway_result !== 'no_valid_pathway'
          ? pathwayRow.active_pathway_id
          : lastPathwayId;
      const requiredVariables = byId.get(scoringPathwayId);
      if (!requiredVariables) {
        throw new Error(
          `use_case_writer: patient ${pathwayRow.patient_id} of use case ` +
            `"${spec.use_case_name}" has unknown scoring pathway "${scoringPathwayId}"`,
        );
      }

      const patientVariables = byPatient.get(pathwayRow.patient_id) ?? new Map();
      const presentRows = requiredVariables
        .map((name) => patientVariables.get(name))
        .filter((row) => row !== undefined);
      if (presentRows.length === 0) {
        throw new Error(
          `use_case_writer: patient ${pathwayRow.patient_id} has zero ` +
            `variable_readiness_scores rows on scoring pathway "${scoringPathwayId}" of use ` +
            `case "${spec.use_case_name}" — geometry violation`,
        );
      }

      let fitnessScore = null;
      let overallStatus;
      if (spec.computation) {
        if (requiredVariables.length > 1) {
          throw new Error(
            `use_case_writer: pathway_weighted_average multi-variable not implemented in ` +
              `v0.1 (scoring pathway "${scoringPathwayId}" of use case ` +
              `"${spec.use_case_name}" has ${requiredVariables.length} variables)`,
          );
        }
        // Single-variable degenerate case: the variable's readiness_score,
        // written exactly (presence guaranteed by the zero-rows throw above).
        fitnessScore = presentRows[0].readiness_score;
        overallStatus = bandStatus(fitnessScore, spec.computation, spec.use_case_name);
      } else {
        overallStatus =
          pathwayRow.pathway_result !== 'no_valid_pathway' ? 'READY' : 'NOT_READY';
      }

      // 7h D3 mirror: a required variable with no row counts as blocking.
      const blocking = requiredVariables.filter((name) => {
        const row = patientVariables.get(name);
        return row === undefined || row.overall_status === 'NOT_READY';
      });
      const partial = requiredVariables.filter(
        (name) => patientVariables.get(name)?.overall_status === 'PARTIALLY_READY',
      );

      out.push({
        patient_id: pathwayRow.patient_id,
        use_case_name: spec.use_case_name,
        overall_status: overallStatus,
        fitness_score: fitnessScore,
        required_variables: requiredVariables,
        blocking_variables: blocking.length > 0 ? blocking : null,
        partial_variables: partial.length > 0 ? partial : null,
        organization_id: pathwayRow.organization_id,
        demo_session_id: sessionId,
      });
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Writer — idempotent upsert into use_case_readiness. Lives here (writer.js
// stays check_results-only) but follows the batched-UNNEST pattern exactly.
// Arbiter: uq_use_case_readiness_upsert (V014). evaluated_at = NOW()
// explicit on both arms. The three TEXT[] columns each travel as one jsonb
// value per row (UNNEST cannot carry rows-of-arrays — 7g B1 precedent),
// unpacked order-preservingly server-side. derived_from_patch_id is NULL for
// engine-written rows (patch derivation is remediation-flow territory).
// ---------------------------------------------------------------------------

const WRITE_FIELDS = [
  'patient_id',
  'use_case_name',
  'overall_status',
  'fitness_score',
  'required_variables',
  'blocking_variables',
  'partial_variables',
  'organization_id',
  'demo_session_id',
];

const ARRAY_FIELDS = new Set(['required_variables', 'blocking_variables', 'partial_variables']);

const UNPACK = (expr) => `
    CASE
      WHEN ${expr} IS NULL THEN NULL
      ELSE (
        SELECT array_agg(e.value ORDER BY e.ordinality)
        FROM jsonb_array_elements_text(${expr}) WITH ORDINALITY AS e
      )
    END`;

const UPSERT_SQL = `
  INSERT INTO use_case_readiness (
    readiness_id, patient_id, use_case_name, overall_status, fitness_score,
    required_variables, blocking_variables, partial_variables,
    organization_id, derived_from_patch_id, evaluated_at, demo_session_id
  )
  SELECT
    gen_random_uuid(), t.patient_id, t.use_case_name, t.overall_status, t.fitness_score,
    ${UNPACK('t.required_variables')},
    ${UNPACK('t.blocking_variables')},
    ${UNPACK('t.partial_variables')},
    t.organization_id, NULL, NOW(), t.demo_session_id
  FROM UNNEST(
    $1::varchar[], $2::varchar[], $3::varchar[], $4::float8[],
    $5::jsonb[], $6::jsonb[], $7::jsonb[],
    $8::varchar[], $9::uuid[]
  ) AS t(
    patient_id, use_case_name, overall_status, fitness_score,
    required_variables, blocking_variables, partial_variables,
    organization_id, demo_session_id
  )
  ON CONFLICT (patient_id, use_case_name, demo_session_id) DO UPDATE SET
    overall_status        = EXCLUDED.overall_status,
    fitness_score         = EXCLUDED.fitness_score,
    required_variables    = EXCLUDED.required_variables,
    blocking_variables    = EXCLUDED.blocking_variables,
    partial_variables     = EXCLUDED.partial_variables,
    organization_id       = EXCLUDED.organization_id,
    derived_from_patch_id = EXCLUDED.derived_from_patch_id,
    evaluated_at          = NOW()
`;

/**
 * Upsert use-case readiness rows in a single batched statement.
 *
 * @param {import('pg').PoolClient} client - client inside the caller's transaction
 * @param {Array<object>} rows - rows from computeUseCaseReadiness()
 * @returns {Promise<number>} count of rows written (inserted or updated)
 */
export async function writeUseCaseReadiness(client, rows) {
  if (!Array.isArray(rows)) {
    throw new TypeError('writeUseCaseReadiness: rows must be an array');
  }
  if (rows.length === 0) return 0;

  const columns = WRITE_FIELDS.map((field) =>
    rows.map((row) => {
      const value = row[field] ?? null;
      return ARRAY_FIELDS.has(field) && value !== null ? JSON.stringify(value) : value;
    }),
  );

  const result = await client.query(UPSERT_SQL, columns);
  return result.rowCount;
}
