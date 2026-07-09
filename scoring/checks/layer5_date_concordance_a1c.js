// scoring/checks/layer5_date_concordance_a1c.js
// Layer-5 date-concordance check for the A1C variable (7f — a1c_fallback pathway).
//
// Answers, per DM-cohort patient: do the patient's A1C result dates agree
// with the dates of the encounters they are linked to? Score is the fraction
// of qualifying (encounter-linked) observations whose dates are concordant;
// PASS only if every qualifying observation is concordant. Patients with no
// qualifying observation are NOT_APPLICABLE.
//
// This is the first EHR check whose results differ between Datasets B and C:
// Bug 5 (date format non-conformance) contaminates four A1C-linked encounters
// in B; Dataset C fixes the slash-format dates but not the digit-transposed
// ones — partial remediation, surfaced honestly.
//
// Concordance semantics (params.max_delta_days = 0, the operative path):
// concordant ⇔ encounter_date = effective_date as STRING EQUALITY — no date
// parsing. This deliberately classifies malformed formats ("02/18/2024"),
// calendar-invalid values ("20242007"), and valid-but-wrong dates
// ("20240506" vs "20240605") as discordant through one comparison.
// Malformed dates are this check's subject matter, never an error to throw
// on. (Contrast the guards below, which DO throw: they protect shapes that
// are outside this check's remit.)
//
// Generalized path (max_delta_days > 0, not exercised by current data):
// both dates must match a calendar-plausible YYYYMMDD pattern; either side
// failing → discordant without parsing; both passing → TO_DATE delta,
// concordant iff abs(delta) <= max_delta_days. Known edge, recorded: a
// regex-valid but calendar-invalid day (e.g., 20240230 — the pattern allows
// day 30 in any month) would make TO_DATE throw. Cannot arise in current
// datasets; production hardening, not a POC item.
//
// Qualifying = cohort patient's scoped obs (code + anchored effective_date,
// predicates inherited verbatim from checks 1/3) with encounter_id IS NOT
// NULL, joined to encounters ON (encounter_id, demo_session_id) — the join
// MUST be session-scoped (encounters PK is composite; every encounter_id
// exists once per session). Unlinked observations are excluded from both
// numerator and denominator. A dangling link (linked obs whose encounter is
// missing in-session) is an unexpected shape — none exist in any dataset —
// and throws loudly rather than being silently classified.
//
// Returns CheckResultRow[] shaped for scoring/lib/writer.js writeCheckResults.
// Never writes check_results itself.

import { EVALUATION_DATE } from '../lib/constants.js';

export const CHECK_NAME = 'layer5_date_concordance_a1c';
export const VARIABLE_NAME = 'A1C';
export const CHECK_SCOPE = 'ehr';
export const CHECK_LAYER = 'layer5';
export const PRIORITY = 'Medium';
// THRESHOLD (0.97) is aggregation metadata, not the status rule: status
// is defined by the strict all-qualifying-obs-concordant rule. The two
// coincide everywhere in current data because max obs/patient is 9, so
// any imperfect score is <= 8/9 ≈ 0.889 < 0.97. Whether `threshold` is
// status-defining or metadata is a 7g aggregator design question.
export const THRESHOLD = 0.97;

const USE_CASE_NAME = 'diabetes_risk_stratification';

// Calendar-plausible YYYYMMDD (months 01-12, days 01-31). Used only on the
// generalized max_delta_days > 0 path, as a parse guard before TO_DATE.
const PLAUSIBLE_DATE_SQL_PATTERN =
  '^[0-9]{4}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])$';

// Translate a config code pattern ("E10.*") to a SQL LIKE prefix ("E10%").
// Same contract as checks 1/3: any other shape is a config error — fail fast.
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
// priority/threshold drift and on missing/malformed params. max_delta_days
// is shape-validated (present, integer, >= 0), not value-matched — the
// config owns the value.
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

  const maxDeltaDays = entry.params?.max_delta_days;
  if (!Number.isInteger(maxDeltaDays) || maxDeltaDays < 0) {
    throw new Error(
      `${CHECK_NAME}: params.max_delta_days must be an integer >= 0 — got ${JSON.stringify(maxDeltaDays)}; reload the config`,
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
    maxDeltaDays,
    loincCodes,
    diagnosisPatterns: diagnosisCodes.map(codePatternToLike),
  };
}

// The two concordance predicates, selected by max_delta_days. Both operate
// on (o.effective_date, e.encounter_date) VARCHAR pairs; only the delta path
// ever parses, and only behind the plausible-date guard on both sides.
function concordantPredicate(maxDeltaDays) {
  if (maxDeltaDays === 0) {
    return 'e.encounter_date = o.effective_date';
  }
  return `(
    o.effective_date ~ '${PLAUSIBLE_DATE_SQL_PATTERN}'
    AND e.encounter_date ~ '${PLAUSIBLE_DATE_SQL_PATTERN}'
    AND ABS(TO_DATE(o.effective_date, 'YYYYMMDD') - TO_DATE(e.encounter_date, 'YYYYMMDD')) <= ${maxDeltaDays}
  )`;
}

// Cohort: DISTINCT active-diagnosis patients (predicate inherited verbatim
// from checks 1/3). Per patient: linked qualifying obs (LEFT-joined through
// observations then encounters, session-scoped), concordant count, dangling
// count (unexpected — module throws), and the discordant rows as evidence.
function buildSql(maxDeltaDays) {
  const concordant = concordantPredicate(maxDeltaDays);
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
      COUNT(o.*) FILTER (WHERE o.encounter_id IS NOT NULL)::int AS linked_rows,
      COUNT(o.*) FILTER (WHERE o.encounter_id IS NOT NULL AND e.encounter_id IS NULL)::int AS dangling_rows,
      COUNT(o.*) FILTER (WHERE e.encounter_id IS NOT NULL AND ${concordant})::int AS concordant_rows,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'observation_id', o.observation_id,
            'obs_date', o.effective_date,
            'encounter_id', o.encounter_id,
            'encounter_date', e.encounter_date
          )
          ORDER BY o.observation_id
        ) FILTER (WHERE e.encounter_id IS NOT NULL AND NOT (${concordant})),
        '[]'::jsonb
      ) AS discordant
    FROM cohort ch
    JOIN patients p
      ON p.patient_id = ch.patient_id
     AND p.demo_session_id = $1
    LEFT JOIN observations o
      ON o.patient_id = ch.patient_id
     AND o.demo_session_id = $1
     AND o.code = ANY($3::text[])
     AND o.effective_date <= $4
    LEFT JOIN encounters e
      ON e.encounter_id = o.encounter_id
     AND e.demo_session_id = $1
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
  const { maxDeltaDays, loincCodes, diagnosisPatterns } = await loadConfig(client);
  const anchor = EVALUATION_DATE.replaceAll('-', '');

  const result = await client.query(buildSql(maxDeltaDays), [
    sessionId,
    diagnosisPatterns,
    loincCodes,
    anchor,
  ]);

  const dangling = result.rows.filter((r) => r.dangling_rows > 0);
  if (dangling.length > 0) {
    throw new Error(
      `${CHECK_NAME}: dangling encounter link(s) — linked A1C obs whose encounter is missing in session ${sessionId} — patients: ${dangling.map((r) => `${r.patient_id} (${r.dangling_rows})`).join(', ')}`,
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

    if (row.linked_rows === 0) {
      return {
        ...base,
        status: 'NOT_APPLICABLE',
        score: null,
        observed_value: 'no qualifying encounter-linked A1C observation in window.',
      };
    }

    const evidence = {
      max_delta_days: maxDeltaDays,
      qualifying: row.linked_rows,
      concordant: row.concordant_rows,
    };
    const pass = row.concordant_rows === row.linked_rows;
    if (!pass) evidence.discordant = row.discordant;

    return {
      ...base,
      status: pass ? 'PASS' : 'FAIL',
      score: row.concordant_rows / row.linked_rows,
      observed_value: JSON.stringify(evidence),
    };
  });
}
