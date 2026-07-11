// scoring/lib/work_item_generator.js
// Work-item generation (7j) — one remediation_work_items row per FAIL
// check_results row, content from the config's remediation_defaults.
// Implements the ratified 7j decisions (planning thread, 2026-07-11):
//
//   Lookup — built once from the loaded condition-module configs
//   (condition_modules.config_json snapshots), walking BOTH check locations
//   generically: use_cases[].eligibility_checks[] and
//   use_cases[].variables[].checks[]. Eligibility checks flow through the
//   same path as variable checks (D2) — zero layer6 FAILs today means zero
//   rows via exercised code, not a skipped branch. No hardcoded check
//   names, phenotypes, roles, actions, or use case names anywhere.
//
//   Structural validation at build time: every entry must carry all three
//   remediation_defaults keys (phenotype, responsible_role,
//   action_required) — a missing key throws naming the check and the key.
//   Role VALUES are not revalidated here: loader validation and the DB
//   CHECK are the existing dual enforcement; this module is not a third
//   site. The optional remediation_defaults 'note' key (density check) is
//   never copied — only the three canonical keys travel.
//
//   A FAIL row whose check_name is absent from the lookup THROWS naming
//   the check — never silently skipped.
//
//   Lifecycle is human-owned (D4): the upsert inserts content columns only
//   and lets defaults supply work_item_id, status ('open'), created_at
//   (now()); resolved_at and resolution_notes are never written. The
//   DO UPDATE arm refreshes content columns only — status, resolved_at,
//   resolution_notes, and created_at are never updated, so re-runs cannot
//   reopen resolved items.
//
// Structural contract: the FAIL SELECT reads check_result_id, check_name,
// patient_id, organization_id, priority, demo_session_id ONLY — never
// score, threshold, or observed_value. priority is sourced from the FAIL
// row (equal to config by the assertConfigAgreement invariant).
//
// Transaction ownership: the caller. generateWorkItems/writeWorkItems
// receive a pg client already inside the caller's transaction
// (aggregator/pathway_evaluator/use_case_writer pattern).

const REQUIRED_DEFAULT_KEYS = ['phenotype', 'responsible_role', 'action_required'];

/**
 * Build check_name → { phenotype, responsible_role, action_required,
 * use_case_name } from the loaded condition-module config snapshots.
 *
 * @param {Array<{config_json: object}>} conditionConfigs - condition_modules rows
 * @returns {Map<string, object>}
 */
export function buildRemediationLookup(conditionConfigs) {
  const lookup = new Map();

  for (const { config_json: config } of conditionConfigs) {
    for (const useCase of config.use_cases ?? []) {
      const entries = [
        ...(useCase.eligibility_checks ?? []),
        ...(useCase.variables ?? []).flatMap((v) => v.checks ?? []),
      ];
      for (const chk of entries) {
        const defaults = chk.remediation_defaults;
        if (!defaults || typeof defaults !== 'object') {
          throw new Error(
            `work_item_generator: check "${chk.check_name}" (use case ` +
              `"${useCase.use_case_name}") has no remediation_defaults`,
          );
        }
        for (const key of REQUIRED_DEFAULT_KEYS) {
          if (typeof defaults[key] !== 'string' || defaults[key].length === 0) {
            throw new Error(
              `work_item_generator: check "${chk.check_name}" (use case ` +
                `"${useCase.use_case_name}") remediation_defaults is missing "${key}"`,
            );
          }
        }
        if (lookup.has(chk.check_name)) {
          throw new Error(
            `work_item_generator: check "${chk.check_name}" appears in more than one ` +
              'config location — work-item content would be ambiguous',
          );
        }
        // 'note' (and any other extra key) deliberately not copied.
        lookup.set(chk.check_name, {
          phenotype: defaults.phenotype,
          responsible_role: defaults.responsible_role,
          action_required: defaults.action_required,
          use_case_name: useCase.use_case_name,
        });
      }
    }
  }

  if (lookup.size === 0) {
    throw new Error('work_item_generator: no checks found in any loaded condition config');
  }
  return lookup;
}

/**
 * Generate remediation_work_items rows for one session — one per FAIL.
 *
 * @param {import('pg').PoolClient} client - client inside the caller's transaction
 * @param {string} sessionId - demo_session_id
 * @param {Map<string, object>} lookup - from buildRemediationLookup()
 * @returns {Promise<Array<object>>} rows keyed by WRITE_FIELDS below
 */
export async function generateWorkItems(client, sessionId, lookup) {
  // Structural: identity + routing fields only — score, threshold, and
  // observed_value are deliberately not read.
  const res = await client.query(
    `SELECT check_result_id, check_name, patient_id, organization_id,
            priority, demo_session_id
       FROM check_results
      WHERE demo_session_id = $1 AND status = 'FAIL'
      ORDER BY check_name, patient_id`,
    [sessionId],
  );

  return res.rows.map((row) => {
    const entry = lookup.get(row.check_name);
    if (!entry) {
      throw new Error(
        `work_item_generator: FAIL row for check "${row.check_name}" (patient ` +
          `${row.patient_id}) has no remediation_defaults in any loaded config`,
      );
    }
    return {
      check_result_id: row.check_result_id,
      patient_id: row.patient_id,
      organization_id: row.organization_id,
      phenotype: entry.phenotype,
      use_case_name: entry.use_case_name,
      responsible_role: entry.responsible_role,
      action_required: entry.action_required,
      priority: row.priority,
      demo_session_id: row.demo_session_id,
    };
  });
}

// ---------------------------------------------------------------------------
// Writer — idempotent upsert into remediation_work_items. Lives here
// (writer.js stays check_results-only) but follows the batched-UNNEST
// pattern exactly. Arbiter: uq_remediation_work_items_upsert (V015), named
// via ON CONFLICT ON CONSTRAINT. Omitted on insert so defaults apply:
// work_item_id, status ('open'), created_at (now()). Never written:
// resolved_at, resolution_notes. DO UPDATE refreshes content columns only —
// lifecycle columns stay human-owned (D4).
// ---------------------------------------------------------------------------

const WRITE_FIELDS = [
  'check_result_id',
  'patient_id',
  'organization_id',
  'phenotype',
  'use_case_name',
  'responsible_role',
  'action_required',
  'priority',
  'demo_session_id',
];

const UPSERT_SQL = `
  INSERT INTO remediation_work_items (
    check_result_id, patient_id, organization_id, phenotype, use_case_name,
    responsible_role, action_required, priority, demo_session_id
  )
  SELECT
    t.check_result_id, t.patient_id, t.organization_id, t.phenotype,
    t.use_case_name, t.responsible_role, t.action_required, t.priority,
    t.demo_session_id
  FROM UNNEST(
    $1::uuid[], $2::varchar[], $3::varchar[], $4::varchar[], $5::varchar[],
    $6::varchar[], $7::text[], $8::varchar[], $9::uuid[]
  ) AS t(
    check_result_id, patient_id, organization_id, phenotype, use_case_name,
    responsible_role, action_required, priority, demo_session_id
  )
  ON CONFLICT ON CONSTRAINT uq_remediation_work_items_upsert DO UPDATE SET
    patient_id       = EXCLUDED.patient_id,
    organization_id  = EXCLUDED.organization_id,
    phenotype        = EXCLUDED.phenotype,
    use_case_name    = EXCLUDED.use_case_name,
    responsible_role = EXCLUDED.responsible_role,
    action_required  = EXCLUDED.action_required,
    priority         = EXCLUDED.priority,
    demo_session_id  = EXCLUDED.demo_session_id
`;

/**
 * Upsert work-item rows in a single batched statement.
 *
 * @param {import('pg').PoolClient} client - client inside the caller's transaction
 * @param {Array<object>} rows - rows from generateWorkItems()
 * @returns {Promise<number>} count of rows written (inserted or updated)
 */
export async function writeWorkItems(client, rows) {
  if (!Array.isArray(rows)) {
    throw new TypeError('writeWorkItems: rows must be an array');
  }
  if (rows.length === 0) return 0;

  const columns = WRITE_FIELDS.map((field) => rows.map((row) => row[field] ?? null));

  const result = await client.query(UPSERT_SQL, columns);
  return result.rowCount;
}
