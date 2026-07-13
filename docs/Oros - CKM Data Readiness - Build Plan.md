# Oros - CKM Data Readiness - Build Plan

Living document — versioned by git history.

**Project:** Oros CKM Data Readiness Infrastructure  
**Status:** Active build — persistence layer complete, condition module schema locked, scoring engine next. Scope governed by the June 25 POC Scope Lock (Diabetes-first, CKM infrastructure visible).  
**Last updated:** 2026-06-13 (added reference to Oros - Agentic Architecture & Automation Strategy in the Agentic Layer section; added Step 8 demo hygiene note to remove legacy Archia attribution from the agentic drawer. Prior update 2026-06-12: June 25 POC Scope Lock and multi-state strategic reframing — Option A confirmed, Clinical Quality + VBC Reporting display terminology, Implemented / Demonstrated (stub) / Architectural status vocabulary, agentic conditionality, multi-state deployment strategy and bridge infrastructure model. Prior update 2026-04-18: Condition Module Schema v0.1 locked; Step 7 expanded with sub-steps; Neon and synthetic dataset status clarified.)

> **Governing scope document:** `Oros - CKM Data Readiness - June 25 POC Scope Lock`. That document is the operational source of truth for what the June 25 demo delivers. This Build Plan implements it. Where the two appear to differ, the Scope Lock governs scope and this plan governs build sequence.

---

## Core Objective

Build a data readiness infrastructure POC that demonstrates:

```
Load Data → Normalize → Score → Surface Blockers → 
Remediate → Re-score → Unlock Analytics
```

This is the assess → report → respond pipeline. The two-phase readiness model (Foundational readiness, then Fit-for-purpose readiness) and the step definitions are canonical in Methodology Architecture, Section 6.

---

## Strategic Context

### Initial Deployment Strategy — Multi-State Rural Health
The CKM Data Readiness Infrastructure is being designed as a reusable implementation platform for rural and underserved healthcare organizations. It is built once and deployed opportunistically wherever motivated sites, funding, and implementation partners emerge. The POC targets a multi-state rural health deployment across three states: Kansas (active; the likely first deployment), Montana, and Colorado (pending release of the state rural health RFA). Oregon and other states pursuing rural health transformation initiatives remain future opportunities.

Initial deployments are expected to focus on a small number of highly engaged sites to validate:

- risk stratification workflows
- care coordination and specialist escalation pathways
- remote monitoring and longitudinal management workflows
- value-based care and clinical quality reporting

Target deployment hosts are ACOs and IDNs with direct clinic feeds. HIEs are positioned as supplementary data sources, not primary deployment hosts — HIEs are not operationally positioned to take on data quality remediation work. The infrastructure is designed to support direct clinic participation, regional referral networks, specialist centers, and state-level scaling pathways through HIEs or other designated organizations. The objective is a repeatable implementation model that can be adopted across multiple states and deployment contexts. See Architecture Decision Record (April 8, 2026) Decision 4 for full deployment host rationale.

### Designed for Multi-State and Global Reuse
The infrastructure is architected for reuse across clinical settings, regions, and health systems — nationally and internationally. No single location is the anchor; the same infrastructure is applicable wherever CKM data readiness gaps exist, including rural health initiatives across the United States and eventually internationally.

The infrastructure is intentionally designed as a bridge layer between local clinical operations and long-term state or regional infrastructure hosts. Early deployments may be operated through Oros-managed bridge infrastructure, with eventual transition of selected workflows, modules, and processes to HIEs, research networks, or other designated regional organizations. The goal is trusted open source assets optimized for reuse, with fair value attribution and governance controls.

### Bridge Infrastructure Model
The current deployment strategy assumes a temporary Oros-operated bridge environment that enables participating organizations to begin implementation without waiting for state HIEs, academic institutions, or regional hosts to establish the necessary infrastructure and governance structures.

The bridge environment:

- ingests clinical and device data
- performs readiness scoring and remediation
- supports risk stratification and care coordination workflows
- enables reporting and analytics

Long-term ownership and hosting decisions remain local. States, HIEs, health systems, and research organizations may choose to adopt selected infrastructure components, workflows, or operational processes following successful validation.

### Oros IP and Stewardship Model
Oros develops and maintains the core CKM Data Readiness Infrastructure as shared open infrastructure. Licensing, stewardship, attribution, exclusivity, and the boundary between core and local adaptations are governed by the **Oros Collaboration Framework**, which is the authoritative source for these terms. In summary: the core is licensed under the Apache License 2.0 and stewarded by Oros; no single collaborating institution owns or controls the core assets; contributors are attributed individually (see `Oros_ATTRIBUTION.md`); and generalized components developed in the course of local adaptations are contributed back to the core. These conditions apply to all institutional collaborators.

### Methodology Operating Principle
The platform makes two data paths fit for purpose: the device path powers stratification that sites can act on now, and EHR remediation unblocks the downstream care coordination and clinical quality + VBC reporting that make the care model complete. A human is in the loop at every moment; in the weekly review the platform orders and surfaces an instrumented population for clinical decision, it does not enroll, identify, or act. Full automation is roadmap-only. What counts as fit-for-purpose is workflow-defined and configured by the local team: foundational criteria anchored to national standards, the rest customizable as guidelines evolve. See the Methodology Architecture (Section 6) for the canonical statement.

---

## State of Each Layer — What Needs Updating and What Does Not

This section directly addresses what the condition module schema lock means for each layer of the stack.

### Neon Database Schema
**Needs one additive migration. No existing tables change.**

The existing 18-table schema (Raw → Normalized → Check Results/Patches → Use-Case Ready) is untouched. Three new tables must be added in a new migration:

| New Table | Purpose | Alters existing? |
|-----------|---------|-----------------|
| `condition_modules` | Stores loaded condition module metadata (one row per condition) | No |
| `use_case_specifications` | Stores use case specifications with JSONB columns for pathway, variable, and computation config | No |
| `use_case_pathway_results` | Stores pathway evaluation result per patient per use case per session (primary_pass / fallback_pass / no_valid_pathway) | No |

Table definitions are specified in the Condition Module Schema document (Section 4). The new migration adds these three tables, their indexes, and the session-aware FK pattern consistent with the rest of the schema.

### Synthetic Datasets (CSV Files)
**No changes needed. Existing datasets A, B, and C are correct as loaded.**

The six-bug set is unchanged. A1C observations (LOINC 4548-4) are already present in Dataset A for the diabetes cohort — the fallback pathway has the data it needs. The new checks introduced by the condition module schema (layer1_notnull_fields_a1c, layer2_ranges_numeric_a1c, layer5_date_concordance_a1c) evaluate existing observation records. No new CSV files are required.

### Scoring Engine
**Three existing check files are correct. Five new check files must be built.**

The three existing checks (device_patient_linkage_cgm, device_temporal_density_cgm_14d, layer1_notnull_fields_smoking) require no changes. Five new check implementations are on the critical path before the Diabetes Risk Stratification pipeline produces complete results:

| Check File | Priority | Purpose |
|-----------|---------|---------|
| `layer6_denom_riskstrat.js` | Critical — gates all patients | Evaluates eligibility (denominator criteria) |
| `device_derived_metric_consistency_cgm.js` | High — Bug 6 | TIR recomputation vs stored value |
| `layer1_notnull_fields_a1c.js` | High — A1C fallback pathway | A1C not-null conformance |
| `layer2_ranges_numeric_a1c.js` | High — A1C fallback pathway | A1C value plausibility range |
| `layer5_date_concordance_a1c.js` | Medium — A1C fallback pathway | A1C result date concordance |

### Scoring Aggregation Logic
**Not yet built. Must be built as part of Step 7.**

The individual check files write rows to `check_results`. Nothing yet aggregates those rows into `variable_readiness_scores` or `use_case_readiness`. This is the second half of the scoring engine. The aggregation logic, pathway evaluation, and threshold band application are all defined in the Condition Module Schema (Sections 2 and 6) and must be implemented.

### conditions/ Directory and diabetes.config.json
**Directory does not yet exist. Config file must be authored and validated against the locked schema.**

The `conditions/diabetes/diabetes.config.json` file must be created from the locked Condition Module Schema. This is the governance artifact the engine loads at startup.

---

## Current Build State (April 2026)

### Completed
- ✅ GitHub repo: `Oros-AI/oros-ckm-data-readiness`, branch `ckm-poc-build`
- ✅ Neon database: `ckm_readiness` — 21 tables, 38 FK constraints, all indexes
- ✅ Four-tier schema: Raw → Normalized → Check Results/Patches → Use-Case Ready
- ✅ Data loading scripts built and verified
- ✅ All three datasets loaded: A (clean), B (buggy), C (remediated)
- ✅ Core documentation locked and committed
- ✅ Condition Module Schema v0.1 locked (`Oros - CKM Data Readiness - Condition Module Schema.md`)
- ✅ Architecture Specification v1.2 locked
- ✅ Check implementations built and gate-verified (as of 2026-07-07): layer6_denom_riskstrat (7d), device_derived_metric_consistency_cgm (7e), device_patient_linkage_cgm and device_temporal_density_cgm_14d (7e2). (The earlier "three check implementations running" claim was inaccurate — none existed in April; layer1_notnull_fields_smoking remains unbuilt, Step 7f.)

### Next Steps

**Step 7: Scoring Engine and Condition Module — Active**

Step 7 is the critical path. All sub-steps must complete before Step 8 can begin.

| Sub-step | Description | Depends on |
|----------|-------------|-----------|
| 7a | Neon migration — add 3 condition module tables (condition_modules, use_case_specifications, use_case_pathway_results) | Nothing |
| 7b | Config file loader — reads diabetes.config.json, loads into DB tables at startup | 7a |
| 7c | Author diabetes.config.json from locked Condition Module Schema. Then author three stub condition modules: hypertension_risk_stratification (layer1_notnull_fields_smoking, population: ICD-10 I10), care_coordination (layer3_mapped_values + layer2_value_standards, population: active DM or HTN diagnosis), vbc_reporting (layer5_date_concordance, population: qualifying encounters). Stubs use simple boolean aggregation — any check FAIL = NOT_READY, no pathway logic. Each stub validates the config loader works generically, not just for diabetes. **Status per Scope Lock: these three are Demonstrated (stub) — real checks, bugs, and routing, but limited execution logic. They are retained (Option A) to carry Bugs 3/4/5 and prove extensibility. Do not invest in full use-case logic for them; that is out of June 25 scope.** | 7a |
| 7d | Build layer6_denom_riskstrat.js — eligibility evaluation, writes to check_results, generates work items on FAIL | 7b, 7c |
| 7e | Build device_derived_metric_consistency_cgm.js — TIR recomputation vs stored value | 7b, 7c |
| 7e2 | Build device_patient_linkage_cgm.js + device_temporal_density_cgm_14d.js — Bugs 1, 2 (device identity linkage + 14-day temporal density) | 7b, 7c |
| 7f | Build layer1_notnull_fields_a1c.js, layer2_ranges_numeric_a1c.js, layer5_date_concordance_a1c.js (diabetes A1C pathway checks), layer3_mapped_values.js, layer2_value_standards.js, layer5_date_concordance.js (EHR-level checks for Bugs 4 and 5, required by care_coordination and vbc_reporting stubs), and layer1_notnull_fields_smoking.js (Bug 3, required by the hypertension_risk_stratification stub) — seven checks | 7b, 7c |
| 7g | Build scoring aggregation — variable_readiness_scores writer (weighted average per variable) | 7d, 7e, 7e2, 7f |
| 7h | Build pathway evaluation — use_case_pathway_results writer (primary_pass / fallback_pass / no_valid_pathway) | 7g |
| 7i | Build use_case_readiness writer — fitness_score, overall_status, pathway-aware required/blocking variables | 7h |
| 7j | Build remediation_work_items generator — one row per FAIL check using remediation_defaults from config | 7i |
| 7k | End-to-end test: run scoring engine against Dataset B, verify all 6 bugs surface with correct use case blocking, phenotypes, and stakeholder routing | 7d–7j |
| 7l | Run scoring engine against Dataset C, verify use cases unlock correctly and pathway results update | 7k |

**Step 8 Increment 2 — ✅ COMPLETE (2026-07-12; commits `674cc66` render-gate harness, `35b94e7` theme/tokens.ts, `38c77be` use-case front door).** Front door live: capability cards, readiness chips, three-state badges, four-facts blocker panels, configured-criteria surfacing — all list-driven from the committed fixtures via the Increment 1 provider; G2-1..G2-17 gates green plus visual review on all three sessions.

**Step 8 Increments 3 & 4 — ✅ COMPLETE (2026-07-13).** Increment 3 (`0cd94d1` recommendation seam + scripted content map, `54a1674` RemediationDrawer + session-keyed decisions, `a1408d4` legacy `agents/*` deletion + Archia scrub — the Step 8 demo-hygiene item below is DONE; Archia grep across src/ is zero). Increment 4 (`26c7d01` PipelineView core, `214c0f9` LEAD_VIEW + Capabilities/Under-the-hood toggle, `e2ea4aa` arc one-row layout + status legend, `5c51890` 19-file legacy wizard deletion + gate transition + package rename to `oros-ckm-data-readiness`). Suite 60/60; `npm run build` green; plain `tsc` is the typecheck gate. Ratified decisions live in CLAUDE.md §3 increment blocks. **Next: Increment 5 (arc polish: reset clears decisions, session-identity signposting, annotation-chip treatment, v0.1-copy ledger decisions).**

**Fixture-export step — ✅ COMPLETE (2026-07-12; commits `ebb67c3` fx-1 content map, `8cec258` fx-2 exporter + fixtures).** `scripts/fixture_content.mjs` + `scripts/export_fixtures.mjs` serialize engine output to `src/data/fixtures/session-{a,b,c}.json` per the UI/UX spec §7.3/§8.3 contract (deterministic, export-twice byte-identical). These fixtures are the Step 8 `DATA_SOURCE='fixtures'` source. **Next: Step 8 Increment 1 continues (`domain/types.ts`, `data/provider.ts`) against the committed fixtures.** Ratified decisions and the production ledger live in CLAUDE.md §3 (Fixture-export block) and the Demo-to-Production Bridge doc.

**Step 8: UI/UX Revamp**  
Preserve drawer pattern, remap to CKM architecture. Inputs: completed scoring output tables (Step 7 complete), locked demo narrative. Handle in UI Claude project. **Demo hygiene: remove the legacy "powered by Archia" attribution from the agentic drawer (grep the legacy frontend for "Archia" and "powered by" — may appear as label, tooltip, alt text, or comment). Archia is no longer a leading partner; do not show vendor attribution in the demo. Replace with a function-based label (e.g. "agentic recommendation") or nothing.**

**Step 9: Agentic Layer**  
Claude API POC, pluggable harness interface. **Conditional per Scope Lock: agentic recommendation is Demonstrated only if the deterministic pathway (Step 7) completes end-to-end first. It is not a guaranteed June 25 deliverable, and if the deterministic path is not complete it is not shown — this does not count as a missed deliverable.** Optional — deterministic pipeline must pass Step 7 end-to-end test first. Strong demo candidates: Bug 1 (identity crosswalk proposal), Bug 4 (code correction), Bug 5 (date correction). See Agentic Layer Architecture document.

**Step 10: Vercel Deployment**

---

## Scoring Engine Design

Config-driven architecture separates engine logic from clinical thresholds. ADR Decision 2 (April 8, 2026) establishes Option C: a config file as the human-facing interface loaded into the database as the runtime representation read by the check engine.

**Condition module schema: LOCKED.** The JSON structure of `diabetes.config.json` is defined in `Oros - CKM Data Readiness - Condition Module Schema.md` (v0.1, April 2026). That document is the authoritative contract for the config file structure and the scoring engine behavior contract. Key elements:

- `eligibility_checks` — layer6_denom_riskstrat evaluated first; failures visible in check_results and remediation_work_items
- `variable_pathways` — CGM Glucose primary, A1C fallback; pathway result written to use_case_pathway_results
- `variables` — per-variable checks with thresholds, priority weights, and remediation_defaults (phenotype, responsible_role, action_required)
- `computation` — pathway_weighted_average for continuous fitness_score (0–1); threshold_bands for status label (READY / PARTIALLY_READY / NOT_READY)

**Scoring engine behavior contract** is specified in Condition Module Schema Section 6. Seven observable behaviors per patient per use case per demo session. The engine must satisfy that contract — it is a test specification, not engine design.

**Thresholds and weights are working placeholders.** CGM weights (0.40/0.40/0.20), A1C weights (0.50/0.30/0.20), and threshold bands (READY ≥ 0.85, PARTIALLY_READY ≥ 0.50) are sufficient for POC. Do not block build on clinical sign-off.

**Directory structure (target state after Step 7):**

```
scoring/
├── index.js                                   ← entry point: node index.js <session_id>
├── lib/
│   ├── db.js                                  ← pg pool from CKM_DIRECT env var
│   ├── writer.js                              ← idempotent upsert (INSERT ... ON CONFLICT DO UPDATE) per check+session
│   ├── config_loader.js                       ← loads conditions/*.config.json into DB (Step 7b)
│   ├── aggregator.js                          ← variable_readiness_scores writer (Step 7g)
│   ├── pathway_evaluator.js                   ← use_case_pathway_results writer (Step 7h)
│   ├── use_case_writer.js                     ← use_case_readiness writer (Step 7i)
│   └── work_item_generator.js                 ← remediation_work_items generator (Step 7j)
└── checks/
    ├── device_patient_linkage_cgm.js          ✅ implemented (Step 7e2 — Bug 1)
    ├── device_temporal_density_cgm_14d.js     ✅ implemented (Step 7e2 — Bug 2)
    ├── layer1_notnull_fields_smoking.js       ⬜ Step 7f (Bug 3 — Hypertension RS)
    ├── layer6_denom_riskstrat.js              ✅ implemented (Step 7d)
    ├── device_derived_metric_consistency_cgm.js ✅ implemented (Step 7e)
    ├── layer1_notnull_fields_a1c.js           ⬜ Step 7f
    ├── layer2_ranges_numeric_a1c.js           ⬜ Step 7f
    ├── layer5_date_concordance_a1c.js         ⬜ Step 7f
    ├── layer3_mapped_values.js                ⬜ Step 7f (Bug 4 — Care Coordination)
    ├── layer2_value_standards.js              ⬜ Step 7f (Bug 4 — Care Coordination)
    └── layer5_date_concordance.js             ⬜ Step 7f (Bug 5 — VBC Reporting)

conditions/
└── diabetes/
│   └── diabetes.config.json                   ✅ implemented (Step 7c — full schema)
└── hypertension/
│   └── hypertension.config.json               ✅ implemented (Step 7c — stub, HTN RS, Bug 3)
└── care_coordination/
│   └── care_coordination.config.json          ✅ implemented (Step 7c — stub, Care Coord., Bug 4)
└── vbc_reporting/
    └── vbc_reporting.config.json              ✅ implemented (Step 7c — stub, VBC Reporting, Bug 5)
```

---

## Demo Narrative — Locked

**Scope: Diabetes-first, CKM infrastructure visible (Option A, per June 25 POC Scope Lock).** The full six-bug narrative is retained. Three bugs block Diabetes Risk Stratification directly (Bugs 1, 2, 6); three exercise the broader infrastructure through stub modules (Bug 3 → Hypertension RS stub, Bug 4 → Care Coordination stub, Bug 5 → Clinical Quality + VBC Reporting stub). The six-bug arc is retained deliberately: the multi-stakeholder routing it produces is what makes this a data readiness *infrastructure* demo rather than a diabetes-only data-quality tool. Diabetes Risk Stratification is the live, narrated use case; the stubs make CKM extensibility visible.

The POC demo shows this arc end-to-end across three dataset states.

**Dataset B → Score → Surface → Dataset C → Re-score → Unlock**

| Bug | Check | Use Case Blocked | Phenotype | Responsible Stakeholder |
|-----|-------|-----------------|-----------|------------------------|
| 1 — Device identity linkage failure | device_patient_linkage_cgm | Diabetes Risk Stratification | Identity Linkage Failure | Technology Vendor |
| 2 — CGM temporal density below threshold | device_temporal_density_cgm_14d | Diabetes Risk Stratification | Device Temporal Density Gap | Primary Care Site (adherence) / Technology Vendor (transmission gap) |
| 3 — Missing smoking status | layer1_notnull_fields_smoking | Hypertension Risk Stratification | Missing Required Variable | Primary Care Site |
| 4 — Invalid terminology codes | layer3_mapped_values / layer2_value_standards | Care Coordination | Invalid Terminology Code | Technology Vendor (source fix) |
| 5 — Date format errors in encounters | layer5_date_concordance | Clinical Quality + VBC Reporting | Date Format Non-Conformance | Technology Vendor (HL7 config) |
| 6 — TIR derived metric mismatch | device_derived_metric_consistency_cgm | Diabetes Risk Stratification | Derived Metric Concordance Failure | Policy/Regulatory (governance escalation) |

For each bug the demo shows: what failed, which use case is blocked, who is responsible, what action is required, and what capability unlocks after remediation.

> **Display label vs. frozen enum.** "Clinical Quality + VBC Reporting" is a presentation-layer label only. The underlying `vbc_reporting` enum value, the `vbc_reporting.config.json` filename, and the `use_case_name` string are frozen and must not change. The rename applies to display names, descriptions, document prose, and demo screens — never to schema, config, loader, database, or check names. See June 25 POC Scope Lock §10 (Frozen Strings).

> **Implementation status vocabulary.** This plan uses the three-state model defined in the June 25 POC Scope Lock §7: **Implemented** (full use-case execution logic exists and runs — Diabetes RS), **Demonstrated (stub)** (real checks, bugs, routing, and outputs run, but limited execution logic — the three stub modules above), and **Architectural** (architecture and data exist, no executing use case — Hypertension and Heart Failure as conditions). The full status table is maintained in the Scope Lock and is not duplicated here, to avoid drift.

---

## Bug-Set Expansion — BUILT (Add-1/2/3 live as of 2026-07-11)

> **Status: BUILT.** The three committed additions (Add-1/2/3) were built in the ext window (2026-07-11): dataset seeds live in Dataset B (Add-1/Add-3, resolved/unresolved in C per each entry), detection checks live in the engine, config entries loaded, routing verified at the ext-5/ext-5b gates. **Nine seeded bugs across 13 checks; Dataset A fully clean at check and use-case levels.** Authoritative row-level detail: `Oros - CKM Data Readiness - Dataset B Bug Reconciliation.md` entries 7/8/9. The canonical `Synthetic Dataset Specification` (Track 2, Drive-canonical) still describes the original six bugs — update it at the next Drive-doc touch. Add-4 and denominator-validity remain funded-phase.

**Built summary (owning check → targets → routing):**

- **Add-1 → `layer1_notnull_fields_encounters`** (vbc_reporting, new "Encounter Record" variable on `encounter_date_primary`). Seeds: ENC000392/395/401/408/421/427 (`class` + `provider_id` emptied, B only) across PAT000042/043/045; the audit is windowed to the vbc qualifying-encounters lookback, so the three in-window garbles (ENC000395/408/427) carry the FAILs. Routing: Structural Feed Non-Conformance → Regional Data Node. Resolved in C.
- **Add-2 → `fitness_recency_a1c`** (diabetes_risk_stratification, A1C variable; weights rebalanced 0.40/0.24/0.16/0.20). Targets: PAT000012/022/050 — naturally stale A1C (no seed rows; the "seed" is the deliberately absent recency backfill for exactly these three). FAILs in B and C — unresolved in C by design (a stale lab needs collection, not data repair). Routing: Stale Required Lab → Primary Care Site.
- **Add-3 → `layer2_ranges_numeric_a1c`** (existing check; new FAIL surface). Seeds: OBS000095/185/255 values garbled to 81.0/93.0/66.0 `%` (B only) on PAT000011/023/049. Resolved in C. Routing: Provider Input Error → Primary Care Site.

**Purpose.** The current six seeded bugs are device-heavy and content-skewed (device: Bugs 1, 2, 6; EHR: Bug 3 missing field, Bug 4 invalid codes, Bug 5 date format). They under-represent Foundational-readiness (structural) failures and Fit-for-purpose-readiness (recency/availability) failures that dominate real EHR data and that make the two-phase readiness model visible in the demo rather than only narrated. The additions trace the diabetes operational arc: risk monitoring of the diabetic population, then care delivery, then value-based-care reporting.

### Three committed additions (BUILT — design rationale retained below)

**Add-1. CSV-structural conformance failure — Foundational readiness (structural).** The seeded defect is a structural/conformance failure at the **CSV level** — a malformed structural field / unparseable row structure — detected at the Load/Normalize step and routed to the source feed owner ("reconfigure the feed at the source"); detected earliest, most automatable notification. **HL7v2 USCDI-v3 parse-failure is the production framing** carried in deck/voiceover, *not* a literal parse in the POC: the pipeline loads CSV, not HL7v2, and a true HL7v2 parse layer would be new machinery out of scope. Credibility anchor for the voiceover: structural parse-failure rates run ~5–10% of HL7v2 messages (founder's HIE research). Honest under the three-state vocabulary: the phenotype (structural non-conformance, detected at load, routed to the feed owner) is real and **Demonstrated**; the HL7v2 substrate is **Architectural** — production framing only. The cleanest Foundational-readiness structural demonstration; the current set has none (Bug 4 only partially carries it as the bridge case). Founder-owned (interoperability/data-engineering; outside Hanieh Razzaghi's clinical-content domain).

**Add-2. Lab availability + recency — Fit-for-purpose readiness. Committed-practical for the POC.** A1c absent, or present but stale (e.g. three years old) for a use case requiring a current value (HEDIS measurement-year requirement). Combines availability and recency. Detected at the Score step, per use case, against its recency requirement; routed as a fit-for-purpose gap (clinic collection or device path for current glycemic data). The cleanest Fit-for-purpose illustration and diabetes-central; underpins the device-first methodology. Feasibility screen (2026-07-06): seeds into existing observations fields (`effective_date`, `value`, `value_units`) — no new data elements. Founder-intent; Hanieh Razzaghi refines specification (realistic recency thresholds, phenotyping).

**Add-3. Value plausibility — Foundational readiness (content). Committed-practical for the POC.** A value present and valid-format but clinically implausible (e.g. HbA1c = 81.3%, a unit error). Wrong regardless of use case. Detected at the Score step (value-range/plausibility); routed to clinical reviewer/source for unit correction or source fix. Rounds out the content-defect space. Feasibility screen (2026-07-06): seeds into existing observations fields (`value`, `value_units`) — no new data elements. Classification nuance (per Hanieh Razzaghi): an implausible value is *foundational* — wrong for everyone — but *evaluating* plausibility against a use-case-specific range is *fit-for-purpose*. Founder-intent; Hanieh Razzaghi refines plausibility ranges. Optional/cheap.

### One addition moved to funded phase (not POC)

**Add-4. DKA event validation — direction confirmed, moved to funded phase.** Direction resolved with Hanieh Razzaghi (2026-06-21): **event validation** — verify a coded DKA event against corroborating clinical markers — not encounter completeness (which stays as voiceover/roadmap; it connects to coverage-level readiness, claims complementarity, and cross-source pooling). Her confirmatory markers and the temporal implication are captured in `docs/methodology-open-questions.md` (Add-4 entry). Feasibility screen: it requires **new seeded lab and medication-administration data elements** (ketones/pH/bicarbonate observation rows, plus an insulin-drip administration signal the current prescription-oriented medications table doesn't carry) — new machinery, out of POC scope. Ready to pull post-funding.

### Deferred to funded phase (not POC bugs)

These are methodology questions, not seedable row-level defects:

- **Denominator / study-population validity** — is a high-risk-heavy cohort real or an artifact of the base cohort? See `docs/methodology-open-questions.md` (§6).
- **Granular plausibility taxonomy** (value / terminology / event) — see `docs/methodology-open-questions.md` (§7).

### Explicitly dropped (decided out for now)

**Expected-feed-not-arrived** (scheduled delivery late/absent/deviated volume). Requires an "expected" reference (schedule/volume baseline) to detect against, more build machinery, and carries the least narrative punch. Worst effort-to-impact ratio. May revisit; not in the committed set.

### Phase-coverage check (why these)

Foundational readiness becomes genuinely represented via Add-1 (structural) and Add-3 (plausibility), plus Bug 4 as the bridge case (Add-4, confirmed as event validation, is funded-phase). Fit-for-purpose readiness gains recency (Add-2), alongside existing Bugs 2/3. The two-phase model becomes demonstrable, not just narrated.

### Build notes

**Insertion point — the committed additions fold in after 7l, before fixture-export.** The committed set (Add-1 CSV-structural, Add-2 recency, Add-3 plausibility) is built after 7l completes and before the fixture-export step — one pass through the four layers each addition touches (dataset seed → check file → config entry → demo narrative). Rationale: the 7k/7l acceptance gates are calibrated to exactly six bugs with known counts and routing; seeding new bugs mid-spine would muddy whether a surprise result is a check defect or a dataset change. Late addition is cheap by design: a new bug = a dataset-generation change + one check file + a config entry — no migration.

Each addition touches the synthetic dataset (seeded defect), the scoring engine (detection check), the fixture export, and the demo narrative (surfacing/routing). Build the committed set in one pass through these layers (more efficient than piecemeal). Do not add to the canonical Synthetic Dataset Spec until built; update that spec after they are real. Inform Hanieh Razzaghi of the clinical-content additions (Add-2, Add-3) for refinement; she sharpens specification, she does not gate inclusion.

Priority order if time-constrained: Add-1 (CSV-structural) and Add-2 (recency) highest value (each makes a phase visible with a clean story); Add-3 (plausibility) cheapest round-out; Add-4 moved to funded phase.

---

## Pending Document Updates (Not Blocking Build)

- **Remediation Roles and Accountability** — Bug 6 routing updated to Policy/Regulatory (was Program Coordinator + Tech Vendor). Update role mapping for derived metric concordance failure.
- **Build Plan (this document)** — update Step 7 sub-step checkboxes to ✅ as each sub-step is completed in the backend build thread.

### Public-release preparation (tracked 2026-07-12; execution deferred, off the Step 8 critical path)

Sequence, reconciled by the planning thread with the IP/governance record:

1. **Attribution migration** — create `ATTRIBUTION.md` at repo root (replaces `Oros_ATTRIBUTION.md`; both Build Plan references update in that same commit); add `NOTICE` (Apache convention; start year read from the signed Pre-Existing IP Record, 2026-04-12); README gains a License section including the one-line MIT→Apache 2.0 relicense note (owner relicensed post-assignment, 2026-04-24) for diligence readers. HARD GATES: Sivaram Arabandi's advisory acknowledgment (Schedule A §2.2, predecessor wizard-v3 work) must be present, structured as an acknowledgment distinct from released-artifact contributor attribution (Collaboration Framework Principle 3); Lisa Schilling is not named publicly without her explicit prior sign-off.
2. **Git history review** — AFTER Step 8 deletes the legacy wizard files (Archia removal is already tracked as Step 8 demo hygiene). *(Precondition CLOSED 2026-07-13 at `5c51890`: the legacy wizard deletion is complete; the history review is unblocked, sequenced after Step 8 completes.)* Full-history publish is the DEFAULT strategy: the commit history is cited in the Pre-Existing IP Record as ownership evidence. Review targets include the known items: whether scripts/.env or any CKM_DIRECT/Neon credential string ever entered a commit; confirmation gate evidence files were never tracked; residual vendor-attribution strings. A fresh-repo/clean-initial-commit publish is NOT a default fallback — it would orphan the public artifact from cited evidence and requires its own governance decision.
3. **Dan Connolly review** of the findings + release package, then the flip.

LICENSE file is verified correct (Apache 2.0) — do not modify. The Drive-canonical release runbook absorbs this sequence and remains the canonical checklist; it is never committed to this repo.

---

## Agentic Layer

Optional — deterministic pipeline works without it. Step 9 is deferred until Step 7 is complete. See `Oros - CKM Data Readiness - Agentic Layer Architecture.md` for the technical specification (sidecar placement, the three agentic functions, activation model, POC phasing). The optional agentic capabilities follow the maturity progression and operating philosophy described in `Oros - Agentic Architecture & Automation Strategy` (Oros-wide strategy document); that document is horizon-setting and does not change June 25 scope.

---

## Design Principles

- Progressive disclosure, actionable outputs, clear capability unlock
- Deterministic first — AI augments, never replaces
- Human approval required for all AI-suggested changes
- Full audit trail: raw record → patch → re-scored output
- Reuse-optimized — not locked to a single deployment context

---

## Collaborators

| Person | Organization | Role |
|--------|-------------|------|
| Dominique Pahud | Oros | Lead architect, product, fundraising |
| Hanieh Razzaghi | CHOP / UPenn | Clinical domain expert, scoring validation |
| Lisa Schilling | University of Colorado Anschutz | Population health, regional implementation (in discussion) |
| Dan Connolly | Independent | Governance and capability enforcement / trusted open-source software; connection to Endo (capability-enforcement layer) (in discussion) |
| Sngular | Sngular | Secure infrastructure and DevOps partner (in discussion) |

### Potential Implementation Partners (in discussion)

Implementation partnerships are emerging and not yet confirmed. They are described here by capability and geography rather than by name, reflecting their current pre-commitment status. Named partners will be added as relationships are confirmed.

- **Data aggregation** — CGM and device data aggregation partner (candidates under evaluation; could be a dedicated aggregation platform or a device manufacturer relationship). Not yet selected.
- **Rural clinic engagement and care model design** — academic and clinical partners in candidate states, contingent on state program pathways (e.g., a Colorado partner pending release of the state rural health RFA and rural-clinic introductions).
- **State rural health stakeholders** — implementation and validation partners in the three POC states (Kansas active; Montana; Colorado pending the state rural health RFA), with Oregon and other states as opportunities develop.
- Additional state-specific partners as identified.

See `Oros_ATTRIBUTION.md` for the living attribution record.
