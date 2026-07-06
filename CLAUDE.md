# CLAUDE.md

Project: **oros-ckm-data-readiness** — CKM Data Readiness Infrastructure POC.

This file is the Claude Code working guide. When this file conflicts with a doc in `docs/`, the doc wins. When something is unclear, ask before guessing.

---

## 0. Current Work and How to Read This File

This repo serves two jobs. Read the one that matches your task.

- **Backend scoring build (Step 7 — scoring engine and condition module).** Sections 2–16 below are the working reference for this. Active backend build.
- **Demo design / UI-UX (Step 8 territory).** The demo-facing design work is governed by the June 2026 canonical docs listed in Section 1.5 and Section 15. When building or specifying anything a demo audience sees, follow the **Durable Demo Rules (Section 1.6)** and the June docs, not the April-era framing that may still live in the backend sections below.

If a backend section and a June demo doc appear to disagree about demo-facing behavior or framing, the June demo doc wins. The backend sections remain correct for engine mechanics.

---

## 1. Project Overview

CKM Data Readiness — a data quality infrastructure for Cardio-Kidney-Metabolic conditions. Oros is the **neutral steward of shared open infrastructure**, serving all parties (rural health programs, HIEs, payers, health systems) and competing with none. Deployment is **multi-state and opportunistic** — deployed wherever motivated sites, funding, and partners emerge. The first implementation state is TBD (Kansas more likely; Colorado is one candidate context, not "the pilot"). This supersedes the earlier Colorado-first framing.

The POC demonstrates the arc:

```
Load → Normalize → Score → Surface Blockers → Remediate → Re-score → Unlock Analytics
```

Repo layout:
- `src/` — React/Vite/TypeScript wizard UI (Step 8 scope)
- `scoring/` — Node ESM scoring engine (Step 7 scope)
- `scripts/` — Data loading and session reset (complete)
- `conditions/` — Condition module config files (new in Step 7)
- `migrations/` — Neon schema migrations (V001–V009 applied; V010 pending)
- `docs/` — Canonical design docs (authoritative)

### 1.5. License, IP, and Positioning (authoritative pointers)

- **License: Apache License 2.0.** The **Collaboration Framework** (Governance folder, cross-project) owns license, IP, attribution, stewardship, and anti-capture principles. This repo and all docs **reference** the Framework; they do not restate it. Do not introduce MIT or any other license framing.
- **Independent origin.** CKM infrastructure was developed independently prior to any funded institutional engagement. Funding a consulting engagement or pilot does not transfer ownership.
- **Positioning is owned by the Strategic Decisions Extract** (`docs/Oros - CKM Data Readiness - Strategic Decisions Extract - Jun 2026.md`). It is authoritative for identity, deployment strategy, license framing, and partner treatment. Consult it before writing anything a stakeholder sees.

### 1.6. Durable Demo Rules (apply to everything a demo audience sees)

These hold across every demo-facing session.

- **This is a demo, not a product.** A clickable, reliable, scripted walkthrough that runs the same way every time. The job is to make the audience see the operational unlock, not the plumbing.
- **Deterministic pipeline is the source of truth.** The agentic layer is conditional (shown only if the deterministic path completes end-to-end) and is the first thing cut if time is short. Build scripted-first; live mode is added last behind a flag with automatic fallback to scripted (see the Agentic Drawer Spec Decision).
- **Three-state vocabulary on screen:** Implemented / Demonstrated-stub / Architectural. Label what is real honestly so no viewer over-reads scope. Endo and any capability-enforcement runtime are **Architectural** (candidate, not running) in the POC.
- **Reset re-points; it does not recompute.** Results are pre-computed and served from persistence (Neon). Reset re-points to a clean session / reloads a dataset state. On-screen copy must not imply live computation is happening on stage ("watch it score").
- **Methodology framing — A1C vs CGM (read carefully).** In clinical practice A1C is the default measure of glycemic control, but it is often **missing or not recent enough** to reflect current control. CGM is the practical way to establish and monitor glycemic control: GMI as an A1C proxy, plus TIR and the temporal trajectory a single lab value cannot show. The readiness pipeline therefore checks the **CGM pathway first** (because that is where current, sufficient data usually exists) and falls back to A1C when CGM is unavailable.
  - The engine's pathway names `cgm_primary` / `a1c_fallback` are **mechanical** (evaluation order in code), not a clinical ranking. Keep these names in code and config.
  - **User-facing copy must never say "CGM primary, A1C fallback"** — to a clinician that reads as a backwards clinical claim. User-facing copy uses the reconciled narrative above. Do not reconcile this by renaming engine variables or by shipping the mechanical phrasing on screen.
- **Care model — three moments, human always in the loop.** The data-driven care model has three moments. A human is always in the loop in all of them; the difference between moments is *what the human reacts to*, not human-vs-automated.
  1. **Enrollment (clinical, upstream — NOT the platform).** A patient is enrolled in remote patient monitoring based on risk, via a clinical encounter (PCP, endocrinologist) or an established referral pathway, then put on device. A clinical and human decision. The platform does **not** enroll, identify, or decide who to monitor.
  2. **Weekly stratification review (where the platform operates).** Once enrolled and instrumented, the patient is monitored on a recurring (e.g., weekly) cadence. A nurse or clinical staff reviews a risk-stratification dashboard built on device data and decides who needs attention. The platform **orders and surfaces** the instrumented population so the human review is targeted and trustworthy. The platform sorts the list; the clinician decides.
  3. **Outreach and engagement (clinical, downstream).** A deviation from expectation creates an opportunity for human-initiated outreach (patient contact, diabetes educator visit, telehealth). The data creates the trigger; a person acts.
  - **The demo sits squarely in the data-readiness substrate of Moment 2.** It answers: can this enrolled, instrumented population's data support the weekly stratification review? Where it cannot (identity linkage broken, temporal density too low, derived metrics unreliable), the platform surfaces and routes the blocker. The demo never claims to enroll/identify patients (Moment 1) or to act autonomously (Moment 3).
- **Two data paths — both load-bearing.** The device path and the EHR path serve different stages of one care model; the platform makes both fit for purpose. They are not alternatives.
  - **Device path — operational now (front of the model).** Device/wearable data (CGM for diabetes, BP cuff for hypertension, connected scale for heart failure) powers the weekly stratification review, letting sites operationalize now even when EHR data is poor, because the device feed is current and sufficient.
  - **EHR path — required for everything downstream.** Care coordination needs encounter data, medications, and lab values; clinical quality and value-based care reporting need conformant, complete EHR records. None of this runs on device data. The platform's EHR remediation is what unblocks the downstream care-coordination-and-reporting half of the model.
  - This is why the six-bug split is meaningful, not arbitrary: device bugs (1, 2, 6) block the stratification front (Diabetes RS); EHR bugs (3, 4, 5) block the downstream (Hypertension RS, Care Coordination, Clinical Quality + VBC Reporting). Device readiness unlocks stratification you can act on now; EHR readiness unlocks the coordination and reporting that make the care model complete and accountable. This two-sided unlock is what makes this **infrastructure**, not a device-stratification tool.
- **Fit-for-purpose is workflow-defined, locally owned, and configurable.** What counts as "fit for purpose" is not a universal threshold; it is defined by the operational workflow a local clinical team is trying to support, under rules and a care model that team owns. The same data may be fit for one workflow and not another, and the appropriate criteria depend on context (population, standard of care, region, staffing model). Some criteria are **foundational** (anchored to national standards, stable across deployments); others are **customizable** to local reality and evolve as guidelines and the standard of care shift. The platform determines whether data can support a workflow **under the agreed-upon criteria**; it does not impose what fit-for-purpose means.
  - **In the UI, criteria are shown as configured and owned by the local team, never asserted by the platform as universal truth.** Fit-for-purpose criteria, thresholds, weights, and value sets are versioned configuration (condition-module config loaded into the engine), not embedded in front-end logic — which is what makes them updatable as understanding improves without a rebuild. Show one defensible baseline criterion, labeled configured and revisable. Do **not** imply the engine computes profile-conditioned criteria (e.g., device-required-if-insulin); that is a forward-looking capability the configurable architecture supports, not a v0.1 implementation (conditional variable requirements are a v0.1 non-goal). Describe it honestly per the three-state vocabulary.
- **Copy disciplines that follow:** a human is **always in the loop**; the platform **surfaces, orders, and remediates** but does **not enroll, identify, or act autonomously** — never imply the platform decides who to monitor or acts without a clinician. Frame EHR remediation as the prerequisite for downstream coordination and reporting, not secondary cleanup. **Full automation of the loop is out of POC scope — roadmap only** (controlled experiments under IRB, tied to safe-use-of-AI); no autonomous-action claims anywhere in demo copy; automation belongs in deck horizon framing.
- **Engine pathway mechanics are an ordered pathway** (device pathway evaluated first, EHR/A1C fallback second), **not a composite blend.** This matches the Condition Module Schema and the V010 design. The Architecture Specification §5.2 "composite indicator" language is a stale outlier being corrected in the docs; do not implement a composite model.
- **Capabilities are condition-agnostic functions shown for diabetes** ("risk stratification, shown here for diabetes"), never collapsed into fixed diabetes-only products. CKM is multi-condition; diabetes is the beachhead.
- **Trust ordering (verbatim, locked):** deterministic pipeline = source of truth; AI = accelerant on top; human approves every change; capability enforcement is a requirement (Endo = leading candidate, shown as architectural not running).
- **Partner treatment.** Archia, Kris Kowal, and Chime Ogbuji are **not current collaborators** and must not appear in demo-facing copy as such (per Strategic Decisions Extract §9). RTA / KUMC stay off the funding-facing demo entirely. Current collaborators include Dan Connolly (governance + capability enforcement) and Sngular (secure infrastructure / DevOps).

---

## 2. Core Constraints (non-negotiable)

- **Raw data is NEVER modified.** Tier 1 tables are append-only after load. All scoring, normalization, and remediation writes go to Tier 2–4.
- **Full check names in the DB.** `check_results.check_name` must be the full form (e.g., `device_temporal_density_cgm_14d`, `layer1_notnull_fields_a1c`). Short names exist only as registry references in the Tech Spec.
- **Session-awareness.** Every scoring/remediation write carries `demo_session_id`. Writers are idempotent: `DELETE + INSERT` on the tuple the writer owns.
- **CKM_DIRECT** is exported in `~/.zshrc` on Studio. Never hardcode credentials.
- **No raw data in the agentic layer.** The agentic sidecar (Step 9) reads check result records only (~200 bytes each), never Tier 1 rows. The Step 7 scoring engine is fully deterministic and runs without any AI.
- **Condition-specific logic does not live in the engine.** All thresholds, weights, variables, pathways, and remediation defaults come from condition module configs. Adding a condition must not require engine code changes.

---

## 3. Current Build State

### Verified baseline — as of 2026-06-22 (judged from code + DB, not from checkboxes)

This section reflects what is actually on disk and in Neon. An earlier version of this section claimed Step 7 work was complete; that was inaccurate and is corrected below. **Do not trust Build Plan checkboxes over this baseline.**

#### What is real
- **21-table schema (V001–V010): live.** In Neon database `ckm_readiness` (project `ckm-readiness` / `morning-dew-32497310`, default branch `production`). All FK constraints and indexes. **Note: the data is in the `ckm_readiness` database, not the default `neondb`.**
- **All three demo datasets loaded as raw Tier-1 data:** 3 `demo_sessions`, 150 patients, ~248k `cgm_readings`. Session IDs match Section 6.
- **`scripts/` (data loading + session reset): complete.**
- **Docs locked:** Condition Module Schema v0.1, Architecture Specification, ADR (Apr 2026), and the June demo set (incl. the locked Demo UI/UX Specification and the V010 Migration Spec).

#### Step 7 — schema + config loader landed (7a, 7b done; 7c partial); checks NOT started
- **7a — V010 applied (2026-06-22).** `migrations/V010__condition_modules.sql` applied to `ckm_readiness`; the schema is now **21 tables**. The three condition-module tables (`condition_modules`, `use_case_specifications`, `use_case_pathway_results`) exist, and the retrofit CHECK on `remediation_work_items.responsible_role` is in place. Verified via spec §5 (all checks passed).
- **7b — config loader + db scaffolding complete.** `scoring/lib/db.js` (pg pool from `CKM_DIRECT` + `withTransaction`) and `scoring/lib/config_loader.js` exist and are verified against `ckm_readiness` (clean load, located-error rollback, idempotent reload; exit codes 0/0/1). The config tables now hold the loaded diabetes module — these are config-tier, **not** scoring output.
- **7c — partially complete.** `conditions/diabetes/diabetes.config.json` (the full `diabetes_risk_stratification` use case) landed in the 7b commit as the loader's verification fixture. The three stub configs (`hypertension_risk_stratification`, `care_coordination`, `vbc_reporting`) remain to be authored.
- **Checks not built.** `scoring/checks/` is empty — none of the check implementations exist yet (`device_patient_linkage_cgm`, `device_temporal_density_cgm_14d`, `layer1_notnull_fields_smoking`, and the rest). The config loader emits a warning for every referenced check (all unbuilt until 7d–7f).
- **No scoring has run against patient data.** `check_results`, `variable_readiness_scores`, `use_case_readiness`, and `remediation_work_items` are all empty (0 rows). The scoring orchestrator (`scoring/index.js`), aggregator, pathway evaluator, and writers do not exist yet.
- **7d–7l are not started.**

#### Not started (downstream)
- Step 8 (UI revamp), Step 9 (agentic layer), Step 10 (Vercel deploy).

#### Open design point — fixture-export layer (UI/UX spec dependency)
The locked Demo UI/UX Specification (§8.3, §10) requires a fixture-export step that serializes engine output to `src/data/fixtures/session-{a,b,c}.json`. Two of its required outputs are **not natively emitted by the engine schema** as currently specified and must be derived at export time — flagged here as an unresolved design point, not a settled mechanism:
- **`recommendationType`** (`ai_suggested_fix` | `route_to_stakeholder`, per spec §10.1) — no column for this exists in `remediation_work_items` or any engine output table.
- **The four-facts plain-language strings** (`whatFailed`, `whatUnlocks`, etc., per spec §6.3/§7) — composed from `remediation_work_items.action_required` + the Dataset B Bug Reconciliation, not stored by the engine.
The export step (or a config/schema addition) must own this derivation. Resolve at or before the Step 7 → fixture-export handoff.

#### Open methodology questions (separate from the build)
Open methodology questions (weight basis, device-linkage classification, terminology, Add-4) are tracked in `docs/methodology-open-questions.md` — revisited in a dedicated methodology-triage pass with Hanieh, separate from the build.

---

## 4. Document Governance (two tracks)

Every doc lives in one of two tracks, decided by one question:
does it change as part of writing code, or as part of talking to humans?

**Track 1 — Build-coupled → repo-markdown-canonical.** The repo .md is the only truth; Drive is fully out of the loop (any surviving Drive copy is an orphan — archive or delete it). Edit directly in the repo (Claude Code authors), committed with or alongside the related build work. Members: CLAUDE.md (repo-only by rule, never in Drive), Data Model, Build Plan, Condition Module Schema, docs/methodology-open-questions.md, agentic docs, dev-environment docs.

**Track 2 — Stakeholder-facing → Drive-canonical .docx.** Flow: edit in Drive → move the old version to Archive/ with a date suffix → export .docx to repo docs/ → commit. Updated on stakeholder cadence, not build cadence. Members: Technical Specification, Methodology Architecture, Architecture Specification, Operational Governance Framework, Remediation Roles, Operational Care Model, Synthetic Dataset Spec, Signal & Data Elements, Device Data Model, ADR.

**Third surface:** copies in the Claude planning project's context are read snapshots — canonical nowhere. Order of operations: (1) update the doc in its home surface; (2) refresh the Claude project copy if needed.

---

## 5. Step 7 Plan — Sub-steps and Dependencies

All sub-steps must complete before Step 8 can begin. Commit per sub-step.

| Sub | Task | Depends on |
|-----|------|------------|
| 7a  | Migration **V010** — add `condition_modules`, `use_case_specifications`, `use_case_pathway_results` tables; add CHECK constraints on `use_case_category`, `pathway_result`, and retrofit CHECK on `remediation_work_items.responsible_role` | — |
| 7b  | `scoring/lib/config_loader.js` — reads `conditions/*/*.config.json` into DB at startup; validates canonical enumeration values against the same lists enforced at the DB layer | 7a |
| 7c  | Author `conditions/diabetes/diabetes.config.json` (full) plus three stubs: `hypertension/`, `care_coordination/`, `vbc_reporting/` | 7a |
| 7d  | `scoring/checks/layer6_denom_riskstrat.js` — eligibility (gates all patients) | 7b, 7c |
| 7e  | `scoring/checks/device_derived_metric_consistency_cgm.js` — Bug 6 TIR recomputation | 7b, 7c |
| 7f  | Six more checks: `layer1_notnull_fields_a1c.js`, `layer2_ranges_numeric_a1c.js`, `layer5_date_concordance_a1c.js`, `layer3_mapped_values.js`, `layer2_value_standards.js`, `layer5_date_concordance.js` | 7b, 7c |
| 7g  | `scoring/lib/aggregator.js` — writes `variable_readiness_scores` (weighted average per variable) | 7d, 7e, 7f |
| 7h  | `scoring/lib/pathway_evaluator.js` — writes `use_case_pathway_results` (primary_pass / fallback_pass / no_valid_pathway) | 7g |
| 7i  | `scoring/lib/use_case_writer.js` — writes `use_case_readiness` (fitness_score, overall_status, pathway-aware required/blocking variables) | 7h |
| 7j  | `scoring/lib/work_item_generator.js` — one row per FAIL using `remediation_defaults` from config | 7i |
| 7k  | End-to-end test against Dataset B — all 6 bugs surface with correct use-case blocking, phenotypes, stakeholder routing | 7d–7j |
| 7l  | End-to-end test against Dataset C — use cases unlock, pathway results update | 7k |

---

## 6. Active Demo Sessions

| Dataset | Session ID |
|---------|-----------|
| A (clean)      | `929ce033-41e7-4516-b70c-240e07257f8d` |
| B (buggy)      | `a40afd78-0ded-4481-8a7d-04811f4f28ed` |
| C (remediated) | `44ce72be-0629-47ba-bde0-dc52c854536d` |

---

## 7. Scoring Engine — Conventions

### Target directory structure

```
scoring/
├── index.js                                   # entry: node scoring/index.js <session_id>
├── lib/
│   ├── db.js                                  # pg pool from CKM_DIRECT
│   ├── writer.js                              # idempotent DELETE + INSERT per check+session
│   ├── config_loader.js                       # (7b) loads conditions/ into DB + validates enumerations
│   ├── aggregator.js                          # (7g) variable_readiness_scores writer
│   ├── pathway_evaluator.js                   # (7h) use_case_pathway_results writer
│   ├── use_case_writer.js                     # (7i) use_case_readiness writer
│   └── work_item_generator.js                 # (7j) remediation_work_items generator
└── checks/
    ├── device_patient_linkage_cgm.js          (not started — was mislabeled "done")
    ├── device_temporal_density_cgm_14d.js     (not started — was mislabeled "done")
    ├── layer1_notnull_fields_smoking.js       (not started — was mislabeled "done")
    ├── layer6_denom_riskstrat.js              (7d)
    ├── device_derived_metric_consistency_cgm.js (7e)
    ├── layer1_notnull_fields_a1c.js           (7f)
    ├── layer2_ranges_numeric_a1c.js           (7f)
    ├── layer5_date_concordance_a1c.js         (7f)
    ├── layer3_mapped_values.js                (7f — Bug 4)
    ├── layer2_value_standards.js              (7f — Bug 4)
    └── layer5_date_concordance.js             (7f — Bug 5)

conditions/
├── diabetes/diabetes.config.json              (7c — full schema)
├── hypertension/hypertension.config.json      (7c — stub)
├── care_coordination/care_coordination.config.json (7c — stub)
└── vbc_reporting/vbc_reporting.config.json    (7c — stub)
```

### Check module pattern

Every check in `scoring/checks/` exports:

```js
export const CHECK_NAME = 'layer1_notnull_fields_a1c';  // full name — exact string written to DB
export const VARIABLE_NAME = 'A1C';
export const CHECK_SCOPE = 'ehr';                       // 'ehr' | 'device' | 'use_case'
export const CHECK_LAYER = 'layer1';                    // 'layer1'..'layer5'; null for device/use_case
export const PRIORITY = 'High';                         // 'High' | 'Medium' | 'Low'
export const THRESHOLD = 1.0;

export async function runCheck(client, sessionId) {
  // returns CheckResultRow[] — one row per patient evaluated
}
```

Before writing a new check, mirror the Check module pattern above. **No checks exist yet** — `scoring/checks/` is unbuilt as of 2026-06-22 (see Section 3); the first check you write establishes the shape the rest mirror. The check module returns rows; `scoring/lib/writer.js` (also unbuilt) will handle the idempotent upsert. Never write `check_results` directly from a check module.

Add new checks to the `CHECKS` registry in `scoring/index.js`.

### Stub condition modules (7c)

The three stubs validate that the config loader and engine work generically — not just for diabetes. Each uses simple boolean aggregation: any check FAIL = NOT_READY. No pathway logic.

| Stub | Checks | Population | Bug it surfaces |
|------|--------|------------|-----------------|
| `hypertension_risk_stratification` | `layer1_notnull_fields_smoking` | ICD-10 I10 active | Bug 3 |
| `care_coordination` | `layer3_mapped_values` + `layer2_value_standards` | active DM or HTN diagnosis | Bug 4 |
| `vbc_reporting` | `layer5_date_concordance` | qualifying encounters | Bug 5 |

### Idempotency — tuples each writer owns

| Writer | Delete + insert on |
|--------|--------------------|
| check writer (`scoring/lib/writer.js`) | `(check_name, patient_id, demo_session_id)` |
| aggregator | `(variable_name, patient_id, demo_session_id)` |
| pathway evaluator | `(patient_id, use_case_name, demo_session_id)` |
| use_case writer | `(patient_id, use_case_name, demo_session_id)` |
| work item generator | `(check_result_id)` — one work item per FAIL |

---

## 8. Condition Module Schema (v0.1 — Diabetes only)

**Canonical doc:** `docs/Oros - CKM Data Readiness - Condition Module Schema.md`. Do not reimplement; reference and follow.

### Config file top-level structure

```
{
  "schema_version": "0.1",
  "condition": { condition_id, display_name, description, value_sets },
  "use_cases": [
    {
      "use_case_name": "diabetes_risk_stratification",
      "use_case_category": "risk_stratification",
      "display_name": "...",
      "population_definition": { eligibility_criteria, denominator_rule },
      "eligibility_checks": [ { check_name, threshold, priority, remediation_defaults } ],
      "variable_pathways": { pathways, evaluation_order, result_values, derivation_rule },
      "variables": [
        {
          "variable_name": "...",
          "pathway_membership": [...],
          "source_tables": [...],
          "recency": {...},
          "checks": [ { check_name, threshold, priority, weight, remediation_defaults } ]
        }
      ],
      "computation": { continuous_score, status_label },
      "output_definition": {...}
    }
  ]
}
```

### Diabetes Risk Stratification — key parameters

- **Pathways (mechanical names):** `cgm_primary` (CGM Glucose) → `a1c_fallback` (A1C). Evaluated in order. **See Section 1.6 for the user-facing framing — these names are evaluation order, NOT a clinical ranking.**
- **CGM check weights:** `device_patient_linkage_cgm` 0.40, `device_temporal_density_cgm_14d` 0.40, `device_derived_metric_consistency_cgm` 0.20
- **A1C check weights:** `layer1_notnull_fields_a1c` 0.50, `layer2_ranges_numeric_a1c` 0.30, `layer5_date_concordance_a1c` 0.20
- **Threshold bands:** READY ≥ 0.85, PARTIALLY_READY ≥ 0.50, NOT_READY < 0.50
- **A1C recency:** 6-month lookback from evaluation_date
- **Eligibility (`layer6_denom_riskstrat`):** active DM diagnosis (E10.*/E11.*) + ≥2 qualifying encounters in past 24 months + active enrollment

### Output mapping — where each config element writes

| Config element | Written to |
|---|---|
| `checks[].check_name` | `check_results.check_name` |
| `checks[].priority` | `check_results.priority` |
| `checks[].threshold` | `check_results.threshold` |
| `variables[].variable_name` | `check_results.variable_name`, `variable_readiness_scores.variable_name` |
| variable rollup | `variable_readiness_scores.overall_status` |
| `computation.continuous_score` | `use_case_readiness.fitness_score` |
| `computation.status_label` | `use_case_readiness.overall_status` |
| active pathway variables | `use_case_readiness.required_variables` |
| blocking/partial lists | `use_case_readiness.blocking_variables`, `.partial_variables` |
| `remediation_defaults.action_required` | `remediation_work_items.action_required` |
| `remediation_defaults.responsible_role` | `remediation_work_items.responsible_role` |
| `remediation_defaults.phenotype` | `remediation_work_items.phenotype` |
| pathway result | `use_case_pathway_results.pathway_result` (new table) |

### Canonical `responsible_role` values (exact strings — VARCHAR 32)

```
Primary Care Site
Specialty Partner
Regional Data Node
Technology Vendor
Program Coordinator
Network/Payer
Policy/Regulatory
```

### Scoring engine behavior contract (per patient × use case × session)

1. Evaluate eligibility checks. If `layer6_denom_riskstrat` FAIL → generate work item, set `use_case_readiness.overall_status = NOT_READY`. Still continue variable checks so remediation progress is visible for ineligible patients.
2. Evaluate all checks for all variables in all pathways → `check_results`.
3. Aggregate check results per variable → `variable_readiness_scores`.
4. Walk `evaluation_order`. First pathway satisfying `pass_criterion` → `primary_pass` or `fallback_pass`. Else `no_valid_pathway`. Write `use_case_pathway_results`.
5. Compute `fitness_score` via `pathway_weighted_average` over the active pathway's variables (or the last-evaluated pathway if no pathway passes, so the score still reflects remediation progress).
6. Apply threshold bands → `use_case_readiness.overall_status`.
7. For every FAIL check, generate a `remediation_work_items` row using `remediation_defaults` from the config.

### Non-goals (do not implement in v0.1)

- More than two pathways per use case
- Conditional variable requirements (e.g., "A1C only if over 65")
- Multi-condition joint use cases
- Dynamic thresholds (thresholds are static per loaded config)
- Medication value sets (insulin, GLP-1, SGLT2 — deferred)

### Priority weights (for score aggregation)

| Priority | Weight |
|---|---|
| High | 1.0 |
| Medium | 0.7 |
| Low | 0.3 |

---

## 9. Migration V010 — New Tables for Condition Modules

Three additive tables. No ALTER TABLE on existing schema, except for one retrofit CHECK constraint (see below).

### `condition_modules`
One row per loaded condition. PK `condition_id VARCHAR(32)`. Stores `display_name`, `description`, `schema_version`, full `config_json JSONB` snapshot, `loaded_at`.

### `use_case_specifications`
One row per use case. PK `use_case_name VARCHAR(64)`. FK → `condition_modules.condition_id`. JSONB columns: `population_definition`, `variable_pathways`, `variables`, `computation`, `output_definition`. Plus `use_case_category`, `display_name`, `loaded_at`.

CHECK constraint on `use_case_category` — values: `risk_stratification`, `care_coordination_delivery`, `vbc_reporting`.

### `use_case_pathway_results` (runtime output)
PK `pathway_result_id UUID`. Session-aware. Columns: `patient_id`, `use_case_name`, `pathway_result` (`'primary_pass'|'fallback_pass'|'no_valid_pathway'`), `active_pathway_id` (nullable), `organization_id`, `evaluated_at`, `demo_session_id`.

Index: `(patient_id, use_case_name, demo_session_id)` — for the join back to `use_case_readiness`.

CHECK constraint on `pathway_result` — values: `primary_pass`, `fallback_pass`, `no_valid_pathway`.

### Retrofit CHECK on `remediation_work_items.responsible_role`

V010 also adds a CHECK constraint on `remediation_work_items.responsible_role` enforcing the seven canonical values from the Condition Module Schema §3.2. This closes a gap in V006, which declared the column as `VARCHAR(32) NOT NULL` without a value list.

**Full DDL** is specified in `docs/Oros - CKM Data Readiness - Condition Module Schema.md` §4. Mirror the session-aware FK pattern used in V009 (`migrations/V009__foreign_keys.sql`).

---

## 10. Data Model Reference

Full schema: `docs/Oros - CKM Data Readiness - Data Model.md` (markdown-canonical in-repo; converted from the former `.docx`, now the source of truth).

### Tables Step 7 writes to

| Table | Tier | Writer |
|---|---|---|
| `check_results` | 3 | check modules → `scoring/lib/writer.js` |
| `variable_readiness_scores` | 3 | `aggregator.js` (7g) |
| `use_case_pathway_results` | 3 (new) | `pathway_evaluator.js` (7h) |
| `use_case_readiness` | 4 | `use_case_writer.js` (7i) |
| `remediation_work_items` | 3 | `work_item_generator.js` (7j) |

### Session-aware FK pattern

Cross-table FKs reference `(entity_id, demo_session_id)` pairs, not `entity_id` alone. See `migrations/V009__foreign_keys.sql`.

**Exception:** `cgm_readings` has no FK to `patients`. Bug 1 requires UUID-format `user_id` values that don't match any patient — the check engine detects this at the application layer via `device_patient_linkage_cgm`.

### Composite PKs on device tables

`cgm_readings`, `bp_readings`, `weight_readings` use `(record_id, demo_session_id)` composite PKs. Datasets A/B/C share underlying `record_id` values.

### check_results field reference (abridged)

Full fields in Data Model §4.1. Key ones:
- `check_name` (full name, not short)
- `check_scope` — `'ehr' | 'device' | 'use_case'`
- `check_layer` — `'layer1'..'layer5'`, NULL for device/use_case
- `status` — `'PASS' | 'FAIL' | 'PARTIAL' | 'NOT_APPLICABLE'`
- `score` (0–1, nullable for binary checks)
- `threshold`, `observed_value`, `window_days` (nullable)
- `priority`, `patient_id`, `organization_id`, `variable_name`, `demo_session_id`

---

## 11. Demo Narrative — Step 7 Acceptance Test

Run the scoring engine against Dataset B. All six bugs must produce the correct `check_results` FAIL, use-case blocking, phenotype, and stakeholder routing:

| Bug | Full check name | Use case blocked | Phenotype | Responsible role |
|-----|-----------------|------------------|-----------|------------------|
| 1 — Device identity linkage | `device_patient_linkage_cgm` | Diabetes Risk Stratification | Identity Linkage Failure | Technology Vendor |
| 2 — CGM temporal density | `device_temporal_density_cgm_14d` | Diabetes Risk Stratification | Device Temporal Density Gap | Primary Care Site (adherence) / Technology Vendor (transmission) |
| 3 — Missing smoking status | `layer1_notnull_fields_smoking` | Hypertension Risk Stratification | Missing Required Variable | Primary Care Site |
| 4 — Invalid terminology codes | `layer3_mapped_values` + `layer2_value_standards` | Care Coordination | Invalid Terminology Code | Technology Vendor |
| 5 — Date format errors | `layer5_date_concordance` | VBC Reporting | Date Format Non-Conformance | Technology Vendor |
| 6 — TIR derived metric mismatch | `device_derived_metric_consistency_cgm` | Diabetes Risk Stratification | Derived Metric Concordance Failure | Policy/Regulatory |

Bug target patient IDs, row counts, and remediation states: `docs/Oros - CKM Data Readiness - Dataset B Bug Reconciliation.md`.

Dataset C is partial remediation — Bugs 4 and 6 fully resolve, Bug 5 partially resolves, Bugs 1/2/3 remain unresolved (by design — they require external stakeholder action).

---

## 12. Commands

### Scoring Engine
```bash
npm run score:a   # score Dataset A (expect all READY)
npm run score:b   # score Dataset B (6 bugs must surface)
npm run score:c   # score Dataset C (partial remediation)

# direct
node scoring/index.js <session_id>
```

### Data Scripts (`scripts/` — complete)
```bash
cd scripts && npm install   # one-time
# copy .env.example → .env with Neon connection strings

npm run load:a
npm run load:b
npm run load:c
npm run reset -- --session <uuid>
npm run reset:all
```

### Database Migrations
```bash
cd migrations/
# As of 2026-06-22 only V001–V009 exist and are applied (18 tables, in DB `ckm_readiness`).
# V010 is NOT yet authored (Step 7a) — the loop below includes it for when it exists.
for f in V001 V002 V003 V004 V005 V006 V007 V008 V009 V010; do
  psql "$CKM_DIRECT" -f ${f}__*.sql
done
psql "$CKM_DIRECT" -c "\dt"   # 18 tables today; should be 21 after V010 is authored + applied
```

### Frontend (`src/` — Step 8)
```bash
npm install
npm run dev      # localhost:5173
npm run build
```

---

## 13. Environment Variables

- Scoring engine: reads `CKM_DIRECT` from environment (set in `~/.zshrc` on Studio)
- Scripts: `scripts/.env` (see `scripts/.env.example`) — uses `CKM_DIRECT` → `ckm_readiness`
- Frontend: `.env.local` — `VITE_`-prefixed vars (see `.env.example`)
- `VITE_AI_ENABLED=true` enables the agentic drawer (Step 9 scope; off by default)

---

## 14. Conventions and Style

- **ESM, not CommonJS.** Scoring engine uses `import`/`export`.
- **node-pg** for DB access via pool in `scoring/lib/db.js`. No ORM. Hand-written SQL, kept close to the check module.
- **Idempotent writers.** Every writer deletes its tuple before inserting (see Section 7).
- **Full check names everywhere in the DB.** Short names live only in the config file as `check_name` references; they resolve to full names at load time via the variable tag.
- **Commit per sub-step.** 7a commit, 7b commit, etc.
- **Work on the `ckm-poc-build` branch.** Merge to `main` only at milestones.
- **Before writing a check:** follow the Check module pattern in Section 7. No checks exist yet (Section 3) — the first one you write sets the shape the rest mirror.
- **Before writing a writer:** `scoring/lib/writer.js` is not built yet (Section 3). Build it first to the DELETE+INSERT idempotency contract in Section 7, then mirror it for the other writers.
- **Before altering any doc in `docs/`:** ask first. Those are the canonical contracts.
- **Dual enforcement for canonical enumerations.** Any field with a fixed value list (e.g., `responsible_role`, `pathway_result`, `use_case_category`, `check_scope`, `check_status`, `priority`) is enforced at two layers: (1) the application layer, via validation in `scoring/lib/config_loader.js` at config load time — fails fast with a clear error naming the offending use case, check, and received value; (2) the database layer, via a CHECK constraint in the migration that creates the column — acts as a backstop for any write bypassing the scoring engine. See Condition Module Schema §3.2 for the canonical statement of this pattern.

---

## 15. Canonical Documents (`docs/`)

All docs live at the top level of `docs/`. The `docs/archive/` folder contains superseded versions — do not read from there.

### Operative for demo design and positioning (June 2026)

Consult these for anything a demo audience sees, and for identity / license / partner framing. Where these and the backend docs disagree about demo-facing behavior or framing, **these win.**

| Filename | Purpose |
|----------|---------|
| `Oros - CKM Data Readiness - June 25 POC Scope Lock.md` | Operational source of truth for June 25 demo scope: Diabetes-first, CKM infrastructure visible, six-bug arc, three-state vocabulary, frozen strings |
| `Oros - CKM Data Readiness - Agentic Drawer Spec Decision.md` | Operative for demo drawer behavior: switchable source, scripted-first, auto-fallback, recommendation data shape |
| `Oros - CKM Data Readiness - Strategic Decisions Extract - Jun 2026.md` | Authoritative for identity, multi-state deployment, license (Apache 2.0 / Framework), and partner treatment |
| `Oros - CKM Data Readiness - Build Plan - Jun 2026.md` | Step ordering, sub-step dependencies, demo narrative; carries the June 25 scope reframing (Option A, three-state vocabulary, agentic conditionality, Archia attribution removal) |
| `Oros - CKM Data Readiness - Demo UI-UX Specification.md` | **Locked.** Governing contract for the Step 8 UI/UX revamp. Owns: the two views (use-case front door / pipeline under-the-hood toggle, curated readiness arc) and audience lead-view toggle; the data-driven rendering contract (§7); the `getReadinessData`/`DATA_SOURCE` provider abstraction and fixture-export step; the `getRecommendation`/`AGENT_MODE` drawer with the net-new recommendation shape (incl. `recommendationType`); Foundational vs Fit-for-purpose framing; semantic/functional design tokens; and the foundations-first build increments (§17). |

### Primary — Step 7 critical path

Reference these frequently while building Step 7.

| Filename | Purpose |
|----------|---------|
| `Oros - CKM Data Readiness - Condition Module Schema.md` | Config contract, new table DDL, engine behavior contract |
| `Oros - CKM Data Readiness - Architecture Specification.docx` | Canonical object model (Variable, Condition Module, Use Case Specification). Supersedes Baseline Methodology. |
| `Oros - CKM Data Readiness - Data Model.md` | Full schema for all 21 tables (markdown-canonical in-repo; converted from `.docx`) |
| `Oros - CKM Data Readiness - Technical Specification.docx` | Check registry, scoring formulas, priority weights |
| `Oros - CKM Data Readiness - Architecture Decision Record - Apr 2026.docx` | Decisions 1–4 (sidecar, config+DB, representation sequence, deployment host) |
| `Oros - CKM Data Readiness - Dataset B Bug Reconciliation.md` | Exact bug targets, remediation outcomes, acceptance test |
| `Oros - CKM Data Readiness - Synthetic Dataset Specification.docx` | CSV schemas, patient cohort mapping |

### Supplementary — deeper reference and context

Read when other docs point to them or when deeper domain/governance context is needed.

| Filename | Purpose |
|----------|---------|
| `Oros - CKM Data Readiness - Methodology Architecture.docx` | Clinical methodology — variable-level evaluation, use-case fitness |
| `Oros - CKM Data Readiness - Device Data Model and Readiness Extension.docx` | Device check registry, field-level definitions for CGM/BP/scale |
| `Oros - CKM Data Readiness - Remediation Roles and Accountability.docx` | Source of the 7 canonical `responsible_role` strings |
| `Oros - CKM Data Readiness - Operational Governance Framework.docx` | Seven functional roles, upstream source for Remediation Roles |
| `Oros - CKM Data Readiness - Operational Care Model.docx` | Clinical workflow and care-team context |
| `Oros - CKM Data Readiness - Signal and Data Elements Table.docx` | Clinical signals the clean dataset should produce |
| `Oros - CKM Data Readiness - Agentic Layer Architecture.md` | Step 9 / horizon — broader agentic vision and vendor exploration. **Context only, not current state.** Names Archia/Kowal/Ogbuji as candidates; per Strategic Decisions Extract §9 these are not current collaborators. The Agentic Drawer Spec Decision is operative for the demo drawer. |
| `Oros - CKM Data Readiness - Agentic Security Explainer.md` | Plain-language security model (runtime, sandboxing, prompt injection) — horizon context only |
| `Oros - Dev Environment - Studio Setup - Apr 2026.md` | tmux, SSH, Neon connection, migration run-book |

When any doc conflicts with this file, the doc wins. When in doubt, ask.

---

## 16. Domain Context

- Terminologies: ICD-10 (diagnoses), RxNorm (medications), LOINC (labs + CGM metrics), SNOMED-CT (procedures)
- Use cases in scope: Diabetes Risk Stratification (primary demo), Hypertension Risk Strat, Care Coordination, VBC Reporting, HEDIS CDC
- Stakeholders / collaborators:
  - **Hanieh Razzaghi** (CHOP) — clinical methodology, validation of thresholds/weights. Primary near-term demo stakeholder.
  - **Dan Connolly** — governance + capability enforcement (the Endo connection).
  - **Sngular** — secure infrastructure and DevOps partner.
  - Kris Kowal (Endo runtime) and Chime Ogbuji (terminology LLM) are **future / post-POC, not current collaborators** — do not surface in demo-facing copy (per Strategic Decisions Extract §9).
- Deployment host: Regional node (ACO/IDN), not directly at clinical sites. Multi-state and opportunistic (Kansas more likely than Colorado as first); supersedes the earlier Colorado-first framing.
