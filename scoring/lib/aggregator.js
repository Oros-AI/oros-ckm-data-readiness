// scoring/lib/aggregator.js
// Variable-level aggregation (7g B1) — rolls check_results up into
// variable_readiness_scores, one row per patient per variable per session.
// Implements the ratified 7g design decisions (CLAUDE.md §3):
//
//   Decision 1 — readiness_score = weighted average over ALL of a variable's
//   checks; technical_score = the same computation restricted to the
//   layer1–3 subset, weights renormalized within the subset; empty subset →
//   technical_score = readiness_score (degenerate copy).
//
//   Decision 2 — the aggregator consumes check_results.status, never score
//   (the SELECT below does not even read the score column). PASS → 1.0,
//   FAIL → 0.0, weighted by config weight; NOT_APPLICABLE excluded with
//   weights renormalized over applicable checks; all checks N_A → no row.
//   overall_status: computation.status_label bands when the owning use
//   case's computation is present; boolean (1.0 → READY, else NOT_READY)
//   when computation IS NULL.
//
//   Decision 3 — check_results.threshold is provenance metadata; never read.
//
// Config-driven throughout: variable names, check names, weights, and status
// bands all come from use_case_specifications rows passed in by the caller.
// Nothing condition-specific is hardcoded (Core Constraint: adding a
// condition must not require engine code changes).
//
// Transaction ownership: the caller. Both functions receive a pg client
// already inside the caller's transaction (same pattern as writer.js).

const LAYER123 = new Set(['layer1', 'layer2', 'layer3']);

// Weights are scaled to integers before averaging so ratios of config
// weights land exactly on their decimal values (e.g. A1C 0.5/0.3/0.2 with a
// layer5 FAIL must yield exactly 0.8, not 0.7999999999999999 float dust —
// the scores are demo-facing and fingerprinted). 1e6 preserves any sane
// config precision.
const WEIGHT_SCALE = 1_000_000;

// Build check_name → scaled weight for one config variable.
// Weight rules (B1 contract): a single-check variable may omit weight
// (degenerate 1.0); a multi-check variable with ANY weight absent is a
// config error. No sum-to-1 assertion — NOT_APPLICABLE renormalization
// divides by the applicable-weight sum, so only relative weights matter.
function buildWeightMap(useCaseName, variable) {
  const checks = variable.checks ?? [];
  if (checks.length === 0) {
    throw new Error(
      `aggregator: variable "${variable.variable_name}" in use case "${useCaseName}" has no checks`,
    );
  }
  const weights = new Map();
  for (const chk of checks) {
    let weight = chk.weight;
    if (weight === undefined || weight === null) {
      if (checks.length > 1) {
        throw new Error(
          `aggregator: config error — check "${chk.check_name}" of multi-check variable ` +
            `"${variable.variable_name}" (use case "${useCaseName}") has no weight`,
        );
      }
      weight = 1.0;
    }
    if (typeof weight !== 'number' || !Number.isFinite(weight) || weight <= 0) {
      throw new Error(
        `aggregator: config error — check "${chk.check_name}" of variable ` +
          `"${variable.variable_name}" has invalid weight ${JSON.stringify(weight)}`,
      );
    }
    weights.set(chk.check_name, Math.round(weight * WEIGHT_SCALE));
  }
  return weights;
}

// Map a continuous score to a status label via the use case's configured
// computation.status_label.thresholds (bands are config-owned, not engine
// constants). Bands are checked highest min_score first.
function bandStatus(score, bands, useCaseName) {
  const sorted = [...bands].sort((a, b) => b.min_score - a.min_score);
  for (const band of sorted) {
    if (score >= band.min_score) return band.status;
  }
  throw new Error(
    `aggregator: score ${score} matches no status_label band of use case "${useCaseName}"`,
  );
}

// Decision 2 status → indicator mapping. PARTIAL throws loudly: no built
// check emits it, so its appearance means a foreign writer touched
// check_results.
function indicatorFor(status, checkName, patientId) {
  if (status === 'PASS') return 1;
  if (status === 'FAIL') return 0;
  throw new Error(
    `aggregator: unexpected status ${JSON.stringify(status)} on check "${checkName}" ` +
      `patient ${patientId} — only PASS/FAIL/NOT_APPLICABLE are aggregable`,
  );
}

// Weighted status-indicator average over `rows`, renormalized over their
// weight sum. Integer weights in, exact-ratio float out.
function weightedAverage(rows, weights) {
  let num = 0;
  let den = 0;
  for (const row of rows) {
    const w = weights.get(row.check_name);
    num += w * row.indicator;
    den += w;
  }
  return num / den;
}

/**
 * Aggregate check_results into variable_readiness_scores rows for one
 * session, across every variable of every loaded use case.
 *
 * @param {import('pg').PoolClient} client - client inside the caller's transaction
 * @param {string} sessionId - demo_session_id
 * @param {Array<{use_case_name: string, variables: Array<object>, computation: object|null}>}
 *   useCaseSpecs - use_case_specifications rows (loaded once by the caller)
 * @returns {Promise<Array<object>>} rows keyed by WRITE_FIELDS below
 */
export async function aggregateVariables(client, sessionId, useCaseSpecs) {
  const out = [];

  for (const spec of useCaseSpecs) {
    const bands = spec.computation?.status_label?.thresholds ?? null;
    if (spec.computation && (!Array.isArray(bands) || bands.length === 0)) {
      throw new Error(
        `aggregator: use case "${spec.use_case_name}" has a computation block ` +
          'but no status_label.thresholds bands',
      );
    }

    for (const variable of spec.variables) {
      const weights = buildWeightMap(spec.use_case_name, variable);
      const checkNames = [...weights.keys()];

      // Decision 2: status only — score/threshold are deliberately not read.
      const res = await client.query(
        `SELECT patient_id, check_name, check_layer, status, organization_id
           FROM check_results
          WHERE demo_session_id = $1 AND check_name = ANY($2::varchar[])
          ORDER BY patient_id, check_name`,
        [sessionId, checkNames],
      );

      // Group rows per patient. A patient absent from one check's cohort
      // simply contributes no row for it — renormalization over the rows
      // present treats that like NOT_APPLICABLE (cohorts within a variable
      // are identical in current datasets; this is the generic behavior).
      const byPatient = new Map();
      for (const row of res.rows) {
        if (!byPatient.has(row.patient_id)) byPatient.set(row.patient_id, []);
        byPatient.get(row.patient_id).push(row);
      }

      for (const [patientId, rows] of byPatient) {
        // organization_id rides along from check rows; disagreement means
        // corrupted upstream data — fail loudly (pre-check verified 1:1).
        const orgs = new Set(rows.map((r) => r.organization_id));
        if (orgs.size !== 1) {
          throw new Error(
            `aggregator: patient ${patientId} has conflicting organization_id values ` +
              `(${[...orgs].join(', ')}) across checks of variable "${variable.variable_name}"`,
          );
        }

        const applicable = rows
          .filter((r) => r.status !== 'NOT_APPLICABLE')
          .map((r) => ({ ...r, indicator: indicatorFor(r.status, r.check_name, patientId) }));

        // All checks NOT_APPLICABLE → no row for this patient (Decision 2).
        if (applicable.length === 0) continue;

        const readinessScore = weightedAverage(applicable, weights);

        // Decision 1: layer1–3 subset, renormalized; empty subset (no
        // layer1–3 checks, or all of them N_A) → degenerate copy.
        const technicalRows = applicable.filter((r) => LAYER123.has(r.check_layer));
        const technicalScore =
          technicalRows.length > 0 ? weightedAverage(technicalRows, weights) : readinessScore;

        const overallStatus = bands
          ? bandStatus(readinessScore, bands, spec.use_case_name)
          : readinessScore === 1.0
            ? 'READY'
            : 'NOT_READY';

        // FAILing check names in config check order; NULL when none.
        const failed = new Set(
          applicable.filter((r) => r.status === 'FAIL').map((r) => r.check_name),
        );
        const blockingChecks =
          failed.size > 0 ? checkNames.filter((name) => failed.has(name)) : null;

        out.push({
          patient_id: patientId,
          variable_name: variable.variable_name,
          technical_score: technicalScore,
          readiness_score: readinessScore,
          overall_status: overallStatus,
          blocking_checks: blockingChecks,
          organization_id: rows[0].organization_id,
          demo_session_id: sessionId,
        });
      }
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Writer — idempotent upsert into variable_readiness_scores. Lives here (not
// in writer.js, which is documented as the check_results-only writer) but
// follows its batched-UNNEST pattern exactly. Arbiter:
// uq_variable_readiness_scores_upsert (V013).
// ---------------------------------------------------------------------------

const WRITE_FIELDS = [
  'patient_id',
  'variable_name',
  'technical_score',
  'readiness_score',
  'overall_status',
  'blocking_checks',
  'organization_id',
  'demo_session_id',
];

// blocking_checks is TEXT[] per row; UNNEST cannot carry rows-of-arrays, so
// each array travels as a jsonb value (or SQL NULL) and is unpacked
// order-preservingly on the server.
const UPSERT_SQL = `
  INSERT INTO variable_readiness_scores (
    score_id, patient_id, variable_name, technical_score, readiness_score,
    overall_status, blocking_checks, organization_id, scored_at, demo_session_id
  )
  SELECT
    gen_random_uuid(), t.patient_id, t.variable_name, t.technical_score,
    t.readiness_score, t.overall_status,
    CASE
      WHEN t.blocking_checks IS NULL THEN NULL
      ELSE (
        SELECT array_agg(e.value ORDER BY e.ordinality)
        FROM jsonb_array_elements_text(t.blocking_checks) WITH ORDINALITY AS e
      )
    END,
    t.organization_id, NOW(), t.demo_session_id
  FROM UNNEST(
    $1::varchar[], $2::varchar[], $3::float8[], $4::float8[],
    $5::varchar[], $6::jsonb[],   $7::varchar[], $8::uuid[]
  ) AS t(
    patient_id, variable_name, technical_score, readiness_score,
    overall_status, blocking_checks, organization_id, demo_session_id
  )
  ON CONFLICT (variable_name, patient_id, demo_session_id) DO UPDATE SET
    technical_score = EXCLUDED.technical_score,
    readiness_score = EXCLUDED.readiness_score,
    overall_status  = EXCLUDED.overall_status,
    blocking_checks = EXCLUDED.blocking_checks,
    organization_id = EXCLUDED.organization_id,
    scored_at       = NOW()
`;

/**
 * Upsert aggregated variable rows in a single batched statement.
 *
 * @param {import('pg').PoolClient} client - client inside the caller's transaction
 * @param {Array<object>} rows - rows from aggregateVariables()
 * @returns {Promise<number>} count of rows written (inserted or updated)
 */
export async function writeVariableScores(client, rows) {
  if (!Array.isArray(rows)) {
    throw new TypeError('writeVariableScores: rows must be an array');
  }
  if (rows.length === 0) return 0;

  const columns = WRITE_FIELDS.map((field) =>
    rows.map((row) => {
      const value = row[field] ?? null;
      return field === 'blocking_checks' && value !== null ? JSON.stringify(value) : value;
    }),
  );

  const result = await client.query(UPSERT_SQL, columns);
  return result.rowCount;
}
