# Condition Module Schema — v0.1

CKM Data Readiness Infrastructure — Condition Module Schema Definition

**Scope:** Diabetes Risk Stratification only. This is the first condition module schema iteration. It is deliberately narrow — it covers exactly what the Diabetes Risk Stratification use case needs. Generalization to Hypertension, Heart Failure, and other conditions is deferred. The schema is expected to extend, not get retrofitted, when additional conditions are added.

**Status:** Draft for Hanieh validation. Thresholds, weights, and A1C check name references are proposed defaults pending clinical review.

**Architecture reference:** ADR Decision 2 (April 8, 2026) — Option C. Config file is the human-facing interface. Database is the runtime representation loaded at startup.

---

## 1. Scope and Design Principles

This schema supports exactly one use case — `diabetes_risk_stratification` — and is optimized for that shape. It does not attempt to be general across therapeutic areas.

Three principles drive the design:

**TA-agnostic engine, condition-specific config.** The check engine contains no diabetes logic. All diabetes-specific decisions (which variables, which checks, which thresholds, which weights, which pathway rules) live in this config. The engine reads the loaded config and executes without condition-specific code. This is the R1 principle in the Technical Specification.

**check_name as string reference.** The condition module references check names as strings (e.g., `"device_patient_linkage_cgm"`). These strings must already exist in the check registry (Technical Specification Section 2). This schema does not define new check types, does not propose a new `checks` table, and does not alter the check registry. If a referenced check name is not implemented as a scoring engine file, it is flagged as a dependency.

**Existing Data Model v2 is not migrated.** All runtime outputs are written to existing tables (`check_results`, `variable_readiness_scores`, `use_case_readiness`, `remediation_work_items`) using existing field names. One new runtime table (`use_case_pathway_results`) is introduced for pathway evaluation results that have no existing home. Three new config tables (`condition_modules`, `use_case_specifications`, plus the runtime pathway table) are additive — no ALTER TABLE on existing schema.

---

## 2. Config File — JSON Structure

**Location:** `conditions/diabetes/diabetes.config.json`

**Full config for Diabetes Risk Stratification:**

```json
{
  "schema_version": "0.1",
  "condition": {
    "condition_id": "diabetes",
    "display_name": "Diabetes",
    "description": "Type 1 and Type 2 Diabetes Mellitus. Covers patients with active ICD-10 E10.x or E11.x diagnosis.",
    "value_sets": {
      "diagnosis": {
        "code_system": "icd10",
        "codes": ["E10.*", "E11.*"]
      }
    }
  },
  "use_cases": [
    {
      "use_case_name": "diabetes_risk_stratification",
      "use_case_category": "risk_stratification",
      "display_name": "Diabetes Risk Stratification",

      "population_definition": {
        "eligibility_criteria": [
          {
            "criterion_id": "active_dm_diagnosis",
            "description": "Active diabetes diagnosis (ICD-10 E10.x or E11.x).",
            "source_table": "conditions",
            "code_system": "icd10",
            "code_patterns": ["E10.*", "E11.*"],
            "status_requirement": "active"
          },
          {
            "criterion_id": "qualifying_encounters",
            "description": "At least two qualifying encounters within the past 24 months.",
            "source_table": "encounters",
            "minimum_count": 2,
            "lookback_months": 24,
            "qualifying_classes": ["ambulatory", "outpatient"]
          },
          {
            "criterion_id": "active_enrollment",
            "description": "Patient is enrolled in a participating organization at time of evaluation.",
            "source_table": "patients",
            "requires_active_organization": true
          }
        ],
        "denominator_rule": "all_eligibility_criteria_pass"
      },

      "eligibility_checks": [
        {
          "check_name": "layer6_denom_riskstrat",
          "threshold": 1.0,
          "priority": "High",
          "remediation_defaults": {
            "phenotype": "Denominator Eligibility Failure",
            "responsible_role": "Primary Care Site",
            "action_required": "Confirm patient meets denominator eligibility: active diabetes diagnosis, minimum two qualifying encounters in past 24 months, active enrollment in participating organization."
          }
        }
      ],

      "variable_pathways": {
        "pathways": [
          {
            "pathway_id": "cgm_primary",
            "pathway_role": "primary",
            "variables": ["CGM Glucose"],
            "pass_criterion": "all_variables_ready"
          },
          {
            "pathway_id": "a1c_fallback",
            "pathway_role": "fallback",
            "variables": ["A1C"],
            "pass_criterion": "all_variables_ready"
          }
        ],
        "evaluation_order": ["cgm_primary", "a1c_fallback"],
        "result_values": ["primary_pass", "fallback_pass", "no_valid_pathway"],
        "derivation_rule": "Walk evaluation_order. Return primary_pass if cgm_primary satisfies pass_criterion. Else return fallback_pass if a1c_fallback satisfies pass_criterion. Else return no_valid_pathway."
      },

      "variables": [
        {
          "variable_name": "CGM Glucose",
          "pathway_membership": ["cgm_primary"],
          "source_tables": ["cgm_readings", "cgm_window_metadata"],
          "recency": {
            "mode": "window",
            "window_days": 14,
            "reference_anchor": "cgm_window_metadata.reference_date"
          },
          "checks": [
            {
              "check_name": "device_patient_linkage_cgm",
              "threshold": 1.0,
              "priority": "High",
              "weight": 0.40,
              "remediation_defaults": {
                "phenotype": "Identity Linkage Failure",
                "responsible_role": "Technology Vendor",
                "action_required": "Standardize patient ID handling in the device ingestion pipeline. Implement a crosswalk between device UUID and site patient ID. Program Coordinator triages; Technology Vendor owns the fix."
              }
            },
            {
              "check_name": "device_temporal_density_cgm_14d",
              "threshold": 0.70,
              "priority": "High",
              "weight": 0.40,
              "remediation_defaults": {
                "phenotype": "Device Temporal Density Gap",
                "responsible_role": "Primary Care Site",
                "action_required": "Address CGM device adherence. Flag patients with coverage below 70% over the 14-day window for outreach.",
                "note": "Dual root cause: (a) adherence gap — Primary Care Site outreach, as defined in action_required; (b) transmission gap — if raw readings exist in clusters with unexplained gaps, root cause is a Technology Vendor pipeline configuration issue. In transmission gap cases, responsible_role escalates to Technology Vendor with action: Review device data transmission pipeline for gaps between device and platform."
              }
            },
            {
              "check_name": "device_derived_metric_consistency_cgm",
              "threshold": 0.02,
              "priority": "Medium",
              "weight": 0.20,
              "remediation_defaults": {
                "phenotype": "Derived Metric Concordance Failure",
                "responsible_role": "Policy/Regulatory",
                "action_required": "Confirm which TIR computation method is acceptable for VBC reporting and align with emerging CGM data dictionary standards before submitting platform-recomputed values. Flag for governance review — this is a policy decision, not a data fix."
              }
            }
          ]
        },
        {
          "variable_name": "A1C",
          "pathway_membership": ["a1c_fallback"],
          "source_tables": ["observations"],
          "code_references": {
            "loinc": ["4548-4"]
          },
          "recency": {
            "mode": "lookback",
            "lookback_months": 6,
            "reference_anchor": "evaluation_date"
          },
          "checks": [
            {
              "check_name": "layer1_notnull_fields_a1c",
              "threshold": 1.0,
              "priority": "High",
              "weight": 0.50,
              "remediation_defaults": {
                "phenotype": "Missing Required Field",
                "responsible_role": "Primary Care Site",
                "action_required": "Populate required A1C fields at the source. Confirm lab result capture in the EHR."
              }
            },
            {
              "check_name": "layer2_ranges_numeric_a1c",
              "threshold": 0.98,
              "priority": "High",
              "weight": 0.30,
              "remediation_defaults": {
                "phenotype": "Provider Input Error",
                "responsible_role": "Primary Care Site",
                "action_required": "Verify A1C values fall within plausible clinical range (2.0%–20.0%). Investigate unit errors."
              }
            },
            {
              "check_name": "layer5_date_concordance_a1c",
              "threshold": 0.97,
              "priority": "Medium",
              "weight": 0.20,
              "remediation_defaults": {
                "phenotype": "Date Format Error",
                "responsible_role": "Technology Vendor",
                "action_required": "Reconcile A1C result date with the associated encounter date. Correct date concordance at the interface layer."
              }
            }
          ]
        }
      ],

      "computation": {
        "continuous_score": {
          "method": "pathway_weighted_average",
          "description": "Weighted average of variable_readiness_scores.readiness_score for variables in the first passing pathway. If no pathway passes, computed over variables in the last evaluated pathway so the score still reflects remediation progress.",
          "input_source": "variable_readiness_scores.readiness_score",
          "weights_source": "variables[].checks[].weight, aggregated per variable",
          "range": [0.0, 1.0],
          "written_to": "use_case_readiness.fitness_score"
        },
        "status_label": {
          "method": "threshold_bands",
          "description": "Discrete label derived from the continuous score using condition-specific threshold bands.",
          "thresholds": [
            { "status": "READY",           "min_score": 0.85, "max_score": 1.00 },
            { "status": "PARTIALLY_READY", "min_score": 0.50, "max_score": 0.85 },
            { "status": "NOT_READY",       "min_score": 0.00, "max_score": 0.50 }
          ],
          "written_to": "use_case_readiness.overall_status"
        }
      },

      "output_definition": {
        "primary_output": "Risk stratification eligibility flag per patient.",
        "supporting_outputs": ["pathway_result", "fitness_score", "overall_status", "blocking_variables"],
        "output_tables": {
          "use_case_readiness": "overall_status, fitness_score, required_variables, blocking_variables, partial_variables",
          "use_case_pathway_results": "pathway_result, active_pathway_id"
        }
      }
    }
  ]
}
```

**The `computation` block is optional** (7c genericity finding, 2026-07-06). A use case without a `computation` block is a boolean/pathway-only module: readiness derives from pathway results alone, with no continuous score. Downstream contract: the engine skips score computation entirely when the block is absent — no `fitness_score` is written, and `overall_status` derives directly from the pathway result (pathway passes → READY, else NOT_READY). The diabetes use case carries the full block; the 7c stub modules omit it.

---

## 3. Mapping to Data Model v2

Every runtime output field maps to an existing Data Model v2 column. One new runtime table is introduced for pathway results.

### 3.1 Where each output is written

| Config element                              | Existing Data Model v2 field                          | Notes |
|---------------------------------------------|-------------------------------------------------------|-------|
| checks[].check_name                         | `check_results.check_name` (VARCHAR 64)               | String reference only. No new check entity table. |
| checks[].priority                           | `check_results.priority` (VARCHAR 8)                  | Values: High, Medium, Low. |
| checks[].threshold                          | `check_results.threshold` (DOUBLE PRECISION)          | Per-check threshold. |
| variables[].variable_name                   | `check_results.variable_name`, `variable_readiness_scores.variable_name` (VARCHAR 64) | |
| Variable readiness (overall)                | `variable_readiness_scores.overall_status` (VARCHAR 16) | Values: READY, PARTIALLY_READY, NOT_READY. |
| computation.continuous_score                | `use_case_readiness.fitness_score` (DOUBLE PRECISION) | Range 0–1. |
| computation.status_label                    | `use_case_readiness.overall_status` (VARCHAR 16)      | Values: READY, PARTIALLY_READY, NOT_READY. |
| Required variables for active pathway       | `use_case_readiness.required_variables` (TEXT[])      | Set to the active pathway's variables at write time. |
| Variables blocking the active pathway       | `use_case_readiness.blocking_variables` (TEXT[])      | |
| Variables partially blocking                | `use_case_readiness.partial_variables` (TEXT[])       | |
| remediation_defaults.action_required        | `remediation_work_items.action_required` (TEXT)       | Used as default text when engine generates a work item from a FAIL check. |
| remediation_defaults.responsible_role       | `remediation_work_items.responsible_role` (VARCHAR 32)| Canonical values per Operational Governance Framework. |
| remediation_defaults.phenotype              | `remediation_work_items.phenotype` (VARCHAR 64)       | |
| **pathway_result**                          | `use_case_pathway_results.pathway_result` (**new**)   | No existing home. See Section 4. |

### 3.2 Canonical `responsible_role` values (VARCHAR 32)

From the Operational Governance Framework. Use these exact strings:

- `Primary Care Site`
- `Specialty Partner`
- `Regional Data Node`
- `Technology Vendor`
- `Program Coordinator`
- `Network/Payer`
- `Policy/Regulatory`

**Enforcement pattern.** These seven values are enforced at two layers. (1) The application layer: `scoring/lib/config_loader.js` validates every `responsible_role` value in loaded condition module configs against this exact list and fails at startup if any value does not match. This catches typos early with clear error messages naming the offending use case, check, and received value. (2) The database layer: a CHECK constraint on `remediation_work_items.responsible_role` enforces the same list at INSERT time (V010). This is a backstop that catches any write bypassing the scoring engine (manual SQL, future scripts, debugging sessions). Both layers are required: application validation gives helpful early errors, DB enforcement guarantees the invariant. The same pattern applies to other canonical enumerations: `pathway_result`, `use_case_category`, and any future enumerated value added to the schema.

---

## 4. New Condition Module Tables

Three new tables. Two store the loaded config. One stores pathway evaluation results per patient per session.

**Enforcement note.** The V010 migration creating these three tables also adds CHECK constraints on enumerated string fields: `use_case_specifications.use_case_category` (values: `risk_stratification`, `care_coordination_delivery`, `vbc_reporting`), `use_case_pathway_results.pathway_result` (values: `primary_pass`, `fallback_pass`, `no_valid_pathway`), and a retrofit CHECK on `remediation_work_items.responsible_role` (the seven canonical values in §3.2). V010 also adds a structural invariant CHECK, `ck_use_case_pathway_results_active_pathway_null`, enforcing the §4.3 rule that `active_pathway_id` is NULL if and only if `pathway_result = 'no_valid_pathway'`. Application-layer validation in `scoring/lib/config_loader.js` enforces the same constraints at config load time. See §3.2 for the enforcement pattern.

### 4.1 `condition_modules`

One row per loaded condition. Populated by the config loader at startup.

| Field            | Type                 | Null? | Description |
|------------------|----------------------|-------|-------------|
| condition_id     | VARCHAR(32)          | N     | Primary key. E.g., `diabetes`. |
| display_name     | VARCHAR(128)         | N     | E.g., `Diabetes`. |
| description      | TEXT                 | Y     | Condition description. |
| schema_version   | VARCHAR(16)          | N     | Config schema version this module conforms to. |
| config_json      | JSONB                | N     | Full loaded config as source-of-truth snapshot. |
| loaded_at        | TIMESTAMPTZ          | N     | Timestamp of config load. |

### 4.2 `use_case_specifications`

One row per use case. Condition modules may have multiple use cases; for Diabetes, this v0.1 schema supports only `diabetes_risk_stratification`. Additional use cases (care coordination, VBC reporting) are future rows.

| Field                 | Type                 | Null? | Description |
|-----------------------|----------------------|-------|-------------|
| use_case_name         | VARCHAR(64)          | N     | Primary key. Matches `use_case_readiness.use_case_name`. |
| condition_id          | VARCHAR(32)          | N     | FK → `condition_modules.condition_id`. |
| use_case_category     | VARCHAR(32)          | N     | `risk_stratification` \| `care_coordination_delivery` \| `vbc_reporting`. |
| display_name          | VARCHAR(128)         | N     | Human-readable label. |
| population_definition | JSONB                | N     | Eligibility criteria and denominator rule. |
| variable_pathways     | JSONB                | N     | Pathway definitions, evaluation order, result derivation rule. |
| variables             | JSONB                | N     | Full variables array with per-check config and remediation defaults. |
| computation           | JSONB                | N     | continuous_score and status_label rules. |
| output_definition     | JSONB                | N     | Output specification. |
| loaded_at             | TIMESTAMPTZ          | N     | Timestamp of load. |

The JSONB columns mirror the config file structure directly. The scoring engine queries JSONB paths at runtime. This keeps the database a faithful representation of the governance artifact (the config file) without an extensive normalized schema that would drift from the config over time.

### 4.3 `use_case_pathway_results`

One row per patient per use case per demo session. The explicit pathway evaluation result that has no home in the existing Data Model.

| Field               | Type                 | Null? | Description |
|---------------------|----------------------|-------|-------------|
| pathway_result_id   | UUID                 | N     | Primary key. |
| patient_id          | VARCHAR(32)          | N     | FK → `patients` (session-aware composite). |
| use_case_name       | VARCHAR(64)          | N     | FK → `use_case_specifications.use_case_name`. |
| pathway_result      | VARCHAR(32)          | N     | `primary_pass` \| `fallback_pass` \| `no_valid_pathway`. |
| active_pathway_id   | VARCHAR(64)          | Y     | The pathway that determined the result. NULL when result is `no_valid_pathway`. |
| organization_id     | VARCHAR(16)          | N     | ORG001–ORG003. Carried directly for UI filtering. |
| evaluated_at        | TIMESTAMPTZ          | N     | Timestamp of evaluation. |
| demo_session_id     | UUID                 | N     | Session reference. Part of session-aware FKs. |

**Relationship to `use_case_readiness`:** One-to-one on the natural key `(patient_id, use_case_name, demo_session_id)`. No FK constraint added to `use_case_readiness`; the join is at the application and query layer. This avoids any ALTER TABLE on existing schema.

**Index:** `(patient_id, use_case_name, demo_session_id)` for the scoring engine's join back to `use_case_readiness`.

---

## 5. Check Name References

The condition module references check names as strings. Each string must exist in the check registry (Technical Specification Section 2 and Section 9). Implementation status varies.

### 5.1 Implemented checks (scoring engine files exist)

- `device_patient_linkage_cgm`
- `device_temporal_density_cgm_14d`

### 5.2 Registry-defined, not yet implemented (dependency for this schema)

These names follow the locked naming convention from Technical Specification Table 3 (short check name + variable tag). They are referenced by the A1C variable and the eligibility_checks array in this config. A scoring engine file must exist for each before the diabetes module is functionally complete.

- `layer6_denom_riskstrat` — Technical Specification Section 2, Table 1 (use-case-level denominator check)
- `device_derived_metric_consistency_cgm` — Technical Specification Section 9
- `layer1_notnull_fields_a1c`
- `layer2_ranges_numeric_a1c`
- `layer5_date_concordance_a1c`

**Implication for build:** These five check implementations are on the critical path for a functional Diabetes Risk Stratification pipeline. The scoring engine directory needs corresponding files (e.g., `scoring/checks/layer6_denom_riskstrat.js`, `scoring/checks/layer1_notnull_fields_a1c.js`).

---

## 6. Scoring Engine Behavior Contract

Observable behaviors the engine must produce from this config. This is not engine design — it is the contract the engine satisfies.

**Per patient per use case per demo session:**

1. Evaluate eligibility checks and write results to `check_results`. If `layer6_denom_riskstrat` FAIL, generate a remediation work item and set `use_case_readiness.overall_status` to `NOT_READY`. Continue evaluating variable checks regardless, so remediation progress is visible even for ineligible patients.
2. Evaluate all checks for all variables in all pathways. Write results to `check_results`.
3. Aggregate check results to variable-level readiness. Write to `variable_readiness_scores`.
4. Evaluate pathways in the order specified by `evaluation_order`. Determine `pathway_result` as the first pathway where `pass_criterion` is satisfied, else `no_valid_pathway`. Write to `use_case_pathway_results`.
5. Compute the continuous score using `pathway_weighted_average` over the variables of the active pathway (or the last-evaluated pathway if no pathway passes). Write to `use_case_readiness.fitness_score`.
6. Apply threshold bands to the continuous score to derive `overall_status`. Write to `use_case_readiness.overall_status`.
7. For every FAIL check, generate a `remediation_work_items` row using the `remediation_defaults` from this config as baseline `action_required`, `responsible_role`, and `phenotype` values.

**Boolean/pathway-only modules (no `computation` block):** the `computation` block is optional (7c genericity finding, 2026-07-06). When it is absent, the engine skips score computation — step 5 is not performed and no `fitness_score` is written; in step 6, `overall_status` derives directly from the pathway result (pathway passes → READY, else NOT_READY) instead of threshold bands. All other steps apply unchanged.

**What the engine does not do:**

- It does not modify the raw data.
- It does not interpret condition context (ICD-10 codes, clinical semantics) beyond applying the code patterns in the config.
- It does not choose thresholds, weights, or role assignments. All of those are config-driven.

---

## 7. Open Questions for Hanieh

Items requiring clinical informatics validation before the config is locked.

1. **Check weights.** The proposed weights (CGM: 0.40/0.40/0.20; A1C: 0.50/0.30/0.20) are placeholders. Hanieh should validate that the relative weight of identity linkage vs. temporal density vs. derived metric consistency reflects clinical priority for risk stratification.

2. **Threshold bands.** The proposed bands (READY ≥ 0.85, PARTIALLY_READY ≥ 0.50, NOT_READY < 0.50) are placeholders. These should be validated against clinical precedent — NCQA, ADA/ATTD, and any ACO-specific thresholds used in Colorado rural settings.

3. **A1C recency window.** The Architecture Specification says "at least one result within the past 6 months" for risk stratification. Confirm 6 months is correct for rural primary care context, or whether it should align with HEDIS (12 months) or another benchmark.

4. **Pathway evaluation sequencing.** When CGM passes as the primary pathway, should A1C checks still be evaluated and written to `check_results` (for completeness and UI transparency), or skipped for efficiency? Current contract assumes "evaluate everything, use only the winning pathway for use case scoring."

5. **Required_variables semantics.** When the active pathway is `cgm_primary`, should `use_case_readiness.required_variables` be `["CGM Glucose"]` (reflecting the active pathway) or `["CGM Glucose", "A1C"]` (reflecting all pathway-eligible variables)? The current contract proposes the former.

6. **Denominator reporting.** Does the Diabetes Risk Stratification output need to report both numerator (READY patients) and denominator (eligible patients) explicitly, beyond the per-patient readiness record? If so, this is a new aggregated output — not currently in Data Model v2.

7. **Check registry gap.** Four check names referenced here do not yet have scoring engine implementations (see Section 5.2). Hanieh validation is not strictly required for the implementation itself, but the naming convention should be confirmed as consistent with what Hanieh and the registry maintainers expect for future conditions.

---

## 8. Open Questions for Design Review

Items requiring architecture decision before the schema is locked.

1. **`use_case_pathway_results` table placement.** Is this considered a "new condition module table" (permitted by the Build Phase scope) or does it require separate decision since pathway_result is runtime output, not config? Recommendation: treat as permitted, since it is added as part of this schema work and has no existing home.

2. **Directory name collision.** The config directory is `conditions/` at the repo root. The Tier 1 database table for ICD-10 conditions is also `conditions`. These do not technically conflict (one is a filesystem path, the other a table name), but it is worth noting for the scoring engine documentation so the distinction is explicit.

3. **Use case category mapping.** The Architecture Decision Record identified three categories: `risk_stratification`, `care_coordination_delivery`, `vbc_reporting`. This schema uses `risk_stratification`. No action needed, flagged only for completeness.

4. **Value set authority.** The condition module carries `value_sets.diagnosis.codes: ["E10.*", "E11.*"]`. The ADR notes that value sets will eventually be served from a FHIR terminology service (HAPI FHIR upgrade path). For POC, they live in the config. Confirm this is acceptable for v0.1.

5. **Eligibility evaluation location.** **RESOLVED.** Eligibility is implemented as checks using the existing `layer6_denom_riskstrat` check name, not as a silent pre-scoring gatekeeper. This makes eligibility failures visible in `check_results`, generates remediation work items routed to Primary Care Site, and enables the UI to show why a patient was excluded from the denominator. See `eligibility_checks` array in Section 2, updated scoring behavior in Section 6 step 1, and added dependency in Section 5.2.

---

## 9. What This Schema Does Not Do

Explicit non-goals. These are out of scope for v0.1 and should not be added without reopening the design.

- It does not support more than two pathways per use case. Diabetes Risk Stratification needs exactly primary and fallback. Three-pathway logic (e.g., CGM → SMBG logbook → A1C) is a future extension.
- It does not support conditional variable requirements (e.g., "A1C is required only if patient is over 65"). All variables are unconditionally assigned to their pathways.
- It does not support multi-condition use cases (e.g., CKM joint diabetes + hypertension stratification). Each condition module is independent.
- It does not support dynamic thresholds (e.g., "threshold is 0.70 in year one, 0.80 in year two"). Thresholds are static per loaded config version.
- It does not include value sets beyond the diagnosis codes needed for eligibility. Medication value sets (insulin, GLP-1, SGLT2) are referenced in the Architecture Specification as optional context variables but are not included in this v0.1 schema. They can be added when the use case expands beyond pathway-primary risk stratification.

---

## 10. Versioning

This is schema version `0.1`. The `schema_version` field at the top of every config file declares which schema version it conforms to. Future versions should:

- Preserve backward compatibility within a major version.
- Break compatibility only at major version increments.
- Be accompanied by a migration note in this document explaining what changed and what config files need to update.

---

## 11. Relationship to Other Documents

- **Architecture Specification (v1.2, April 2026)** — Defines the object model (Variable, Condition Module, Use Case Specification) this schema implements.
- **Technical Specification** — Defines the check registry whose check names this schema references as strings.
- **Data Model (v2)** — Defines the existing tables and field names this schema's runtime outputs are written to.
- **Architecture Decision Record (April 2026)** — Decision 2 establishes Option C (config file + database). This schema is the concrete implementation of that decision.
- **Remediation Roles and Accountability** — Defines the canonical `responsible_role` values this schema references in remediation defaults.
- **Operational Governance Framework** — Defines the seven functional roles this schema maps to.
- **Build Plan (April 2026)** — Step 7 identifies this schema as an immediate prerequisite before the `conditions/` directory is populated.
