// src/recommendations/scripted.ts
// The authored surface for the recommendation seam (Demo UI/UX Spec §10).
// Copy disciplines apply: plain language, no em dashes, no raw pathway
// names, local-team attribution. Content mirrors the conventions of
// scripts/fixture_content.mjs (the fixture-side authored surface); this
// file owns the recommendation bodies the scripted AGENT_MODE serves.
//
// Keyed by checkName. Each entry maps recommendationType -> body; the two
// layer5 date checks carry both variants (their type flips between the B
// and C fixtures), every other entry carries exactly one. The lookup
// throws named errors on unknown checkName or on a blocker whose
// recommendationType has no matching body (fixture-drift guard: never a
// generic or silently-wrong recommendation).

import type { Blocker, ProposedAction, RecommendationType } from '../domain/types';

export interface ScriptedBody {
  remediationPlainLanguage: string;
  rationale: string;
  // Non-null only on ai_suggested_fix bodies.
  proposedAction: ProposedAction | null;
}

type ScriptedEntry = Partial<Record<RecommendationType, ScriptedBody>>;

export class UnknownScriptedCheckError extends Error {
  name = 'UnknownScriptedCheckError';
}

export class ScriptedTypeMismatchError extends Error {
  name = 'ScriptedTypeMismatchError';
}

const SCRIPTED: Record<string, ScriptedEntry> = {
  layer3_mapped_values: {
    ai_suggested_fix: {
      remediationPlainLanguage:
        "Three medication records carry codes that are not valid RxNorm concepts. Each has a clear valid equivalent identifiable from the medication details recorded alongside it. The suggested fix maps each invalid code to its matching RxNorm concept, stored as a new versioned correction. The original record is never altered.",
      rationale:
        "Care coordination depends on medication lists that other systems can read, and an invalid code makes the record unusable in exchange. The mapping is deterministic, so it is a strong candidate for a suggested fix with human review.",
      proposedAction: {
        summary:
          "Apply the three suggested RxNorm mappings as versioned corrections, pending your review.",
        targetCheckName: 'layer3_mapped_values',
        proposedValue: "999999 → 847191, INVALID01 → 314076, 00000 → 617310",
        expectedOutcome:
          "On re-score the medication code no longer blocks Care Coordination for the affected patients.",
      },
    },
  },

  layer2_value_standards: {
    ai_suggested_fix: {
      remediationPlainLanguage:
        "Three diagnosis records carry codes that are not valid ICD-10: one malformed, one non-existent, and one legacy ICD-9 code. Each maps cleanly to a valid ICD-10 code consistent with the patient's documented conditions, stored as a versioned correction alongside the untouched original.",
      rationale:
        "Downstream coordination and reporting read diagnoses by code, not by prose. These three errors have unambiguous valid targets, which is what makes a suggested fix appropriate here where a genuinely uncertain diagnosis would instead route to the clinical team.",
      proposedAction: {
        summary:
          "Apply the three suggested ICD-10 corrections as versioned records, pending your review.",
        targetCheckName: 'layer2_value_standards',
        proposedValue: "E1X.21 → E11.9, Z99.99X → I10, 410.9 → I10",
        expectedOutcome:
          "On re-score the condition code no longer blocks Care Coordination for the affected patients.",
      },
    },
  },

  layer2_ranges_numeric_a1c: {
    ai_suggested_fix: {
      remediationPlainLanguage:
        "Three A1C results are recorded as 81.0, 93.0, and 66.0 percent, values that are not physiologically possible. They are consistent with results reported on the international mmol/mol scale but entered in the percent field. The suggested fix re-expresses each value on the percent scale, pending confirmation against the source lab record by a clinical reviewer.",
      rationale:
        "A value this far outside the plausible range is almost always a units or entry error rather than a true result. Because the correction changes a clinical value, it is suggested only, and a clinical reviewer confirms against the source before anything is recorded.",
      proposedAction: {
        summary:
          "Record the unit-corrected A1C values as versioned corrections after clinical confirmation against the source lab record.",
        targetCheckName: 'layer2_ranges_numeric_a1c',
        proposedValue: "81.0 → 9.6 %, 93.0 → 10.7 %, 66.0 → 8.2 % (re-read as mmol/mol entries)",
        expectedOutcome:
          "Once confirmed and re-scored, the implausible values stop degrading A1C readiness for the three affected patients.",
      },
    },
  },

  layer5_date_concordance_a1c: {
    ai_suggested_fix: {
      remediationPlainLanguage:
        "Several lab results carry dates written in month/day/year format instead of the standard form, so they no longer agree with the visit they belong to. The suggested fix rewrites each slash-format date into the standard form, stored as a versioned correction.",
      rationale:
        "The format rewrite is mechanical and loses no information, which makes it safe to suggest. Any record whose date disagrees with its visit for reasons beyond formatting is deliberately excluded and remains flagged for source confirmation.",
      proposedAction: {
        summary:
          "Normalize the slash-format lab dates to the standard form as versioned corrections, pending your review.",
        targetCheckName: 'layer5_date_concordance_a1c',
        proposedValue: "MM/DD/YYYY dates rewritten to YYYYMMDD",
        expectedOutcome:
          "On re-score the format mismatches clear; records needing source confirmation remain flagged as open work items.",
      },
    },
    route_to_stakeholder: {
      remediationPlainLanguage:
        "The format errors in these lab dates have already been corrected. What remains are records whose dates disagree with their visit in ways no rule can resolve. Each needs confirmation against the source system before a corrected date can be recorded.",
      rationale:
        "At this point every safe automatic correction has been applied. Writing a guessed date would trade a visible gap for an invisible error, which is worse. Source confirmation is the remaining path, so this routes as a work item.",
      proposedAction: null,
    },
  },

  layer5_date_concordance: {
    ai_suggested_fix: {
      remediationPlainLanguage:
        "Seven encounter dates disagree with their linked records. Four are format errors, dates written month/day/year, and can be rewritten to the standard form by rule. Three cannot be fixed by rule and are routed separately for source confirmation.",
      rationale:
        "Reporting integrity depends on dates that agree across the record. The four format errors are mechanical and safe to correct; the remaining three are ambiguous or impossible values where a rule that guessed could write a wrong date into the reporting record, so they stay with the responsible team.",
      proposedAction: {
        summary:
          "Normalize the four format-error encounter dates (ENC000187, ENC000194, ENC000205, ENC000207) as versioned corrections, pending your review.",
        targetCheckName: 'layer5_date_concordance',
        proposedValue: "Four encounter dates: MM/DD/YYYY rewritten to YYYYMMDD",
        expectedOutcome:
          "On re-score, four of the seven date mismatches clear; three records remain flagged for source confirmation.",
      },
    },
    route_to_stakeholder: {
      remediationPlainLanguage:
        "Four of the seven mismatched encounter dates were corrected by rule. The remaining three cannot be: one is an ambiguous day-month transposition where both readings are plausible dates, and two carry impossible month values. Each needs confirmation against the source system before a corrected date can be recorded.",
      rationale:
        "These three records are exactly the cases automation must not guess at. A plausible-looking wrong date in a reporting record is harder to catch than a flagged gap, so the honest remediation is source confirmation by the responsible team.",
      proposedAction: null,
    },
  },

  device_patient_linkage_cgm: {
    route_to_stakeholder: {
      remediationPlainLanguage:
        "Five patients' sensor data arrives under device identifiers that match no patient record, so their readings cannot be used. Building the identifier crosswalk is the remediation itself: the device feed is reconfigured upstream so each stream carries the correct patient identifier, with identity resolution confirming the matches.",
      rationale:
        "No automatic fix is safe here. Guessing which data stream belongs to which patient risks attaching one person's glucose readings to another's chart. The fix belongs upstream, where the identifiers are assigned, and the flagged streams stay quarantined until the linkage is confirmed.",
      proposedAction: null,
    },
  },

  device_temporal_density_cgm_14d: {
    route_to_stakeholder: {
      remediationPlainLanguage:
        "Eight patients' sensors reported far fewer readings than a reliable 14-day picture requires. The care team follows up with each patient to find the cause, whether sensor wear, device pairing, or transmission, and restores coverage going forward.",
      rationale:
        "Missing readings cannot be reconstructed, and glucose measures computed over sparse data would be misleading. The honest remediation is restoring coverage from here on, not repairing the past window, so this routes to the team who can act with the patient.",
      proposedAction: null,
    },
  },

  layer1_notnull_fields_smoking: {
    route_to_stakeholder: {
      remediationPlainLanguage:
        "Smoking status was never documented for six patients, and it is a required input for the hypertension review this data supports. The remediation is documentation at the point of care, or an intake workflow update so the question is captured at every visit.",
      rationale:
        "No system can fill in a clinical fact that was never collected, and inventing one would corrupt the record. Routing this as a documentation work item to the care team is the only correct path.",
      proposedAction: null,
    },
  },

  device_derived_metric_consistency_cgm: {
    route_to_stakeholder: {
      remediationPlainLanguage:
        "For three patients, the stored time-in-range value disagrees with the value recomputed from their raw sensor readings. The recomputation is available, but which computation method counts as authoritative for quality reporting is a governance decision, so this routes for a policy determination before any value is corrected.",
      rationale:
        "Different device manufacturers compute summary metrics differently, and reporting programs need one defensible method. Deciding that method is a governance question, not a data patch. Once decided, the corrected values follow mechanically from the raw readings.",
      proposedAction: null,
    },
  },

  layer1_notnull_fields_encounters: {
    route_to_stakeholder: {
      remediationPlainLanguage:
        "Three recent encounter records arrived with required structural fields empty, including the encounter class. This is a feed conformance problem: the malformed records are traced back to the sending interface and the feed configuration is corrected at the source.",
      rationale:
        "Patching individual records would leave the defect in place producing new ones. Structural conformance is fixed where the feed is produced, which is why this routes to the data node rather than to a record-level correction.",
      proposedAction: null,
    },
  },

  fitness_recency_a1c: {
    route_to_stakeholder: {
      remediationPlainLanguage:
        "Three patients' most recent A1C is older than the six-month window this review requires. A stale lab needs collection, not data repair: the care team orders a current A1C at the next visit, or confirms the patient is adequately monitored by sensor in the meantime.",
      rationale:
        "Where current sensor data exists, the weekly review can still run for these patients, but the stale lab stays on the work ledger until a current value is collected. Keeping both truths visible, care unlocked now and the gap tracked to closure, is the point of routing this as a work item.",
      proposedAction: null,
    },
  },
};

// Selects the authored body for a blocker: entry by checkName, variant by
// the blocker's recommendationType. Throws rather than degrade.
export function selectScriptedBody(blocker: Blocker): ScriptedBody {
  const entry = SCRIPTED[blocker.checkName];
  if (!entry) {
    throw new UnknownScriptedCheckError(
      `No scripted recommendation entry for checkName '${blocker.checkName}' (blocker '${blocker.blockerId}')`,
    );
  }
  const body = entry[blocker.recommendationType];
  if (!body) {
    throw new ScriptedTypeMismatchError(
      `Scripted entry for '${blocker.checkName}' has no '${blocker.recommendationType}' body ` +
        `(available: ${Object.keys(entry).join(', ')}); blocker '${blocker.blockerId}' drifted from the content map`,
    );
  }
  return body;
}
