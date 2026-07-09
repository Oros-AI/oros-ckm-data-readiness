// scoring/checks/layer5_date_concordance.js
// Layer-5 date-concordance check for the Encounter Date variable
// (7f — Bug 5, encounters; vbc_reporting module). Final 7f check.
//
// Answers, per vbc_reporting-cohort patient: do the dates recorded on the
// patient's encounter-linked clinical facts (observations.effective_date,
// conditions.date_recorded, medications.date_written) agree with the
// encounter_date of the encounter each fact is linked to? Score is the
// fraction of encounter-linked facts whose dates are concordant; PASS only
// if every linked fact is concordant. A non-conformant encounter_date is
// discordant with ALL of its linked facts at once, so a single seeded
// encounter surfaces through every fact it anchors.
//
// Bug 5 (Dataset B): seven seeded encounters carry malformed or wrong
// encounter_date values — four slash-format (MM/DD/YYYY), two digit-swapped
// month/day (20242007, 20231810), one transposed valid-but-wrong date
// (20240506 vs 20240605). Dataset C fixes the slash-format four; the
// digit-level errors remain — partial remediation, surfaced honestly.
// This is the first check where all three sessions differ (A ≠ B ≠ C).
//
// Cohort: patients meeting the qualifying_encounters criterion from the
// loaded population_definition (minimum_count, lookback_months,
// qualifying_classes — nothing hardcoded). Mechanism inherited from
// layer6_denom_riskstrat: class = ANY(qualifying_classes), the ~ '^\d{8}$'
// guard (REQUIRED — Bug 5 seeds malformed dates and an unguarded to_date()
// would throw), and a lexicographic string window anchored to
// EVALUATION_DATE. No encounter-status filter.
//
// Row scope is deliberately BROADER than the cohort predicate: the validated
// row set is ALL encounter-linked facts for cohort patients, NOT restricted
// by encounter class, status, or the lookback window. Date conformance is a
// property of the record, not of cohort eligibility — restricting rows to the
// cohort predicate would silently drop seeded targets: ENC000194 (20220622)
// sits OUTSIDE the 24-month window, and a window-scoped row set would never
// see its slash-format B value; ENC000417 has NO linked observations (only
// conditions and medications), so an observations-only row set would miss it
// entirely — all three fact tables are load-bearing.
//
// Concordance semantics (params.max_delta_days = 0, the operative path):
// concordant ⇔ fact date = encounter_date as STRING EQUALITY — no date
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
// Facts with NULL encounter_id are excluded from numerator and denominator.
// Every fact-to-encounter join is session-scoped ON (encounter_id,
// demo_session_id) — the encounters PK is composite; every encounter_id
// exists once per session. A dangling link (linked fact whose encounter is
// missing in-session) is an unexpected shape — none exist in any dataset —
// and throws loudly rather than being silently classified.
//
// Status rule: PASS iff score = 1.0. Unlike layer5_date_concordance_a1c
// (threshold 0.97, metadata distinct from the strict rule), THRESHOLD here
// is 1.0, so the config threshold and the strict all-facts-concordant rule
// coincide BY DEFINITION, not by dataset accident. Zero linked facts →
// NOT_APPLICABLE with null score — kept for structural symmetry with the
// other 7f checks; predicted unexercised (every cohort patient has linked
// facts in all three datasets). window_days is null: the 24-month lookback
// is cohort metadata, not the evaluation window of the rows being validated.
//
// Returns CheckResultRow[] shaped for scoring/lib/writer.js writeCheckResults.
// Never writes check_results itself.

import { EVALUATION_DATE } from '../lib/constants.js';

export const CHECK_NAME = 'layer5_date_concordance';
export const VARIABLE_NAME = 'Encounter Date';
export const CHECK_SCOPE = 'ehr';
export const CHECK_LAYER = 'layer5';
export const PRIORITY = 'Medium';
export const THRESHOLD = 1.0;

const USE_CASE_NAME = 'vbc_reporting';

// Calendar-plausible YYYYMMDD (months 01-12, days 01-31). Used only on the
// generalized max_delta_days > 0 path, as a parse guard before TO_DATE.
const PLAUSIBLE_DATE_SQL_PATTERN =
  '^[0-9]{4}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])$';

// Const exports give the orchestrator safe registration-time reads; this
// assertion keeps the loaded config as the source of truth — throws on
// priority/threshold drift and on missing/malformed params. max_delta_days
// is shape-validated (present, integer, >= 0), not value-matched — the
// config owns the value.
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

  const maxDeltaDays = entry.params?.max_delta_days;
  if (!Number.isInteger(maxDeltaDays) || maxDeltaDays < 0) {
    throw new Error(
      `${CHECK_NAME}: params.max_delta_days must be an integer >= 0 — got ${JSON.stringify(maxDeltaDays)}; reload the config`,
    );
  }

  const criterion = populationDefinition?.eligibility_criteria?.find(
    (c) => c.criterion_id === 'qualifying_encounters',
  );
  if (!criterion) {
    throw new Error(
      `${CHECK_NAME}: eligibility criterion 'qualifying_encounters' not found in loaded config`,
    );
  }
  for (const key of ['minimum_count', 'lookback_months', 'qualifying_classes']) {
    if (criterion[key] === undefined || criterion[key] === null) {
      throw new Error(
        `${CHECK_NAME}: eligibility criterion 'qualifying_encounters' is missing required key '${key}'`,
      );
    }
  }

  return { maxDeltaDays, qualifyingEncounters: criterion };
}

// YYYYMMDD string N months before an ISO date (YYYY-MM-DD). encounter_date is
// VARCHAR(8) YYYYMMDD, which compares correctly as a string, so the cohort
// window is evaluated lexicographically — no to_date() on data (same
// mechanism and rationale as layer6_denom_riskstrat).
function monthsBeforeCompact(isoDate, months) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1 - months, d));
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

// The two concordance predicates, selected by max_delta_days. Both operate
// on (f.fact_date, e.encounter_date) VARCHAR pairs; only the delta path
// ever parses, and only behind the plausible-date guard on both sides.
function concordantPredicate(maxDeltaDays) {
  if (maxDeltaDays === 0) {
    return 'e.encounter_date = f.fact_date';
  }
  return `(
    f.fact_date ~ '${PLAUSIBLE_DATE_SQL_PATTERN}'
    AND e.encounter_date ~ '${PLAUSIBLE_DATE_SQL_PATTERN}'
    AND ABS(TO_DATE(f.fact_date, 'YYYYMMDD') - TO_DATE(e.encounter_date, 'YYYYMMDD')) <= ${maxDeltaDays}
  )`;
}

// Cohort: patients with >= minimum_count qualifying encounters (see header).
// Facts: session-wide UNION ALL of the three encounter-linked fact tables
// (NULL encounter_id excluded up front), attributed to cohort patients via
// the fact's own patient_id, then LEFT-joined to encounters session-scoped —
// a linked fact whose encounter is absent surfaces as dangling (throws).
// Discordant facts are aggregated flat (ordered by encounter_id, fact_id)
// and grouped per encounter in JS for the evidence payload.
function buildSql(maxDeltaDays) {
  const concordant = concordantPredicate(maxDeltaDays);
  return `
    WITH cohort AS (
      SELECT p.patient_id, p.organization_id
      FROM patients p
      WHERE p.demo_session_id = $1
        AND (
          SELECT COUNT(*)
          FROM encounters e
          WHERE e.patient_id = p.patient_id
            AND e.demo_session_id = p.demo_session_id
            AND e.class = ANY($2::text[])
            AND e.encounter_date ~ '^\\d{8}$'
            AND e.encounter_date >= $3
            AND e.encounter_date <= $4
        ) >= $5
    ),
    facts AS (
      SELECT o.patient_id, o.observation_id AS fact_id,
             o.effective_date AS fact_date, o.encounter_id
      FROM observations o
      WHERE o.demo_session_id = $1 AND o.encounter_id IS NOT NULL
      UNION ALL
      SELECT c.patient_id, c.condition_id, c.date_recorded, c.encounter_id
      FROM conditions c
      WHERE c.demo_session_id = $1 AND c.encounter_id IS NOT NULL
      UNION ALL
      SELECT m.patient_id, m.medication_id, m.date_written, m.encounter_id
      FROM medications m
      WHERE m.demo_session_id = $1 AND m.encounter_id IS NOT NULL
    )
    SELECT
      ch.patient_id,
      ch.organization_id,
      COUNT(f.*)::int AS linked_rows,
      COUNT(f.*) FILTER (WHERE e.encounter_id IS NULL)::int AS dangling_rows,
      COUNT(f.*) FILTER (WHERE e.encounter_id IS NOT NULL AND ${concordant})::int AS concordant_rows,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'encounter_id', f.encounter_id,
            'encounter_date', e.encounter_date,
            'fact_id', f.fact_id,
            'fact_date', f.fact_date
          )
          ORDER BY f.encounter_id, f.fact_id
        ) FILTER (WHERE e.encounter_id IS NOT NULL AND NOT (${concordant})),
        '[]'::jsonb
      ) AS discordant
    FROM cohort ch
    LEFT JOIN facts f
      ON f.patient_id = ch.patient_id
    LEFT JOIN encounters e
      ON e.encounter_id = f.encounter_id
     AND e.demo_session_id = $1
    GROUP BY ch.patient_id, ch.organization_id
    ORDER BY ch.patient_id
  `;
}

// Group the flat discordant rows per encounter for the evidence payload:
// [{ encounter_id, encounter_date, facts: [{ fact_id, fact_date }, …] }, …].
// Input arrives ordered by (encounter_id, fact_id), so grouping preserves a
// deterministic order — byte-identical evidence for identical data.
function groupDiscordantByEncounter(flatRows) {
  const grouped = [];
  let current = null;
  for (const row of flatRows) {
    if (!current || current.encounter_id !== row.encounter_id) {
      current = {
        encounter_id: row.encounter_id,
        encounter_date: row.encounter_date,
        facts: [],
      };
      grouped.push(current);
    }
    current.facts.push({ fact_id: row.fact_id, fact_date: row.fact_date });
  }
  return grouped;
}

/**
 * @param {import('pg').PoolClient} client - client inside the caller's transaction
 * @param {string} sessionId - demo_session_id to evaluate
 * @returns {Promise<Array<object>>} CheckResultRow[] — one per cohort patient
 */
export async function runCheck(client, sessionId) {
  const { maxDeltaDays, qualifyingEncounters } = await loadConfig(client);

  const windowStart = monthsBeforeCompact(EVALUATION_DATE, qualifyingEncounters.lookback_months);
  const windowEnd = EVALUATION_DATE.replaceAll('-', '');

  const result = await client.query(buildSql(maxDeltaDays), [
    sessionId,
    qualifyingEncounters.qualifying_classes,
    windowStart,
    windowEnd,
    qualifyingEncounters.minimum_count,
  ]);

  const dangling = result.rows.filter((r) => r.dangling_rows > 0);
  if (dangling.length > 0) {
    throw new Error(
      `${CHECK_NAME}: dangling encounter link(s) — linked fact whose encounter is missing in session ${sessionId} — patients: ${dangling.map((r) => `${r.patient_id} (${r.dangling_rows})`).join(', ')}`,
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
        observed_value: 'no encounter-linked clinical facts for patient.',
      };
    }

    const evidence = {
      max_delta_days: maxDeltaDays,
      total: row.linked_rows,
      concordant: row.concordant_rows,
    };
    const pass = row.concordant_rows === row.linked_rows;
    if (!pass) evidence.discordant = groupDiscordantByEncounter(row.discordant);

    return {
      ...base,
      status: pass ? 'PASS' : 'FAIL',
      score: row.concordant_rows / row.linked_rows,
      observed_value: JSON.stringify(evidence),
    };
  });
}
