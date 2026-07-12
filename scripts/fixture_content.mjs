// scripts/fixture_content.mjs
// The single authored-content surface for the fixture export (fx-1).
//
// ESM, no dependencies, no DB access. The fixture exporter imports this map
// and combines it with engine truth (check_results / use_case_readiness /
// remediation_work_items) at export time. Nothing here restates what the
// engine or the loaded config already owns: display_name comes from config,
// fail counts come from check_results, routing (role/phenotype/action) comes
// from remediation_work_items. This file owns only the authored layer the
// Demo UI/UX Specification (§6.3, §9, §10, §13) requires and the engine does
// not emit: recommendationType, the four-facts plain-language strings, the
// evidence renderers, the surfaced criteria, and the pipeline-stage copy.
//
// Copy disciplines (CLAUDE.md §1.6 / UI-UX spec §13) — every authored string
// below holds to these: no "CGM primary / A1C fallback" or any raw pathway
// name; the platform surfaces, orders, routes, and remediates — it never
// enrolls, identifies, decides care, or acts autonomously; humans act; no
// program-specific reporting claims; factual severity language only.
//
// Template placeholders (interpolated by the exporter from session truth):
//   {failCount}       — REQUIRED in every whatFailed template
//   {cohortSize}      — optional
//   {evidenceExample} — ONLY in the opt-in checks (see EVIDENCE_EXAMPLE_CHECKS)
// The exporter appends "Check: <check_name>" itself — templates never do.

// ---------------------------------------------------------------------------
// Site-level display band over the strict ready fraction (READY count/total).
// Customizable criterion — surfaced in CRITERIA below.
// ---------------------------------------------------------------------------
export const BAND = { readyAt: 1.0, partiallyReadyAt: 0.85 };

// ---------------------------------------------------------------------------
// Per-use-case display metadata. displayOrder is the ratified workflow order.
// display_name is deliberately NOT restated here — the exporter reads it from
// the loaded config (use_case_specifications.display_name).
// implementationState uses the three-state vocabulary (§1.6): the diabetes
// module is the implemented full pathway; the other three are demonstrated
// stubs (real checks, degenerate single-pathway aggregation).
// ---------------------------------------------------------------------------
export const USE_CASE_META = {
  diabetes_risk_stratification: { displayOrder: 1, implementationState: 'implemented' },
  hypertension_risk_stratification: { displayOrder: 2, implementationState: 'demonstrated_stub' },
  care_coordination: { displayOrder: 3, implementationState: 'demonstrated_stub' },
  vbc_reporting: { displayOrder: 4, implementationState: 'demonstrated_stub' },
};

// The opt-in list: templates for these checks include {evidenceExample};
// every other check's templates MUST NOT (counts only — their raw evidence
// adds noise, a contentless ratio, or nothing at all).
export const EVIDENCE_EXAMPLE_CHECKS = [
  'layer2_ranges_numeric_a1c',
  'layer2_value_standards',
  'layer3_mapped_values',
  'layer5_date_concordance',
  'layer5_date_concordance_a1c',
  'layer1_notnull_fields_encounters',
  'device_derived_metric_consistency_cgm',
];

// Shared helper for the renderers: 'YYYYMMDD' → 'YYYY-MM-DD'. Anything else
// is returned untouched (garbled dates are subject matter — shown verbatim).
function isoDate(yyyymmdd) {
  return /^\d{8}$/.test(yyyymmdd)
    ? `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
    : yyyymmdd;
}

function renderFailure(checkName, observedValue) {
  throw new Error(
    `renderEvidence(${checkName}): cannot parse observed_value ${JSON.stringify(observedValue)}`,
  );
}

function parseJsonEvidence(checkName, observedValue) {
  try {
    const parsed = JSON.parse(observedValue);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    /* fall through to the named throw */
  }
  return renderFailure(checkName, observedValue);
}

// ---------------------------------------------------------------------------
// CHECK_CONTENT — keyed by FULL check_name; exactly the 11 checks with FAIL
// rows in the fx pre-check (gate_fx_precheck.txt §3). Composed from the
// work-item action_required strings (§6) and the Dataset B Bug Reconciliation
// (bugs 1–9); contradicts neither.
// ---------------------------------------------------------------------------
export const CHECK_CONTENT = {
  // Bug 1 — device identity linkage. Counts only: the orphan device UUIDs
  // are deliberately unattributed noise (building the crosswalk IS the fix).
  device_patient_linkage_cgm: {
    bugId: 'bug_1',
    recommendationType: 'route_to_stakeholder',
    whatFailed:
      '{failCount} of {cohortSize} monitored patients have CGM device records that cannot be linked to their patient identity — the device stream carries a device ID that matches no patient on file.',
    whatUnlocks:
      'Once the vendor implements the device-to-patient ID crosswalk, these patients’ device streams become attributable and the weekly stratification review can include them on current device data.',
    renderEvidence(observedValue) {
      const m = /^joinable_cgm_readings=(\d+) \(expected >0\)$/.exec(observedValue);
      if (!m) return renderFailure('device_patient_linkage_cgm', observedValue);
      return `${m[1]} device readings link to this patient (expected more than 0)`;
    },
  },

  // Bug 2 — CGM temporal density. Counts only (a ratio adds nothing).
  device_temporal_density_cgm_14d: {
    bugId: 'bug_2',
    recommendationType: 'route_to_stakeholder',
    whatFailed:
      '{failCount} of {cohortSize} monitored patients have CGM coverage below the configured 70% floor over the 14-day review window — the gaps are too large for the data to support reliable glycemic review.',
    whatUnlocks:
      'Restored device coverage gives the care team a continuous signal they can trust, so these patients re-enter the weekly stratification review on current device data.',
    overrides: {
      C: {
        whatFailed:
          '{failCount} of {cohortSize} monitored patients still have CGM coverage below the configured 70% floor. Detection, flagging, and routing are complete; the underlying readings are unchanged — missing readings cannot be created by the platform.',
        whatUnlocks:
          'The platform’s half is done: the gap is characterized and routed. Restoring coverage is clinic-side work — device adherence outreach with these patients — after which the weekly stratification review can rely on their device data again.',
      },
    },
    renderEvidence(observedValue) {
      const m = /^density=([\d.]+) \((\d+)\/(\d+), floor ([\d.]+)\)$/.exec(observedValue);
      if (!m) return renderFailure('device_temporal_density_cgm_14d', observedValue);
      const pct = (Number(m[1]) * 100).toFixed(1);
      const floorPct = (Number(m[4]) * 100).toFixed(0);
      return `14-day coverage ${pct}% — below the ${floorPct}% floor`;
    },
  },

  // Bug 3 — missing smoking status. Zero rows exist: nothing to show.
  layer1_notnull_fields_smoking: {
    bugId: 'bug_3',
    recommendationType: 'route_to_stakeholder',
    whatFailed:
      '{failCount} of {cohortSize} hypertension patients have no smoking-status observation on record — a required variable for hypertension risk stratification was never captured at the point of care.',
    whatUnlocks:
      'Once smoking status is documented at the point of care, hypertension risk stratification can order the full panel for the weekly review instead of leaving these patients unscored.',
    renderEvidence(observedValue) {
      const m = /^qualifying_smoking_rows=0 \(0 total smoking rows\)$/.exec(observedValue);
      if (!m) return renderFailure('layer1_notnull_fields_smoking', observedValue);
      return 'No smoking-status observation on record for this patient';
    },
  },

  // Bug 4 — invalid RxNorm medication codes. Deterministic mapping exists.
  layer3_mapped_values: {
    bugId: 'bug_4',
    recommendationType: 'ai_suggested_fix',
    whatFailed:
      '{failCount} patients have medication records carrying codes that are not valid RxNorm concepts (for example {evidenceExample}) — malformed or placeholder values a receiving system cannot interpret.',
    whatUnlocks:
      'Valid RxNorm codes make the medication list machine-readable across systems, unblocking care coordination on a medication picture every participating site can reconcile.',
    renderEvidence(observedValue) {
      const parsed = parseJsonEvidence('layer3_mapped_values', observedValue);
      if (typeof parsed.total !== 'number' || typeof parsed.valid !== 'number'
        || typeof parsed.invalid_codes !== 'string' || parsed.invalid_codes.length === 0) {
        return renderFailure('layer3_mapped_values', observedValue);
      }
      const bad = parsed.total - parsed.valid;
      return `Invalid RxNorm code${bad === 1 ? '' : 's'}: ${parsed.invalid_codes} (${bad} of ${parsed.total} medication rows)`;
    },
  },

  // Bug 4 — invalid ICD-10 condition codes. Twin of the medications entry.
  layer2_value_standards: {
    bugId: 'bug_4',
    recommendationType: 'ai_suggested_fix',
    whatFailed:
      '{failCount} patients have condition records carrying codes that are not valid ICD-10 (for example {evidenceExample}) — malformed values, non-existent codes, or legacy ICD-9 remnants.',
    whatUnlocks:
      'Valid ICD-10 codes make the problem list exchangeable, unblocking care coordination on a diagnosis picture every participating system can read.',
    renderEvidence(observedValue) {
      const parsed = parseJsonEvidence('layer2_value_standards', observedValue);
      if (typeof parsed.total !== 'number' || typeof parsed.valid !== 'number'
        || typeof parsed.invalid_codes !== 'string' || parsed.invalid_codes.length === 0) {
        return renderFailure('layer2_value_standards', observedValue);
      }
      const bad = parsed.total - parsed.valid;
      return `Invalid ICD-10 code${bad === 1 ? '' : 's'}: ${parsed.invalid_codes} (${bad} of ${parsed.total} condition rows)`;
    },
  },

  // Bug 5 — encounter date concordance. Session-dependent recommendation:
  // in B the four format errors are auto-normalizable; in C only the three
  // source-confirmation records remain, and those route to a person.
  layer5_date_concordance: {
    bugId: 'bug_5',
    recommendationType: { B: 'ai_suggested_fix', C: 'route_to_stakeholder' },
    whatFailed:
      '{failCount} patients have encounters whose recorded date does not agree with the dates on the clinical facts linked to them (for example {evidenceExample}) — non-conformant formats or transposed values in the encounter date.',
    whatUnlocks:
      'Conformant encounter dates make the encounter record trustworthy for clinical quality and value-based care reporting — the downstream half of the care model that runs on EHR data.',
    overrides: {
      C: {
        whatFailed:
          '{failCount} patients still have an encounter date that needs source-system confirmation (for example {evidenceExample}): one ambiguous transposition and two impossible-month values. The four unambiguous format errors have already been normalized.',
        whatUnlocks:
          'Once the source system confirms the three remaining dates, the encounter record is fully trustworthy for clinical quality and value-based care reporting.',
      },
    },
    renderEvidence(observedValue) {
      const parsed = parseJsonEvidence('layer5_date_concordance', observedValue);
      if (typeof parsed.total !== 'number' || typeof parsed.concordant !== 'number'
        || !Array.isArray(parsed.discordant) || parsed.discordant.length === 0) {
        return renderFailure('layer5_date_concordance', observedValue);
      }
      const parts = parsed.discordant.map((d) => {
        if (typeof d.encounter_id !== 'string' || typeof d.encounter_date !== 'string'
          || !Array.isArray(d.facts) || d.facts.length === 0
          || typeof d.facts[0].fact_date !== 'string') {
          return renderFailure('layer5_date_concordance', observedValue);
        }
        return `${d.encounter_id} dated "${d.encounter_date}" vs ${d.facts.length} linked fact${d.facts.length === 1 ? '' : 's'} at ${isoDate(d.facts[0].fact_date)}`;
      });
      return `${parsed.total - parsed.concordant} of ${parsed.total} linked facts discordant — ${parts.join('; ')}`;
    },
  },

  // Bug 5 — A1C result-date vs encounter-date concordance. Same B/C split.
  layer5_date_concordance_a1c: {
    bugId: 'bug_5',
    recommendationType: { B: 'ai_suggested_fix', C: 'route_to_stakeholder' },
    whatFailed:
      '{failCount} patients have an A1C result whose date does not agree with the linked encounter’s recorded date (for example {evidenceExample}) — the mismatch traces to a non-conformant encounter date, not the lab value.',
    whatUnlocks:
      'A concordant result-date trail keeps the A1C history reliable for the review and reporting workflows that depend on when a value was actually drawn.',
    overrides: {
      C: {
        whatFailed:
          '{failCount} patients still have an A1C-to-encounter date mismatch pending source-system confirmation (for example {evidenceExample}) — the two encounter dates that could not be auto-normalized. The format-only mismatches have been resolved.',
        whatUnlocks:
          'Once the source system confirms the two remaining encounter dates, the A1C history’s date trail is fully reliable for review and reporting.',
      },
    },
    renderEvidence(observedValue) {
      const parsed = parseJsonEvidence('layer5_date_concordance_a1c', observedValue);
      if (typeof parsed.qualifying !== 'number' || typeof parsed.concordant !== 'number'
        || !Array.isArray(parsed.discordant) || parsed.discordant.length === 0) {
        return renderFailure('layer5_date_concordance_a1c', observedValue);
      }
      const parts = parsed.discordant.map((d) => {
        if (typeof d.observation_id !== 'string' || typeof d.obs_date !== 'string'
          || typeof d.encounter_id !== 'string' || typeof d.encounter_date !== 'string') {
          return renderFailure('layer5_date_concordance_a1c', observedValue);
        }
        return `${d.observation_id} resulted ${isoDate(d.obs_date)} vs ${d.encounter_id} dated "${d.encounter_date}"`;
      });
      return `${parsed.qualifying - parsed.concordant} of ${parsed.qualifying} A1C results discordant — ${parts.join('; ')}`;
    },
  },

  // Bug 6 — TIR derived-metric concordance. Recompute exists, but the
  // authoritative-method decision routes to governance (Policy/Regulatory).
  device_derived_metric_consistency_cgm: {
    bugId: 'bug_6',
    recommendationType: 'route_to_stakeholder',
    whatFailed:
      '{failCount} patients have a stored Time-in-Range value that does not match the value recomputed from their raw CGM readings (for example {evidenceExample}) — outside the configured 2-percentage-point tolerance.',
    whatUnlocks:
      'Once governance confirms the accepted computation method, derived metrics like Time-in-Range become defensible, manufacturer-independent inputs to stratification and reporting.',
    renderEvidence(observedValue) {
      const m = /^stored=([\d.]+%); recomputed=([\d.]+%); abs_diff=([\d.]+pp); density=/.exec(observedValue);
      if (!m) return renderFailure('device_derived_metric_consistency_cgm', observedValue);
      return `Stored Time-in-Range ${m[1]} vs ${m[2]} recomputed from raw readings (difference ${m[3]})`;
    },
  },

  // Bug 7 — structural feed non-conformance on encounters (ext Add-1).
  layer1_notnull_fields_encounters: {
    bugId: 'bug_7',
    recommendationType: 'route_to_stakeholder',
    whatFailed:
      '{failCount} patients have encounter records in the reporting window arriving with required structural fields empty (for example {evidenceExample}) — the source feed is delivering malformed records.',
    whatUnlocks:
      'A correctly configured feed restores complete encounter records at the source, keeping clinical quality and value-based care reporting grounded in structurally sound data.',
    renderEvidence(observedValue) {
      const m = /^nonconformant=(\d+)\/(\d+): (.+)$/.exec(observedValue);
      if (!m) return renderFailure('layer1_notnull_fields_encounters', observedValue);
      const detail = m[3]
        .split(', ')
        .map((entry) => {
          const em = /^(ENC\d+)\[([^\]]+)\]$/.exec(entry);
          if (!em) return renderFailure('layer1_notnull_fields_encounters', observedValue);
          return `${em[1]} missing ${em[2].split(',').join(', ')}`;
        })
        .join('; ');
      return `${m[1]} of ${m[2]} in-window encounters malformed — ${detail}`;
    },
  },

  // Bug 8 — stale A1C (ext Add-2). Counts only; the window bounds already
  // carry the story and a raw date dump adds nothing for the panel.
  fitness_recency_a1c: {
    bugId: 'bug_8',
    recommendationType: 'route_to_stakeholder',
    whatFailed:
      '{failCount} of {cohortSize} diabetes patients have no A1C result inside the configured 6-month recency window — a value exists on record, but it is too old to reflect current control.',
    whatUnlocks:
      'A current A1C — lab collection at the next visit, or device enrollment so continuous glucose data carries current glycemic monitoring — restores an up-to-date picture of control for these patients’ weekly review.',
    renderEvidence(observedValue) {
      const m = /^window=(\d{8})\.\.(\d{8}); in_window=0 of (\d+); latest_a1c=(\d{8})$/.exec(observedValue);
      if (!m) return renderFailure('fitness_recency_a1c', observedValue);
      return `No A1C between ${isoDate(m[1])} and ${isoDate(m[2])} (${m[3]} on record; most recent ${isoDate(m[4])})`;
    },
  },

  // Bug 9 — implausible A1C value (ext Add-3). Deterministic correction path
  // (unit-error phenotype) — the proposed fix is reviewed and approved by a
  // person before anything changes.
  layer2_ranges_numeric_a1c: {
    bugId: 'bug_9',
    recommendationType: 'ai_suggested_fix',
    whatFailed:
      '{failCount} patients have an A1C value recorded outside the plausible clinical range of 2.0–20.0% (for example {evidenceExample}) — consistent with a unit or entry error at the source.',
    whatUnlocks:
      'With plausible values restored, the A1C history becomes clinically usable and these patients’ glycemic picture can be trusted in review and reporting.',
    renderEvidence(observedValue) {
      const parsed = parseJsonEvidence('layer2_ranges_numeric_a1c', observedValue);
      if (typeof parsed.min !== 'number' || typeof parsed.max !== 'number'
        || typeof parsed.units !== 'string'
        || !Array.isArray(parsed.out_of_range) || parsed.out_of_range.length === 0) {
        return renderFailure('layer2_ranges_numeric_a1c', observedValue);
      }
      const parts = parsed.out_of_range.map((o) => {
        if (typeof o.value !== 'string' || typeof o.observation_id !== 'string') {
          return renderFailure('layer2_ranges_numeric_a1c', observedValue);
        }
        return `A1C ${o.value} ${parsed.units} (${o.observation_id})`;
      });
      return `${parts.join('; ')} — outside the plausible ${parsed.min}–${parsed.max} ${parsed.units} range`;
    },
  },
};

// ---------------------------------------------------------------------------
// CRITERIA — the ConfiguredCriterion entries surfaced per UI/UX spec §9.
// Values match config verbatim (diabetes.config.json / CLAUDE.md §8); shown
// as configured and owned by the local team, never asserted by the platform.
// tier: 'foundational' = anchored to national standards, stable;
// 'customizable' = local, evolves as guidelines shift.
// appliesToUseCase uses the frozen use_case_name enum; 'all' is the
// documented sentinel for the one site-level display criterion that spans
// every use case's rollup.
// ---------------------------------------------------------------------------
export const CRITERIA = [
  {
    criterionId: 'cgm_temporal_density_floor',
    label: 'CGM temporal density ≥ 0.70 over the 14-day window',
    value: '0.70',
    appliesToUseCase: 'diabetes_risk_stratification',
    tier: 'foundational',
    configVersion: 'diabetes.config.json@0.1',
    ownedBy: 'Local clinical team',
  },
  {
    criterionId: 'tir_recompute_tolerance',
    label: 'Time-in-Range recomputation tolerance ± 2pp against raw readings',
    value: '± 2pp',
    appliesToUseCase: 'diabetes_risk_stratification',
    tier: 'foundational',
    configVersion: 'diabetes.config.json@0.1',
    ownedBy: 'Local clinical team',
  },
  {
    criterionId: 'a1c_plausible_range',
    label: 'A1C plausible range 2.0–20.0 %',
    value: '2.0–20.0 %',
    appliesToUseCase: 'diabetes_risk_stratification',
    tier: 'foundational',
    configVersion: 'diabetes.config.json@0.1',
    ownedBy: 'Local clinical team',
  },
  {
    criterionId: 'a1c_recency_lookback',
    label: 'A1C recency: 6-month lookback from the evaluation date',
    value: '6 months',
    appliesToUseCase: 'diabetes_risk_stratification',
    tier: 'customizable',
    configVersion: 'diabetes.config.json@0.1',
    ownedBy: 'Local clinical team',
  },
  {
    criterionId: 'diabetes_readiness_bands',
    label: 'Diabetes readiness bands: READY ≥ 0.85 / PARTIALLY_READY ≥ 0.50',
    value: 'READY ≥ 0.85 / PARTIALLY_READY ≥ 0.50',
    appliesToUseCase: 'diabetes_risk_stratification',
    tier: 'customizable',
    configVersion: 'diabetes.config.json@0.1',
    ownedBy: 'Local clinical team',
  },
  {
    criterionId: 'site_display_band',
    label: 'Site-level display band: PARTIALLY_READY ≥ 0.85 of population READY',
    value: '≥ 0.85 of population READY',
    appliesToUseCase: 'all',
    tier: 'customizable',
    configVersion: 'scripts/fixture_content.mjs@0.1',
    ownedBy: 'Local clinical team',
  },
];

// ---------------------------------------------------------------------------
// PIPELINE_STAGES — the curated readiness arc for the under-the-hood view.
// Results shown in the demo are served from persistence; no stage copy
// implies live computation on stage. AI-assist appears ONLY at normalize and
// remediate, always with a human approving; score is the deterministic core.
// ---------------------------------------------------------------------------
export const PIPELINE_STAGES = [
  {
    stageId: 'ingest',
    label: 'Ingest',
    description: 'Raw EHR and device extracts land in the staging tier exactly as delivered — nothing is altered on arrival.',
  },
  {
    stageId: 'parse',
    label: 'Parse',
    description: 'Records are read against the expected structure; malformed records are identified at the earliest possible point and traced to their source feed.',
  },
  {
    stageId: 'normalize',
    label: 'Normalize',
    description: 'Values are standardized into the shared model; unambiguous corrections can be AI-assisted, with a human approving every change.',
  },
  {
    stageId: 'score',
    label: 'Score',
    description: 'The deterministic core: every check, variable, and pathway is evaluated against the configured criteria — same inputs, same results, every time.',
  },
  {
    stageId: 'readiness_report',
    label: 'Readiness report',
    description: 'Results are organized per use case: what is ready, what is blocked, and exactly why.',
  },
  {
    stageId: 'remediate',
    label: 'Remediate',
    description: 'Each blocker is routed to the role that can fix it; where an AI-suggested fix applies, it waits for human approval.',
  },
  {
    stageId: 'rescore',
    label: 'Re-score',
    description: 'Remediated data goes back through the same deterministic scoring path, and the readiness report is refreshed from the stored results.',
  },
  {
    stageId: 'unlock',
    label: 'Unlock',
    description: 'Use cases whose criteria are met come online — the weekly stratification review and downstream reporting run on data that is fit for purpose.',
  },
];

// ---------------------------------------------------------------------------
// Self-test: node scripts/fixture_content.js --selftest
// ---------------------------------------------------------------------------

// The Section 3 FAILing-check set (gate_fx_precheck.txt), frozen.
const EXPECTED_CHECKS = [
  'device_derived_metric_consistency_cgm',
  'device_patient_linkage_cgm',
  'device_temporal_density_cgm_14d',
  'fitness_recency_a1c',
  'layer1_notnull_fields_encounters',
  'layer1_notnull_fields_smoking',
  'layer2_ranges_numeric_a1c',
  'layer2_value_standards',
  'layer3_mapped_values',
  'layer5_date_concordance',
  'layer5_date_concordance_a1c',
];

// FAIL-status observed_value samples, copied VERBATIM from
// gate_fx_precheck.txt Section 7b (one per check).
const SELFTEST_SAMPLES = {
  device_derived_metric_consistency_cgm:
    'stored=65.00%; recomputed=80.54%; abs_diff=15.54pp; density=0.9660 (3895/4032)',
  device_patient_linkage_cgm:
    'joinable_cgm_readings=0 (expected >0)',
  device_temporal_density_cgm_14d:
    'density=0.5694 (2296/4032, floor 0.70)',
  fitness_recency_a1c:
    'window=20240514..20241114; in_window=0 of 8; latest_a1c=20241223',
  layer1_notnull_fields_encounters:
    'nonconformant=1/5: ENC000395[class,provider_id]',
  layer1_notnull_fields_smoking:
    'qualifying_smoking_rows=0 (0 total smoking rows)',
  layer2_ranges_numeric_a1c:
    '{"min":2,"max":20,"units":"%","total":8,"in_range":7,"out_of_range":[{"value":"81.0","observation_id":"OBS000095"}]}',
  layer2_value_standards:
    '{"total":8,"valid":7,"invalid_codes":"E1X.21"}',
  layer3_mapped_values:
    '{"total":13,"valid":12,"invalid_codes":"999999"}',
  layer5_date_concordance:
    '{"max_delta_days":0,"total":36,"concordant":33,"discordant":[{"encounter_id":"ENC000246","encounter_date":"20240506","facts":[{"fact_id":"MED000286","fact_date":"20240605"},{"fact_id":"OBS000174","fact_date":"20240605"},{"fact_id":"OBS001002","fact_date":"20240605"}]}]}',
  layer5_date_concordance_a1c:
    '{"max_delta_days":0,"qualifying":5,"concordant":4,"discordant":[{"obs_date":"20240605","encounter_id":"ENC000246","encounter_date":"20240506","observation_id":"OBS000174"}]}',
};

const SESSION_DEPENDENT_RECOMMENDATION = ['layer5_date_concordance', 'layer5_date_concordance_a1c'];
const REQUIRED_C_OVERRIDES = [
  'layer5_date_concordance',
  'layer5_date_concordance_a1c',
  'device_temporal_density_cgm_14d',
];

function selftest() {
  const failures = [];
  const assert = (condition, message) => {
    if (!condition) failures.push(message);
  };

  // 1a. Key set is exactly the Section 3 FAILing-check set.
  const keys = Object.keys(CHECK_CONTENT).sort();
  const expected = [...EXPECTED_CHECKS].sort();
  assert(
    JSON.stringify(keys) === JSON.stringify(expected),
    `CHECK_CONTENT keys != Section 3 set; got [${keys}], expected [${expected}]`,
  );

  // 1b. Template placeholder discipline (base templates AND overrides).
  const optIn = new Set(EVIDENCE_EXAMPLE_CHECKS);
  for (const [name, entry] of Object.entries(CHECK_CONTENT)) {
    const whatFaileds = [entry.whatFailed];
    for (const override of Object.values(entry.overrides ?? {})) {
      if (override.whatFailed) whatFaileds.push(override.whatFailed);
    }
    for (const template of whatFaileds) {
      assert(template.includes('{failCount}'), `${name}: a whatFailed template lacks {failCount}`);
      if (optIn.has(name)) {
        assert(
          template.includes('{evidenceExample}'),
          `${name}: opt-in whatFailed template lacks {evidenceExample}`,
        );
      } else {
        assert(
          !template.includes('{evidenceExample}'),
          `${name}: excluded whatFailed template contains {evidenceExample}`,
        );
      }
    }
    assert(
      typeof entry.whatUnlocks === 'string' && entry.whatUnlocks.length > 0,
      `${name}: whatUnlocks missing`,
    );
    assert(typeof entry.renderEvidence === 'function', `${name}: renderEvidence missing`);
    assert(/^bug_[1-9]$/.test(entry.bugId), `${name}: bugId ${entry.bugId} not bug_1..bug_9`);
  }

  // 1c. Session-dependent recommendationType entries.
  for (const name of SESSION_DEPENDENT_RECOMMENDATION) {
    const rt = CHECK_CONTENT[name]?.recommendationType;
    assert(
      rt && typeof rt === 'object' && rt.B === 'ai_suggested_fix' && rt.C === 'route_to_stakeholder',
      `${name}: recommendationType is not { B: 'ai_suggested_fix', C: 'route_to_stakeholder' }`,
    );
  }

  // 1c2. Every CRITERIA entry carries a non-empty string value field
  // (spec §7.3 ConfiguredCriterion conformance).
  for (const criterion of CRITERIA) {
    assert(
      typeof criterion.value === 'string' && criterion.value.length > 0,
      `CRITERIA ${criterion.criterionId}: value field missing or empty`,
    );
  }

  // 1d. Required C overrides.
  for (const name of REQUIRED_C_OVERRIDES) {
    assert(
      CHECK_CONTENT[name]?.overrides?.C
        && (CHECK_CONTENT[name].overrides.C.whatFailed || CHECK_CONTENT[name].overrides.C.whatUnlocks),
      `${name}: required overrides.C missing`,
    );
  }

  // 2. renderEvidence against the verbatim Section 7b FAIL samples.
  console.log('--- renderEvidence against Section 7b FAIL samples ---');
  for (const name of EXPECTED_CHECKS) {
    try {
      const rendered = CHECK_CONTENT[name].renderEvidence(SELFTEST_SAMPLES[name]);
      assert(
        typeof rendered === 'string' && rendered.length > 0,
        `${name}: renderEvidence returned a non-string/empty result`,
      );
      console.log(`${name}\n  -> ${rendered}`);
    } catch (err) {
      failures.push(`${name}: renderEvidence threw on its own sample — ${err.message}`);
    }
  }

  // 2b. Renderers throw (named) on unparseable input — never pass through.
  for (const name of EXPECTED_CHECKS) {
    let threw = false;
    try {
      CHECK_CONTENT[name].renderEvidence('garbage-that-matches-no-shape');
    } catch (err) {
      threw = err.message.includes(name);
    }
    assert(threw, `${name}: renderEvidence did not throw a named error on unparseable input`);
  }

  if (failures.length > 0) {
    console.error(`\nSELFTEST FAILED — ${failures.length} assertion(s):`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log(`\nSELFTEST PASSED — ${EXPECTED_CHECKS.length} checks, all assertions green.`);
  process.exit(0);
}

if (process.argv.includes('--selftest')) {
  selftest();
}
