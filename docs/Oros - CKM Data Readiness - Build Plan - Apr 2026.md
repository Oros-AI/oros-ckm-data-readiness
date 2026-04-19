# Oros - CKM Data Readiness - Build Plan - Apr 2026

**Project:** Oros CKM Data Readiness Infrastructure  
**Status:** Active build — persistence layer complete, condition module schema locked, scoring engine next  
**Last updated:** 2026-04-18 (updated to reflect Condition Module Schema v0.1 locked; Step 7 expanded with sub-steps; Neon and synthetic dataset status clarified)

---

## Core Objective

Build a data readiness infrastructure POC that demonstrates:

```
Load Data → Normalize → Score → Surface Blockers → 
Remediate → Re-score → Unlock Analytics
```

---

## Strategic Context

### Initial Deployment — Rural Colorado CKM Pilot
The POC supports a CKM Data Readiness Infrastructure pilot in rural Colorado as part of the CMS rural health initiative. Target deployment partners are ACOs and IDNs with direct clinic feeds (e.g. UCHealth as an IDN model with rural clinic partnerships). HIEs such as Contexture (Colorado) are positioned as supplementary data sources, not primary deployment hosts — HIEs are not operationally positioned to take on data quality remediation work. FQHCs and academic collaborators including the University of Colorado Anschutz School of Medicine are also engaged as implementation and research partners. See Architecture Decision Record (April 8, 2026) Decision 4 for full deployment host rationale.

### Designed for Global Reuse
The infrastructure is architected for reuse across clinical settings, regions, and health systems — nationally and internationally. Rural Colorado is the first deployment context. The same infrastructure is applicable wherever CKM data readiness gaps exist, including other rural health initiatives across the United States and eventually internationally. The goal is trusted open source assets optimized for reuse, with fair value attribution and governance controls.

### Oros IP and Stewardship Model
Oros develops and maintains the core CKM Data Readiness Infrastructure as shared open infrastructure. The following principles govern all collaborations and deployments:

- **Oros stewardship:** Oros owns and maintains the core infrastructure. No single collaborating institution owns or controls the core assets.
- **Open licensing:** Core infrastructure is released under MIT license. Reuse is unrestricted.
- **Attribution:** Contributors receive attribution in proportion to their contribution. See `Oros_ATTRIBUTION.md`.
- **No exclusivity:** No institution may claim exclusive rights over generalized infrastructure components, regardless of funding contribution.
- **Boundary clarity:** Local adaptations belong to those institutions. Generalized components developed in the course of those adaptations are contributed back to the core under the same open license.

These conditions apply to all institutional collaborators. Oros will not contribute its IP to arrangements that violate these principles.

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
- ✅ Neon database: `ckm_readiness` — 18 tables, 34 FK constraints, all indexes
- ✅ Four-tier schema: Raw → Normalized → Check Results/Patches → Use-Case Ready
- ✅ Data loading scripts built and verified
- ✅ All three datasets loaded: A (clean), B (buggy), C (remediated)
- ✅ Core documentation locked and committed
- ✅ Condition Module Schema v0.1 locked (`Oros - CKM Data Readiness - Condition Module Schema.md`)
- ✅ Architecture Specification v1.2 locked
- ✅ Three check implementations running: device_patient_linkage_cgm, device_temporal_density_cgm_14d, layer1_notnull_fields_smoking

### Next Steps

**Step 7: Scoring Engine and Condition Module — Active**

Step 7 is the critical path. All sub-steps must complete before Step 8 can begin.

| Sub-step | Description | Depends on |
|----------|-------------|-----------|
| 7a | Neon migration — add 3 condition module tables (condition_modules, use_case_specifications, use_case_pathway_results) | Nothing |
| 7b | Config file loader — reads diabetes.config.json, loads into DB tables at startup | 7a |
| 7c | Author diabetes.config.json from locked Condition Module Schema. Then author three stub condition modules: hypertension_risk_stratification (layer1_notnull_fields_smoking, population: ICD-10 I10), care_coordination (layer3_mapped_values + layer2_value_standards, population: active DM or HTN diagnosis), vbc_reporting (layer5_date_concordance, population: qualifying encounters). Stubs use simple boolean aggregation — any check FAIL = NOT_READY, no pathway logic. Each stub validates the config loader works generically, not just for diabetes. | 7a |
| 7d | Build layer6_denom_riskstrat.js — eligibility evaluation, writes to check_results, generates work items on FAIL | 7b, 7c |
| 7e | Build device_derived_metric_consistency_cgm.js — TIR recomputation vs stored value | 7b, 7c |
| 7f | Build layer1_notnull_fields_a1c.js, layer2_ranges_numeric_a1c.js, layer5_date_concordance_a1c.js (diabetes A1C pathway checks) and layer3_mapped_values.js, layer2_value_standards.js, layer5_date_concordance.js (EHR-level checks for Bugs 4 and 5, required by care_coordination and vbc_reporting stubs) | 7b, 7c |
| 7g | Build scoring aggregation — variable_readiness_scores writer (weighted average per variable) | 7d, 7e, 7f |
| 7h | Build pathway evaluation — use_case_pathway_results writer (primary_pass / fallback_pass / no_valid_pathway) | 7g |
| 7i | Build use_case_readiness writer — fitness_score, overall_status, pathway-aware required/blocking variables | 7h |
| 7j | Build remediation_work_items generator — one row per FAIL check using remediation_defaults from config | 7i |
| 7k | End-to-end test: run scoring engine against Dataset B, verify all 6 bugs surface with correct use case blocking, phenotypes, and stakeholder routing | 7d–7j |
| 7l | Run scoring engine against Dataset C, verify use cases unlock correctly and pathway results update | 7k |

**Step 8: UI/UX Revamp**  
Preserve drawer pattern, remap to CKM architecture. Inputs: completed scoring output tables (Step 7 complete), locked demo narrative. Handle in UI Claude project.

**Step 9: Agentic Layer**  
Claude API POC, pluggable harness interface. Optional — deterministic pipeline must pass Step 7 end-to-end test first. Strong demo candidates: Bug 1 (identity crosswalk proposal), Bug 4 (code correction), Bug 5 (date correction). See Agentic Layer Architecture document.

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
│   ├── writer.js                              ← idempotent DELETE+INSERT per check+session
│   ├── config_loader.js                       ← loads conditions/*.config.json into DB (Step 7b)
│   ├── aggregator.js                          ← variable_readiness_scores writer (Step 7g)
│   ├── pathway_evaluator.js                   ← use_case_pathway_results writer (Step 7h)
│   ├── use_case_writer.js                     ← use_case_readiness writer (Step 7i)
│   └── work_item_generator.js                 ← remediation_work_items generator (Step 7j)
└── checks/
    ├── device_patient_linkage_cgm.js          ✅ implemented
    ├── device_temporal_density_cgm_14d.js     ✅ implemented
    ├── layer1_notnull_fields_smoking.js       ✅ implemented
    ├── layer6_denom_riskstrat.js              ⬜ Step 7d
    ├── device_derived_metric_consistency_cgm.js ⬜ Step 7e
    ├── layer1_notnull_fields_a1c.js           ⬜ Step 7f
    ├── layer2_ranges_numeric_a1c.js           ⬜ Step 7f
    ├── layer5_date_concordance_a1c.js         ⬜ Step 7f
    ├── layer3_mapped_values.js                ⬜ Step 7f (Bug 4 — Care Coordination)
    ├── layer2_value_standards.js              ⬜ Step 7f (Bug 4 — Care Coordination)
    └── layer5_date_concordance.js             ⬜ Step 7f (Bug 5 — VBC Reporting)

conditions/
└── diabetes/
│   └── diabetes.config.json                   ⬜ Step 7c (full schema)
└── hypertension/
│   └── hypertension.config.json               ⬜ Step 7c (stub — HTN RS, Bug 3)
└── care_coordination/
│   └── care_coordination.config.json          ⬜ Step 7c (stub — Care Coord., Bug 4)
└── vbc_reporting/
    └── vbc_reporting.config.json              ⬜ Step 7c (stub — VBC Reporting, Bug 5)
```

---

## Demo Narrative — Locked

The POC demo shows this arc end-to-end across three dataset states.

**Dataset B → Score → Surface → Dataset C → Re-score → Unlock**

| Bug | Check | Use Case Blocked | Phenotype | Responsible Stakeholder |
|-----|-------|-----------------|-----------|------------------------|
| 1 — Device identity linkage failure | device_patient_linkage_cgm | Diabetes Risk Stratification | Identity Linkage Failure | Technology Vendor |
| 2 — CGM temporal density below threshold | device_temporal_density_cgm_14d | Diabetes Risk Stratification | Device Temporal Density Gap | Primary Care Site (adherence) / Technology Vendor (transmission gap) |
| 3 — Missing smoking status | layer1_notnull_fields_smoking | Hypertension Risk Stratification | Missing Required Variable | Primary Care Site |
| 4 — Invalid terminology codes | layer3_mapped_values / layer2_value_standards | Care Coordination | Invalid Terminology Code | Technology Vendor (source fix) |
| 5 — Date format errors in encounters | layer5_date_concordance | VBC Reporting | Date Format Non-Conformance | Technology Vendor (HL7 config) |
| 6 — TIR derived metric mismatch | device_derived_metric_consistency_cgm | Diabetes Risk Stratification | Derived Metric Concordance Failure | Policy/Regulatory (governance escalation) |

For each bug the demo shows: what failed, which use case is blocked, who is responsible, what action is required, and what capability unlocks after remediation.

---

## Pending Document Updates (Not Blocking Build)

- **Remediation Roles and Accountability** — Bug 6 routing updated to Policy/Regulatory (was Program Coordinator + Tech Vendor). Update role mapping for derived metric concordance failure.
- **Build Plan (this document)** — update Step 7 sub-step checkboxes to ✅ as each sub-step is completed in the backend build thread.

---

## Agentic Layer

Optional — deterministic pipeline works without it. Step 9 is deferred until Step 7 is complete. See `Oros - CKM Data Readiness - Agentic Layer Architecture.md`.

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
| Michelle Knopp | Primary Care / Clinical Informatics | Clinical workflow (in discussion) |
| Lisa Schilling | University of Colorado Anschutz | Population health, regional implementation (in discussion) |
| Kris Kowal | Endo / Agoric | Safe AI execution, governance (in discussion) |
| Chime Ogbuji | Independent | Local LLM — Qwen 3 terminology-trained (in discussion) |
| Gharib Gharibi / Andrew Rademacher | Archia | Agentic orchestration (terms TBD) |

See `Oros_ATTRIBUTION.md` for the living attribution record.
