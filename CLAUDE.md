# CLAUDE.md

Project: **oros-ckm-data-readiness** — CKM Data Readiness Infrastructure POC.
Current phase: **Step 7 — Scoring Engine and Condition Module (active).**

This file is the Claude Code working guide. When this file conflicts with a doc in `docs/`, the doc wins. When something is unclear, ask before guessing.

---

## 1. Project Overview

CKM Data Readiness — a data quality infrastructure for Cardio-Kidney-Metabolic conditions, first deployed in a rural Colorado CMS pilot. The POC demonstrates the arc:

```
Load → Normalize → Score → Surface Blockers → Remediate → Re-score → Unlock Analytics
```

Repo layout:
- `src/` — React/Vite/TypeScript wizard UI (Step 8 scope; not active)
- `scoring/` — Node ESM scoring engine (**Step 7 scope — active**)
- `scripts/` — Data loading and session reset (complete)
- `conditions/` — Condition module config files (new in Step 7)
- `migrations/` — Neon schema migrations (V001–V009 applied; V010 pending)
- `docs/` — Canonical design docs (authoritative)

---

## 2. Core Constraints (non-negotiable)

- **Raw data is NEVER modified.** Tier 1 tables are append-only after load. All scoring, normalization, and remediation writes go to Tier 2–4.
- **Full check names in the DB.** `check_results.check_name` must be the full form (e.g., `device_temporal_density_cgm_14d`, `layer1_notnull_fields_a1c`). Short names exist only as registry references in the Tech Spec.
- **Session-awareness.** Every scoring/remediation write carries `demo_session_id`. Writers are idempotent: `DELETE + INSERT` on the tuple the writer owns.
- **CKM_DIRECT** is exported in `~/.zshrc` on Studio. Never hardcode credentials.
- **No raw data in the agentic layer.** The agentic sidecar (Step 9) reads check result records only (~200 bytes each), never Tier 1 rows. The Step 7 scoring engine is fully deterministic and runs without any AI.
- **Condition-specific logic does not live in the engine.** All thresholds, weights, variables, pathways, and remediation defaults come from condition module configs. Adding a condition must not require engine code changes.

---

## 3. Current Build State (April 2026)

### Completed
- 18-table schema (V001–V009), 34 FK constraints, all indexes
- All three demo datasets loaded and verified (A/B/C)
- Three check implementations in `scoring/checks/`:
  - `device_patient_linkage_cgm.js`
  - `device_temporal_density_cgm_14d.js`
  - `layer1_notnull_fields_smoking.js`
- Condition Module Schema v0.1 locked
- Architecture Specification v1.2 and ADR (Apr 2026) locked

### Not started
- Step 8 (UI revamp), Step 9 (agentic layer), Step 10 (Vercel deploy)

---

## 4. Step 7 Plan — Sub-steps and Dependencies

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

## 5. Active Demo Sessions

| Dataset | Session ID |
|---------|-----------|
| A (clean)      | `929ce033-41e7-4516-b70c-240e07257f8d` |
| B (buggy)      | `a40afd78-0ded-4481-8a7d-04811f4f28ed` |
| C (remediated) | `44ce72be-0629-47ba-bde0-dc52c854536d` |

---

## 6. Scoring Engine — Conventions

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
    ├── device_patient_linkage_cgm.js          (done)
    ├── device_temporal_density_cgm_14d.js     (done)
    ├── layer1_notnull_fields_smoking.js       (done)
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

Before writing a new check, read the three existing checks and mirror their shape. The check module returns rows; `scoring/lib/writer.js` handles the idempotent upsert. Never write `check_results` directly from a check module.

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

## 7. Condition Module Schema (v0.1 — Diabetes only)

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

- **Pathways:** `cgm_primary` (CGM Glucose) → `a1c_fallback` (A1C). Evaluated in order.
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

## 8. Migration V010 — New Tables for Condition Modules

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

## 9. Data Model Reference

Full schema: `docs/Oros - CKM Data Readiness - Data Model.docx`.

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

## 10. Demo Narrative — Step 7 Acceptance Test

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

## 11. Commands

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
for f in V001 V002 V003 V004 V005 V006 V007 V008 V009 V010; do
  psql "$CKM_DIRECT" -f ${f}__*.sql
done
psql "$CKM_DIRECT" -c "\dt"   # verify table count (should be 21 after V010)
```

### Frontend (`src/` — Step 8, not active)
```bash
npm install
npm run dev      # localhost:5173
npm run build
```

---

## 12. Environment Variables

- Scoring engine: reads `CKM_DIRECT` from environment (set in `~/.zshrc` on Studio)
- Scripts: `scripts/.env` (see `.env.backend.example`)
- Frontend: `.env.local` — `VITE_`-prefixed vars (see `.env.example`)
- `VITE_AI_ENABLED=true` enables the agentic drawer (Step 9 scope; off by default)

---

## 13. Conventions and Style

- **ESM, not CommonJS.** Scoring engine uses `import`/`export`.
- **node-pg** for DB access via pool in `scoring/lib/db.js`. No ORM. Hand-written SQL, kept close to the check module.
- **Idempotent writers.** Every writer deletes its tuple before inserting (see Section 6).
- **Full check names everywhere in the DB.** Short names live only in the config file as `check_name` references; they resolve to full names at load time via the variable tag.
- **Commit per sub-step.** 7a commit, 7b commit, etc.
- **Work on the `ckm-poc-build` branch.** Merge to `main` only at milestones.
- **Before writing a check:** read the three existing checks and mirror their shape.
- **Before writing a writer:** read `scoring/lib/writer.js` and mirror its DELETE+INSERT pattern.
- **Before altering any doc in `docs/`:** ask first. Those are the canonical contracts.
- **Dual enforcement for canonical enumerations.** Any field with a fixed value list (e.g., `responsible_role`, `pathway_result`, `use_case_category`, `check_scope`, `check_status`, `priority`) is enforced at two layers: (1) the application layer, via validation in `scoring/lib/config_loader.js` at config load time — fails fast with a clear error naming the offending use case, check, and received value; (2) the database layer, via a CHECK constraint in the migration that creates the column — acts as a backstop for any write bypassing the scoring engine. See Condition Module Schema §3.2 for the canonical statement of this pattern.

---

## 14. Canonical Documents (`docs/`)

All docs live at the top level of `docs/`. The `docs/archive/` folder contains superseded versions — do not read from there.

### Primary — Step 7 critical path

Reference these frequently while building Step 7.

| Filename | Purpose |
|----------|---------|
| `Oros - CKM Data Readiness - Build Plan - Apr 2026.md` | Step ordering, sub-step dependencies, demo narrative |
| `Oros - CKM Data Readiness - Condition Module Schema.md` | Config contract, new table DDL, engine behavior contract |
| `Oros - CKM Data Readiness - Architecture Specification.docx` | Canonical object model (Variable, Condition Module, Use Case Specification). Supersedes Baseline Methodology. |
| `Oros - CKM Data Readiness - Data Model.docx` | Full schema for all 18 existing tables + 3 new |
| `Oros - CKM Data Readiness - Technical Specification.docx` | Check registry, scoring formulas, priority weights |
| `Oros - CKM Data Readiness - Architecture Decision Record - Apr 2026.docx` | Decisions 1–4 (sidecar, config+DB, representation sequence, deployment host) |
| `Oros - CKM Data Readiness - Dataset B Bug Reconciliation.md` | Exact bug targets, remediation outcomes, acceptance test |
| `Oros - CKM Data Readiness - Synthetic Dataset Specification.docx` | CSV schemas, patient cohort mapping |

### Supplementary — deeper reference and context

Read when Primary docs point to them or when deeper domain/governance context is needed.

| Filename | Purpose |
|----------|---------|
| `Oros - CKM Data Readiness - Methodology Architecture.docx` | Clinical methodology — variable-level evaluation, use-case fitness |
| `Oros - CKM Data Readiness - Device Data Model and Readiness Extension.docx` | Device check registry, field-level definitions for CGM/BP/scale |
| `Oros - CKM Data Readiness - Remediation Roles and Accountability.docx` | Source of the 7 canonical `responsible_role` strings |
| `Oros - CKM Data Readiness - Operational Governance Framework.docx` | Seven functional roles, upstream source for Remediation Roles |
| `Oros - CKM Data Readiness - Operational Care Model.docx` | Clinical workflow and care-team context |
| `Oros - CKM Data Readiness - Signal and Data Elements Table.docx` | Clinical signals the clean dataset should produce |
| `Oros - CKM Data Readiness - Agentic Layer Architecture.md` | Step 9 scope — not active |
| `Oros - CKM Data Readiness - Agentic Security Explainer.md` | Step 9 security model (runtime, sandboxing, prompt injection) — not active |
| `Oros - Dev Environment - Studio Setup - Apr 2026.md` | tmux, SSH, Neon connection, migration run-book |

When any doc conflicts with this file, the doc wins. When in doubt, ask.

---

## 15. Domain Context

- Terminologies: ICD-10 (diagnoses), RxNorm (medications), LOINC (labs + CGM metrics), SNOMED-CT (procedures)
- Use cases in scope: Diabetes Risk Stratification (primary demo), Hypertension Risk Strat, Care Coordination, VBC Reporting, HEDIS CDC
- Stakeholders: Hanieh Razzaghi (CHOP — clinical validation of thresholds/weights), Chime Ogbuji (terminology LLM — future), Kris Kowal (Endo runtime — post-POC)
- Deployment host: Regional node (ACO/IDN), not directly at clinical sites. POC targets UCHealth and supplementary feeds from Contexture (Colorado HIE).
