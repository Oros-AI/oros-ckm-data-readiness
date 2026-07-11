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

CKM Data Readiness — a data quality infrastructure for Cardio-Kidney-Metabolic conditions. Oros is the **neutral steward of shared open infrastructure**, serving all parties (rural health programs, HIEs, payers, health systems) and competing with none. Deployment is **multi-state and opportunistic** — deployed wherever motivated sites, funding, and partners emerge. The POC targets Kansas, Montana, and Colorado, with Kansas the likely first deployment (the Build Plan's Strategic Context owns this; see it for per-state status).

The POC demonstrates the arc:

```
Load → Normalize → Score → Surface Blockers → Remediate → Re-score → Unlock Analytics
```

Repo layout:
- `src/` — React/Vite/TypeScript wizard UI (Step 8 scope)
- `scoring/` — Node ESM scoring engine (Step 7 scope)
- `scripts/` — Data loading and session reset (complete)
- `conditions/` — Condition module config files (new in Step 7)
- `migrations/` — Neon schema migrations (V001–V015, all applied)
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
- **Session-awareness.** Every scoring/remediation write carries `demo_session_id`. Writers are idempotent: `INSERT ... ON CONFLICT DO UPDATE` (upsert) on the tuple the writer owns — never `DELETE + INSERT`.
- **CKM_DIRECT** is exported in `~/.zshrc` on Studio. Never hardcode credentials.
- **No raw data in the agentic layer.** The agentic sidecar (Step 9) reads check result records only (~200 bytes each), never Tier 1 rows. The Step 7 scoring engine is fully deterministic and runs without any AI.
- **Condition-specific logic does not live in the engine.** All thresholds, weights, variables, pathways, and remediation defaults come from condition module configs. Adding a condition must not require engine code changes.

---

## 3. Current Build State

### Verified baseline — as of 2026-07-11, code HEAD `836aac9`, doc commits may sit on top (judged from code + DB, not from checkboxes)

This section reflects what is actually on disk and in Neon. An earlier version of this section claimed Step 7 work was complete; that was inaccurate and is corrected below. **Do not trust Build Plan checkboxes over this baseline.**

#### What is real
- **21-table schema (V001–V015): live.** In Neon database `ckm_readiness` (project `ckm-readiness` / `morning-dew-32497310`, default branch `production`). All FK constraints and indexes; `use_case_specifications.computation` is nullable since V011. **Note: the data is in the `ckm_readiness` database, not the default `neondb`.**
- **All three demo datasets loaded as raw Tier-1 data:** 3 `demo_sessions`, 150 patients, ~248k `cgm_readings`. Session IDs match Section 6.
- **`scripts/` (data loading + session reset): complete.**
- **Docs locked:** Condition Module Schema v0.1, Architecture Specification, ADR (Apr 2026), and the June demo set (incl. the locked Demo UI/UX Specification and the V010 Migration Spec).

#### Step 7 — 7a–7l COMPLETE; Step 7 done — engine runs all five stages end-to-end, acceptance verified against Datasets B and C
- **7a — V010 applied (2026-06-22).** `migrations/V010__condition_modules.sql` applied to `ckm_readiness`; the schema is now **21 tables**. The three condition-module tables (`condition_modules`, `use_case_specifications`, `use_case_pathway_results`) exist, and the retrofit CHECK on `remediation_work_items.responsible_role` is in place. Verified via spec §5 (all checks passed).
- **7b — config loader + db scaffolding complete.** `scoring/lib/db.js` (pg pool from `CKM_DIRECT` + `withTransaction`) and `scoring/lib/config_loader.js` exist and are verified against `ckm_readiness` (clean load, located-error rollback, idempotent reload; exit codes 0/0/1). The config tables now hold the loaded diabetes module — these are config-tier, **not** scoring output.
- **7c — complete (verified 2026-07-06).** All four configs load clean: exit 0, 4 `condition_modules` rows, 4 `use_case_specifications` rows (`diabetes_risk_stratification`, `hypertension_risk_stratification`, `care_coordination`, `vbc_reporting`). The three stubs express boolean aggregation as a degenerate single pathway — no computation block.
- **7c genericity finding (2026-07-06), resolved at both enforcement layers:** the `computation` block is **optional** — absent = boolean/pathway-only module (readiness from pathway results alone, no continuous score). Loader validation relaxed (`config_loader.js`) and **V011** dropped the NOT NULL on `use_case_specifications.computation`; Condition Module Schema §2/§4.2/§6 updated to match.
- **7d — complete (2026-07-06).** Three pieces, all behaviorally verified against Dataset A:
  - **V012** added the unique upsert arbiter `uq_check_results_upsert` on `check_results (check_name, patient_id, demo_session_id)`, replacing the non-unique `idx_check_results_patient_check` — the pre-flight found `ON CONFLICT` had no arbiter.
  - **`scoring/lib/writer.js`** (idempotent batched UNNEST upsert — the only module permitted to write `check_results`) and **`scoring/lib/constants.js`** (`EVALUATION_DATE = '2024-11-14'`; date-anchored checks anchor here, never `NOW()`).
  - **`scoring/checks/layer6_denom_riskstrat.js`** — the eligibility/denominator check, config-driven (criteria read from `use_case_specifications.population_definition`, nothing hardcoded). First built check; establishes the module shape. Verified: 50 rows (36 PASS / 14 NOT_APPLICABLE / 0 FAIL), idempotent across re-runs.
- **7e — complete (2026-07-07, commit `8d6aef7`).** `scoring/checks/device_derived_metric_consistency_cgm.js` — the Bug 6 TIR concordance check (device scope, layer null): recomputes TIR from raw `cgm_readings` over the `cgm_window_metadata` analysis window and compares to the stored `derived_from_cgm` observation at the 2pp tolerance. Config-params approach: the 70/180 mg/dL bounds and 0.70 density floor live in a `params` object on the check's config entry — no loader change, no migration (variables JSONB passthrough; schema still V012). Density precondition (computed live from joinable readings) routes Bug 1/Bug 2 patients to NOT_APPLICABLE so Bug 6 surfaces only on its 3 seeded patients and each bug lands on its own check. Gate verified against all three sessions (25 rows each — the TIR cohort, not all 50): A 25 PASS / 0 FAIL / 0 N_A; B 9/3/13 with FAILs exactly PAT000046–48; C 12/0/13 (Bug 6 fully resolved). Idempotent; `check_results` cleaned back to 0 post-gate.
- **7e2 — complete (2026-07-07, commits `c218e01` + `5716f4a`; sub-step created on doc commit `d488415`).** Two device checks, both const-export modules with runtime config-drift assertions (ending 7e's mutable-let pattern):
  - **`scoring/checks/device_patient_linkage_cgm.js`** — Bug 1 identity linkage: binary over the 25-patient `cgm_available` cohort, linkage derived LIVE from the join (`cgm_window_metadata.actual_readings` is stale for exactly these patients — healthy counts for unjoinable streams). Gate: A 25 PASS; B and C each 20 PASS / 5 FAIL, FAILs exactly PAT000016–020 (Bug 1 unresolved in C by design). Evidence is per-patient only; orphan device UUIDs deliberately not attributed — building that crosswalk IS the remediation.
  - **`scoring/checks/device_temporal_density_cgm_14d.js`** — Bug 2 temporal density: shares 7e's density definition verbatim (`COUNT(r.*)` joinable in-window / `expected_readings`, `system_time::date BETWEEN` inclusive). Three-way status with a linkage precondition (zero joinable → NOT_APPLICABLE) so Bug 1 patients don't double-surface here. Gate: A 25/0/0; B and C each 12 PASS / 8 FAIL / 5 N_A, byte-identical B→C, FAILs exactly PAT000001–008 (Bug 2 data unchanged in C by design — the platform's detect/flag/route half is what "partially remediated" refers to). No engine-side adherence-vs-transmission logic; the config note is human triage guidance.
  - Known edge (recorded, not acted on): if joinable readings ever exceeded `expected_readings` (duplicate ingestion), density > 1.0 would violate the 0–1 CHECK on `score` and throw. Cannot arise in current datasets (max 0.9700); production-hardening question, not a POC item.
- **7f — complete (7 of 7 checks; 2026-07-07/08/09, commits `cc5abad` + `da31307` + `b6e07dd` + `7a9401e` + `a1fce34` + `5503e7e` + `840deed`).** All 7f checks are fully config-driven (LOINC set from the variable's `code_references.loinc`, check-specific `params` on the check entry loaded via JSONB passthrough — no loader change, schema still V012 — diagnosis cohort from `condition.value_sets.diagnosis.codes`, anchor from `EVALUATION_DATE` as a YYYYMMDD string compare). Checks 1–2 are layer-1 presence + required-field audits (presence-ever semantics — recency belongs to other layers; `check_layer='layer1'` per the Data Model enum).
  - **`scoring/checks/layer1_notnull_fields_a1c.js`** (check 1, `cc5abad`) — A1C presence audit, DM-cohort scoped (36 patients); `params.required_fields = [value, effective_date, value_units]`. Gate: 36 rows/session, **35 PASS / 1 FAIL = PAT000041 in all of A/B/C — identical by design** (no seeded bug targets A1C; the check shapes the a1c_fallback pathway, not the bug arc). Idempotent; `check_results` back to 0 post-gate. The PAT000041 carry-forward now lives in the Dataset reload ledger below.
  - **`scoring/checks/layer1_notnull_fields_smoking.js`** (check 2, `da31307`) — Bug 3 smoking presence audit. Shape-twin of `layer1_notnull_fields_a1c`; I10-active cohort (35 patients/session), exact-code `ANY` match with a `.*`-pattern guard (throws rather than silently exact-matching a pattern), strict `clinical_status='active'`, `params.required_fields = [value, effective_date]` (units/time excluded — coded LOINC answers, units don't apply), `score: null` binary rows. Gate: A 35 (15 PASS / 20 FAIL), B and C each 35 (9/26), byte-identical B→C; delta vs A exactly PAT000031–036 (Bug 3, unresolved in C by design); all FAILs pure presence (0 smoking rows — zero field-audit FAILs); idempotent; `check_results` cleaned to 0. The 20 A-side FAILs are a dataset gap, not a check defect — see the Dataset reload ledger below.
  - **`scoring/checks/layer2_ranges_numeric_a1c.js`** (check 3, `b6e07dd`) — first value-plausibility check (not a shape-twin). Cohort: 36, inherited check-1 predicate verbatim (`LIKE ANY` E10%/E11% + NULL-or-active); scope `code='4548-4'` anchored to `EVALUATION_DATE`. Plausible range lives in config `params` (2.0–20.0 `%`), **shape-validated (finite, min < max) not value-matched** — bounds are config-owned per Core Constraint §2, not module constants. Per-patient score = fraction-in-range, strict PASS (every qualifying row in range); zero qualifying rows → NOT_APPLICABLE with null score. Guards throw loudly rather than degrade: non-numeric value, `value_units` mismatch (incl. NULL, via `IS DISTINCT FROM`). PAT000041 → NOT_APPLICABLE here vs check 1's FAIL on the same patient — deliberate ownership split: layer1 owns presence, layer2 owns plausibility of values that exist. Gate: 36 rows/session, 35 PASS / 0 FAIL / 1 N_A, byte-identical A/B/C (no seeded A1C bug), idempotent, `check_results` cleaned to 0.
  - **`scoring/checks/layer5_date_concordance_a1c.js`** (check 4, `7a9401e`) — **first B≠C EHR check; first check writing fractional scores.** Cohort/obs-scope inherited verbatim from checks 1/3; qualifying = encounter-linked obs, joined session-scoped ON (encounter_id, demo_session_id) — encounters PK is composite. Concordance = **string equality** at `params.max_delta_days = 0` (config params), **no date parsing on the operative path** — one comparison classifies slash formats, calendar-invalid values (`20242007`), and valid-but-wrong dates (`20240506`). Unlinked obs excluded from numerator and denominator; dangling links throw (none exist). Schema still V012. Gate: A 36 rows (35 PASS / 0 FAIL / 1 N_A); B 36 (31/4/1, FAILs exactly PAT000016 @ 6/7, PAT000018 @ 7/8, PAT000021 @ 4/5, PAT000027 @ 5/6); C 36 (33/2/1, FAILs exactly PAT000021, PAT000027); N_A = PAT000041 (null score) in all three; **B ≠ C by design** (Bug 5 partial remediation: slash-format dates fixed in C, ENC000246/ENC000294 unchanged); idempotent; `check_results` cleaned to 0.
    - Known edge (recorded, not acted on): in the unexercised `max_delta_days > 0` branch, a regex-valid calendar-invalid day (e.g., `20240230`) would make `TO_DATE` throw; cannot arise in current datasets; production hardening, not a POC item.
  - **Carry-forward — `check_layer` dual-enforcement gap.** The column has a documented enum (`'layer1'`..`'layer5'`) but no DB CHECK constraint — schema-change candidate, not a 7f item.
  - **RESOLVED (Decision 3, 2026-07-09) — threshold semantics.** Was: is `check_results.threshold` status-defining or aggregation metadata? Check 4 has a strict all-concordant status rule with threshold 0.97 — self-consistent only because max obs/patient = 9 (any imperfect score ≤ 8/9 ≈ 0.889 < 0.97). Ratified: provenance metadata — see the 7g decisions block below.
  - **Carry-forward for 7h — Bug 5 dings the a1c_fallback pathway in B/C** through check 4's 0.20 weight, and the affected patients (PAT000016/018) overlap Bug 1's device-side patients — narratively coherent, but the pathway-evaluator thread must see this flagged.
  - **`scoring/checks/layer3_mapped_values.js`** (check 5, `a1fce34`) — Bug 4, medications/RxNorm; the first care_coordination check. Cohort 49 (active DM-or-HTN from `population_definition`: pattern-or-exact code match with tail-only `.*` guard, strict `clinical_status = status_requirement`). Validity = membership in `params.valid_codes` (12-code config-owned set, shape-validated) — membership, not format: `999999`/`00000` are format-clean numerics only the set catches. Row scope is ALL medications regardless of `medications.status` (terminology validity is status-independent; seeded MED000378 is `'stopped'` and stays in scope by design). Score = valid/total, strict PASS at 1.0; zero med rows → NOT_APPLICABLE (policy implemented, unexercised — all 49 cohort patients have meds). `code_type` guard from `code_references.code_system` throws on non-rxnorm rows. Gate: A 49/0/0 all scores 1.0; B 46 PASS / 3 FAIL, FAILs exactly PAT000008 (12/13), PAT000015 (17/18), PAT000032 (7/8), each evidence naming its seeded invalid code; C identical to A (Bug 4 fully resolved); idempotent; `check_results` cleaned to 0.
    - `observed_value` JSON-evidence shape approved (deviation from the spec's bare-string wording for FAIL); the evidence-convention-convergence question is parked for 7g/fixture-export.
  - **RESOLVED — Dataset B's 89-vs-90 E11.9 row identified:** `CND000222`/PAT000024, `E11.9 → E1X.21` in B only — a seeded Bug 4 FAIL target (layer2_value_standards), no dataset action needed.
  - **`scoring/checks/layer2_value_standards.js`** (check 6, `5503e7e`) — Bug 4, conditions/ICD-10; twin of `layer3_mapped_values` pointed at the conditions table. Cohort 49 (same care_coordination population predicate); validity = membership in `params.valid_codes` (12-code config-owned ICD-10 set — membership not format: `Z99.99X` is shape-plausible and only fails existence). Validated row set is ALL condition rows regardless of `clinical_status` (`resolved` rows still need valid codes — PAT000040's 5/7 includes its two resolved E78.5 rows in the denominator); the cohort predicate stays strict-active. `code_type` guard from `code_references.code_system` (`icd10`). N_A branch kept for twin symmetry, structurally unreachable (cohort membership guarantees ≥1 condition row). Gate: A 49/0/0 all scores 1.0; B 47 PASS / 2 FAIL, FAILs exactly PAT000024 (7/8 = 0.875, evidence `E1X.21`) and PAT000040 (5/7 ≈ 0.714, evidence `410.9,Z99.99X`); C ≡ A per-patient (Bug 4 fully resolved); idempotent; `check_results` cleaned to 0.
  - **`scoring/checks/layer5_date_concordance.js`** (check 7, `840deed`) — Bug 5, vbc_reporting/encounters; the final 7f check and the **first with an encounter-derived cohort** (`qualifying_encounters` criterion from `population_definition`, layer6 mechanism verbatim: `class = ANY(qualifying_classes)`, `^\d{8}$` guard, lexicographic string window anchored to `EVALUATION_DATE`, no encounter-status filter). Cohort 49 — PAT000031 excluded in all sessions (0 qualifying encounters, session-invariant). Validation row scope = **ALL encounter-linked facts** across observations/conditions/medications (`effective_date` / `date_recorded` / `date_written`), deliberately broader than the cohort predicate (class/status/window-independent): ENC000194 sits outside the 24-month window and ENC000417 has no linked observations — a cohort-scoped or obs-only row set would silently miss seeded targets. Concordance = string equality at `params.max_delta_days = 0` (config-owned), with check 4's generalized `>0` path (parse guards, `20240230` edge) carried verbatim. Threshold 1.0 coincides with the strict all-facts-concordant status rule **by definition** (contrast check 4's 0.97 metadata threshold). Dangling links throw (verified 0); fact-vs-encounter patient_id equivalence pre-flighted (0 mismatches, all sessions). Gate: A 49 rows (49 PASS / 0 FAIL / 0 N_A); B 43/6/0, FAILs exactly PAT000016 (45/52 = 0.8654), PAT000017 (45/48 = 0.9375), PAT000018 (53/60 = 0.8833), PAT000021 (33/36 = 0.9167), PAT000027 (46/49 = 0.9388), PAT000044 (28/34 = 0.8235); C 46/3/0, FAILs exactly PAT000021/027/044, each row byte-identical to its B row (Bug 5 partial remediation); **first check where A ≠ B ≠ C**; N_A branch unexercised (every cohort patient has linked facts); idempotent; `check_results` cleaned to 0.
  - **RESOLVED (Decision 4, 2026-07-09) — VBC "PARTIALLY READY" vs boolean stub aggregation.** Was: the vbc_reporting stub aggregates per-patient boolean (any check FAIL = NOT_READY), but the demo arc's VBC Reporting in Dataset C reads PARTIALLY READY. Ratified: the reconciliation lives at the site-level rollup (46/49 patients ready), owned by the use_case writer — see the 7g decisions block below.
- **7g Part A — complete (2026-07-09, commits `21816ae` A0 + `d4ac4dc` A1).**
  - **A0 (`21816ae`)** — `device_derived_metric_consistency_cgm.js` normalized to the const-export pattern: `export const PRIORITY = 'Medium'` / `THRESHOLD = 0.02` + `assertConfigAgreement(entry)` asserting on the already-loaded config entry (no second lookup — the module loads its entry anyway for `params`). Supersedes the last 7e mutable-let bindings; no `export let` remains in `scoring/checks/`. Behavior unchanged — 7e gate re-verified byte-identical by content fingerprint (A 25/0/0; B 9/3/13, FAILs PAT000046–048; C 12/0/13), idempotent.
  - **A1 (`d4ac4dc`)** — `scoring/index.js`, thin orchestrator, **checks stage only**: fixed 11-module registry (order is deterministic logging only — results are order-independent), `--session A|B|C|all|uuid` CLI (letters resolve via `demo_sessions.dataset_state`), configs loaded once via config_loader at startup, each check in its own transaction (`runCheck` → writer.js upsert), first failure aborts exit-1 naming check and session. The orchestrator sequences; it does not compute (no scoring/condition/status logic). npm `score:a/b/c/all` scripts added per §12. **Full regression vs all eleven recorded gates:** 1,245 rows (415/session); all 33 check×session distribution cells and every recorded FAIL patient list exact; `layer3_mapped_values` / `layer2_value_standards` C ≡ A confirmed by per-patient fingerprint; run-twice idempotent by whole-table content fingerprint. **`layer6_denom_riskstrat` is now behaviorally verified against B and C** (50 rows: 36 PASS / 0 FAIL / 14 N_A each, identical to A) — it had been A-only since 7d.
  - **Startup config-drift sweep dropped (ratified contract amendment):** the orchestrator does not pre-assert config agreement; drift fails fast inside the drifting check's own transaction via each module's internal assertion, aborting the run exit-1 naming the check.
  - **check_results deliberately POPULATED at Part A close — 1,245 rows, the B1 input surface.** Supersedes the clean-to-0 close convention for this sub-step only.
  - **Ratified 7g design decisions (2026-07-09, planning thread):**
    1. **Two-score redefinition** (supersedes Data Model §4.2 wording; Data Model corrected in the B1 doc commit): `readiness_score` = weighted average over ALL of a variable's checks (the operative, consumed number per `computation.input_source`). `technical_score` = weighted average over the layer1–3 subset only, weights renormalized within the subset; when the subset is empty, `technical_score` = `readiness_score` (degenerate copy). A1C is the only current variable where the two can differ.
    2. **Status-indicator weighted averaging:** the aggregator consumes `check_results.status`, never `score`. PASS → 1.0, FAIL → 0.0, weighted by config weight; NOT_APPLICABLE excluded with weights renormalized over applicable checks; if ALL checks are N_A for a patient, no row is written (unexercised in current data). Fractional scores remain in `check_results` as evidence/UI display only. Variable `overall_status`: `computation.status_label` bands when the use case's computation is present; boolean mapping (score == 1.0 → READY, else NOT_READY) when computation IS NULL (mirrors the 7c genericity pattern). Production note (recorded, not acted on): variable→use_case is currently 1:1; a shared variable with divergent bands would break the keying.
    3. **threshold semantics resolved:** `check_results.threshold` is provenance metadata (what the check's own status logic referenced); the aggregator never reads it. Thresholds are not even directionally uniform (1.0 strict-coincident, 0.97 loose, 0.02 inverted tolerance).
    4. **VBC PARTIALLY READY ownership:** the aggregator stays per-patient and boolean-strict for stubs; the site-level rollup (46/49) that produces the demo's PARTIALLY READY reading belongs to the 7i use_case writer / fixture-export layer. Rollup mechanics decided in 7i.
  - **assertConfigAgreement — two legitimate shapes (ratified):** standalone with its own config lookup (`device_patient_linkage_cgm.js` — config agreement is the module's only config interaction) vs assert-on-loaded-entry (`device_derived_metric_consistency_cgm.js` — a params load already exists; the function takes the loaded entry and asserts only). Both greppable by name; no third variant.
- **7g Part B — complete (2026-07-09, commits `672e518` B0 + `0ba0c68` B1).**
  - **B0 (`672e518`)** — `migrations/V013__downstream_upsert_arbiters.sql` applied to `ckm_readiness` against empty tables: unique upsert arbiters for the downstream writers — `uq_variable_readiness_scores_upsert` on `variable_readiness_scores (variable_name, patient_id, demo_session_id)`; `uq_use_case_pathway_results_upsert` on `use_case_pathway_results (patient_id, use_case_name, demo_session_id)`, replacing the non-unique V010 index on the same tuple (7g pre-check §2 finding, V012 precedent). **Schema is now V013**; table count stays 21.
  - **B1 (`0ba0c68`)** — `scoring/lib/aggregator.js` + aggregation stage wired into `scoring/index.js` (own transaction per session, after the checks stage; per-variable READY/PARTIALLY_READY/NOT_READY summary). Implements ratified Decisions 1–4: `readiness_score` = status-indicator weighted average over ALL of a variable's checks (PASS → 1.0, FAIL → 0.0, config weights; N_A excluded with renormalization; all-N_A → no row written); `technical_score` = layer1–3 subset renormalized, degenerate copy when the subset is empty; `overall_status` from `computation.status_label` bands when computation present, boolean (1.0 → READY, else NOT_READY) when computation IS NULL; single-check variables may omit weight (degenerate 1.0), multi-check variables with any weight absent throw; PARTIAL status and organization_id disagreement throw loudly; no hardcoded variable/check names, weights, or bands. Ratified design choices: (1) `writeVariableScores` lives in aggregator.js — writer.js stays check_results-only — following its batched-UNNEST upsert pattern on the V013 arbiter, `scored_at = NOW()` explicit; (2) integer-scaled weights (×1e6) inside the weighted average so config-weight ratios land exactly on their decimal values (0.8, never 0.7999… float dust — scores are demo-facing and fingerprinted); (3) `blocking_checks` TEXT[] travels as one jsonb value per row (UNNEST cannot carry rows-of-arrays), unpacked order-preservingly server-side; (4) Decision 2 is structural — the aggregator's SELECT reads `status` only, never `score`/`threshold`.
  - **B1 gate (verified by planning thread, 2026-07-09):** 729 rows (243/session: CGM Glucose 25, A1C 36, Smoking Status 35, Medication Code 49, Condition Code 49, Encounter Date 49); all 18 variable×session status cells and every named-patient list exact vs the locked prediction; readiness scores only {0.0, 0.5, 0.8, 1.0}; divergence rows (technical ≠ readiness) exactly the A1C Bug 5 signature — B: PAT000016/018/021/027, C: PAT000021/027, each technical 1.0 / readiness 0.8 (PAT000041 is 0.0/0.0, correctly not a divergence); `blocking_checks` exact — every non-READY row carries exactly its FAILing check name(s), every READY row NULL; run-twice idempotent by content fingerprint.
  - **Standing fingerprints (whole-table content, both regression gates).** Standing rule (2026-07-11): **every standing fingerprint must record its query text verbatim, never prose-only.**
    - `check_results` — 1,245 rows @ `3da8be1a25bddde503f5b808f231f7dd`, canonical query recorded verbatim below. Supersedes `3a9427a85cf8ed5be8a4c4cfae2c120b` (7k re-baseline): query text unchanged; data changed deliberately at the 7k append — smoking coverage fix + PAT000041 A1C — this thread, 2026-07-11. Earlier: `3a9427a8…` superseded `cdce162c94c7e7306e131805935c27b0` (7h gate disambiguation, 2026-07-11): the prior digest came from an A1-era query whose text was never recorded; ten plausible reconstructions did not reproduce it, with the data proven unchanged construction-independently (1,245 rows exact; all 33 check×session cells exact vs recorded gates; candidate digest byte-stable across the full 7h sequence including two complete engine runs, 2026-07-11). The defect was the unrecorded query text, not the data.

      ```sql
      SELECT count(*) AS rows,
             md5(string_agg(row_text, ';' ORDER BY check_name, demo_session_id, patient_id)) AS fingerprint
      FROM (
        SELECT check_name, demo_session_id, patient_id,
               concat_ws('|',
                 coalesce(patient_id::text,      '∅'),
                 coalesce(organization_id::text, '∅'),
                 coalesce(check_name::text,      '∅'),
                 coalesce(variable_name::text,   '∅'),
                 coalesce(check_scope::text,     '∅'),
                 coalesce(check_layer::text,     '∅'),
                 coalesce(priority::text,        '∅'),
                 coalesce(status::text,          '∅'),
                 coalesce(score::text,           '∅'),
                 coalesce(threshold::text,       '∅'),
                 coalesce(observed_value::text,  '∅'),
                 coalesce(window_days::text,     '∅'),
                 coalesce(demo_session_id::text, '∅')
               ) AS row_text
        FROM check_results
      ) t;
      ```
    - `variable_readiness_scores` — 729 rows @ `5c329f5b58fb6f2a32c87c89c00cedab`, canonical query recorded verbatim below. Supersedes `e03468102a23dc19322f00ffa466a45f` (7k re-baseline): query text unchanged; data changed deliberately at the 7k append — smoking coverage fix + PAT000041 A1C — this thread, 2026-07-11. Earlier: `e0346810…` superseded `26894c67849f67bddea63a299b125069` (7h pre-check disambiguation, 2026-07-11): the prior digest came from a B1-era query whose text was never recorded; the pre-check reproduced the construction from prose and got a different digest with the data proven unchanged by four construction-independent surfaces (729 rows exact; all 34 variable×session×status cells exact vs recorded gates; named divergence-row signature exact; all 18 count cells exact). The defect was the unrecorded query text, not the data.

      ```sql
      SELECT count(*) AS rows,
             md5(string_agg(row_text, ';' ORDER BY variable_name, demo_session_id, patient_id)) AS fingerprint
      FROM (
        SELECT variable_name, demo_session_id, patient_id,
               concat_ws('|',
                 coalesce(patient_id::text,      '∅'),
                 coalesce(variable_name::text,   '∅'),
                 coalesce(technical_score::text, '∅'),
                 coalesce(readiness_score::text, '∅'),
                 coalesce(overall_status::text,  '∅'),
                 coalesce(blocking_checks::text, '∅'),
                 coalesce(organization_id::text, '∅'),
                 coalesce(demo_session_id::text, '∅')
               ) AS row_text
        FROM variable_readiness_scores
      ) t;
      ```
  - **Carry-forwards out of 7g:** eligibility checks (`layer6_denom_riskstrat`) are never aggregated — not a config variable; their FAIL → work-item path lands in **7j** via the config `eligibility_checks` location. The stubs' degenerate named pathways are the **7h** pathway-evaluator input surface. Bug 5 dings the a1c_fallback pathway in B/C through check 4's 0.20 weight (**7h** must see this — 7f carry-forward). VBC site-level rollup (46/49 → PARTIALLY READY) belongs to **7i** per Decision 4. Dataset reload ledger (below) gates **7k**. FAIL-evidence convention convergence parked for **fixture-export**. `scripts/.env` holds dead pre-rotation `CKM_DIRECT`/`CKM_POOLER` strings — refresh or strip by Dominique's hand at the next environment touch.
- **7h — complete (2026-07-11, commits `00e2284` fingerprint re-baseline docs + `69b4df4` code).** `scoring/lib/pathway_evaluator.js` + pathway stage wired into `scoring/index.js` (third stage, own transaction per session, after aggregation; per-use-case primary/fallback/no_valid_pathway summary; `loadUseCaseSpecs` now also selects `variable_pathways`). Implements the ratified 7h decisions (planning thread, 2026-07-11):
  - **D1 — generic role→result mapping via `pathway_role`:** first pathway in `evaluation_order` satisfying `pass_criterion` wins; role `primary` → `primary_pass`, `fallback` → `fallback_pass`, `active_pathway_id` = the winning `pathway_id`; no pathway wins → `no_valid_pathway`, `active_pathway_id` NULL. Any role outside {primary, fallback} throws; the derived result must be a member of the config's `result_values`, else throw.
  - **D2 — `pass_criterion` `all_variables_ready`** (only v0.1 value; anything else throws) is satisfied iff EVERY pathway variable has a `variable_readiness_scores` row for (patient, session) with `overall_status = 'READY'` exactly — PARTIALLY_READY does not satisfy it.
  - **D3 — missing variable row fails the criterion.** Missing ≠ error, missing ≠ pass.
  - **D4 — row-set per use case per session:** distinct patients holding ≥1 `variable_readiness_scores` row for any of the use case's pathway variables, derived from the `variable_pathways` JSONB — no hardcoded use case/variable/pathway names; no eligibility filtering (7h pre-check §3.6 verified the geometry).
  - Structural: the evaluator's SELECT consumes `overall_status` only (never readiness/technical scores or blocking_checks). Writer lives in pathway_evaluator.js (writer.js stays check_results-only), batched-UNNEST upsert on the V013 arbiter `uq_use_case_pathway_results_upsert`, `evaluated_at = NOW()` explicit (column has no default); organization_id sourced from the patient's variable rows, disagreement throws.
  - **7h gate (confirmed by planning thread, 2026-07-11):** 507 rows (169/session: diabetes 36, hypertension 35, care_coordination 49, vbc 49); all 12 use_case×session primary/fallback/no_valid count cells and every named patient list exact vs the locked predictions (diabetes A 25/10/1, B 9/22/5, C 12/21/3; hypertension 15/0/20, 9/0/26, 9/0/26; care_coordination 49/0/0, 44/0/5, 49/0/0; vbc 49/0/0, 43/0/6, 46/0/3); coupling exact — `active_pathway_id` NULL iff `no_valid_pathway`, every pass row carries its winning pathway_id; regressions stable (check_results 1,245 @ `3a9427a8…`, vrs 729 @ `e0346810…`); run-twice idempotent by content fingerprint `1dc8b664…`.
  - **Standing fingerprint added (third):** `use_case_pathway_results` — 507 rows @ `56b6a385fa522504bf0c45d0baddfd35`, canonical query recorded verbatim below (all columns except pathway_result_id/evaluated_at, '∅' sentinel, '|' concat_ws, ';' agg, ORDER BY use_case_name, demo_session_id, patient_id). Supersedes `1dc8b664db47d6979758ef3e02ff0a6a` (7k re-baseline): query text unchanged; data changed deliberately at the 7k append — smoking coverage fix + PAT000041 A1C — this thread, 2026-07-11.

    ```sql
    SELECT count(*) AS rows,
           md5(string_agg(row_text, ';' ORDER BY use_case_name, demo_session_id, patient_id)) AS fingerprint
    FROM (
      SELECT use_case_name, demo_session_id, patient_id,
             concat_ws('|',
               coalesce(patient_id::text,        '∅'),
               coalesce(use_case_name::text,     '∅'),
               coalesce(pathway_result::text,    '∅'),
               coalesce(active_pathway_id::text, '∅'),
               coalesce(organization_id::text,   '∅'),
               coalesce(demo_session_id::text,   '∅')
             ) AS row_text
      FROM use_case_pathway_results
    ) t;
    ```
  - **Carry-forwards consumed/updated at 7h close:** the Bug 5 a1c_fallback flag is **CONSUMED** — landed exactly as predicted (B diabetes `no_valid_pathway` includes PAT000016/018, the Bug 1 × Bug 5 overlap patients). The **PAT000041 framing input has ARRIVED**: no_valid_pathway in all three sessions (the only A-session no_valid_pathway row); the demo-framing decision goes to the dataset reload window per the existing ledger entry. VBC site-level rollup (46/49 → PARTIALLY READY) still owned by **7i** per 7g Decision 4. Environment-touch item (cosmetic, not blocking): pg emits an SSL-mode deprecation warning on engine startup — address alongside the `scripts/.env` cleanup.
- **7i — complete (2026-07-11, commits `6a918d9` V014 + `3ede92a` code).** `scoring/lib/use_case_writer.js` + use-case readiness stage wired into `scoring/index.js` (fourth stage, own transaction per session, after pathway evaluation; per-use-case READY/PARTIALLY_READY/NOT_READY summary).
  - **V014 (`migrations/V014__use_case_readiness_arbiter_nullability.sql`):** `uq_use_case_readiness_upsert` UNIQUE constraint on `use_case_readiness (patient_id, use_case_name, demo_session_id)` replacing the non-unique V001-era index (V012/V013 precedent, constraint form — an initial index-form apply was corrected before commit); `fitness_score` NOT NULL dropped (boolean-module contract, V011 precedent). **Schema is now V014**; table count stays 21.
  - **Ratified 7i decisions (planning thread, 2026-07-11):**
    - **D1 — scoring pathway** = active pathway on pass, last of `evaluation_order` on `no_valid_pathway`; zero-variable-row geometry throw, never a silent rescue.
    - **D2 — band application** = sort thresholds by `min_score` DESC, first band where score >= `min_score`; bands shape-validated (canonical statuses, finite, min < max), never value-matched.
    - **D3 — `required_variables`** = scoring pathway's variables (config order); blocking = subset NOT_READY (missing row counts as blocking, 7h D3 mirror); partial = subset PARTIALLY_READY; empty subsets written NULL, never empty arrays. Active-pathway semantics = Schema §7 Q5 working choice, parked for Hanieh (`docs/methodology-open-questions.md` §10).
    - **D4 — computation IS NULL** → `fitness_score` NULL, `overall_status` pass → READY else NOT_READY; partial structurally NULL.
    - **D5 — Schema §6 step 1 layer6-FAIL → NOT_READY override NOT implemented** — zero layer6 FAILs exist in any session (re-verified in the 7i pre-check); unexercised code is unverifiable at gate. DOCUMENTED GAP owned by the bug-set-extension window.
    - **D6 — VBC site-level rollup (46/49 → PARTIALLY READY) = fixture-export derivation, NOT engine-written** (per-patient table has no home for a site row; the export layer already owns derived outputs). Consumes 7g Decision 4. The site-level band definition (what count reads as PARTIALLY READY) is decided at fixture-export design.
  - **v0.1 constraint (documented gap #2):** `pathway_weighted_average` implements only the single-variable degenerate (exact copy of the variable's `readiness_score`); a computation-bearing pathway with >1 variable THROWS. Every scored pathway in v0.1 is single-variable; the only multi-variable pathway (`terminology_primary`) is boolean. Generalize only when a real multi-variable scored pathway exists, with Hanieh-validated weights.
  - **7i gate (confirmed by planning thread, 2026-07-11):** 507 rows (169/session; diabetes 36, hypertension 35, care_coordination 49, vbc 49); all 12 status cells exact (diabetes 35/0/1, 31/4/1, 33/2/1; hypertension 15/0/20, 9/0/26, 9/0/26; care_coordination 49/0/0, 44/0/5, 49/0/0; vbc 49/0/0, 43/0/6, 46/0/3); the nine diabetes non-READY rows exact (PARTIALLY 0.8 partial {A1C}: B PAT000016/018/021/027, C PAT000021/027; NOT_READY 0.0 blocking {A1C}: PAT000041 ×3); stub coupling anti-join 0; stub blocking exact (hypertension {Smoking Status} ×72; care_coordination B 008/015/032 {Medication Code}, 024/040 {Condition Code}; vbc {Encounter Date} B ×6 / C ×3); fitness distribution NULL ×399 / 0.0 ×3 / 0.8 ×6 / 1.0 ×99; standing fingerprints unchanged; run-twice idempotent.
  - **Standing fingerprint added (fourth):** `use_case_readiness` — 507 rows @ `a30ea7151dfce73a87c646560526e5e3`, canonical query recorded verbatim below (all columns except readiness_id/evaluated_at, '∅' sentinel, '|' concat_ws, ';' agg, ORDER BY use_case_name, demo_session_id, patient_id). Supersedes `f4c517dd2bbb38085e54f064ebd51bcb` (7k re-baseline): query text unchanged; data changed deliberately at the 7k append — smoking coverage fix + PAT000041 A1C — this thread, 2026-07-11.

    ```sql
    SELECT count(*) AS rows,
           md5(string_agg(row_text, ';' ORDER BY use_case_name, demo_session_id, patient_id)) AS fingerprint
    FROM (
      SELECT use_case_name, demo_session_id, patient_id,
             concat_ws('|',
               coalesce(patient_id::text,            '∅'),
               coalesce(use_case_name::text,         '∅'),
               coalesce(overall_status::text,        '∅'),
               coalesce(fitness_score::text,         '∅'),
               coalesce(required_variables::text,    '∅'),
               coalesce(blocking_variables::text,    '∅'),
               coalesce(partial_variables::text,     '∅'),
               coalesce(organization_id::text,       '∅'),
               coalesce(derived_from_patch_id::text, '∅'),
               coalesce(demo_session_id::text,       '∅')
             ) AS row_text
      FROM use_case_readiness
    ) t;
    ```
  - **Parking lot (one environment-touch sitting):** the stale startup banner (`scoring/index.js` still logs "checks + aggregation stages"), the pg SSL-mode deprecation warning, and the `scripts/.env` dead-credential cleanup.
- **7j — complete (2026-07-11, commits `1dd3976` V015 + `63e88b5` code).** `scoring/lib/work_item_generator.js` + work-items stage wired into `scoring/index.js` (fifth stage, own transaction per session, after use-case readiness; per-use-case work-item summary).
  - **V015 (`migrations/V015__remediation_work_items_arbiter.sql`):** `uq_remediation_work_items_upsert` UNIQUE constraint on `remediation_work_items (check_result_id)` replacing the non-unique `idx_remediation_work_items_check_result` — fourth occurrence of the V012/V013/V014 arbiter-gap pattern, constraint form. **Schema is now V015**; table count stays 21. NOTE: V015 was applied to Neon during the interrupted 2026-07-11 morning session and verified post-hoc by the resume audit (gate_7j_build.txt) before the code gate ran.
  - **Ratified 7j decisions (planning thread, 2026-07-11):**
    - **D1 — arbiter = UNIQUE(check_result_id):** one work item per FAIL check_result stated as a constraint; check_result_id stability across upserts proven behaviorally at the gate (run-twice digest identical).
    - **D2 — generic walk:** the generator walks ALL FAIL rows against a lookup built from BOTH config locations (`eligibility_checks` and `variables[].checks`) across all four modules; eligibility FAILs flow through the same exercised path — no special branch exists. Consumes the 7g eligibility carry-forward. Zero layer6 FAILs today → zero rows via exercised code.
    - **D3 — `use_case_name` sourced from the check's config location;** unambiguous (pre-check: no check_name under two use cases) and now structurally guarded — duplicate check_name across configs throws at lookup build.
    - **D4 — lifecycle columns are human-owned:** INSERT relies on defaults (status `'open'`, created_at `now()`, work_item_id `gen_random_uuid`); resolved_at/resolution_notes never written; DO UPDATE refreshes content columns only — re-runs cannot reopen resolved items.
    - **D5 — priority sourced from the FAIL row** (equals config by the assertConfigAgreement invariant).
    - **D6 — fifth standing fingerprint is content-pure and join-ordered:** work_item_id, check_result_id, created_at excluded; ordering borrowed from check_results via the FK join.
  - **7j gate (confirmed by planning thread, 2026-07-11):** 124 rows (A 21 / B 58 / C 45); all 17 check×session cells and every named patient list exact vs the locked pre-check inventory; 9-row content mapping with action_required verbatim vs config (programmatic comparison, 9/9 VERBATIM); lifecycle 124 open / 124 resolved_at NULL / 124 notes NULL / 0 use_case_name NULL; anti-joins 0/0/0 (every FAIL has exactly one item, no item on a non-FAIL, no parent-field mismatch); run-twice idempotent by content fingerprint; all four standing regressions unchanged.
  - **The 20 Session-A smoking work items are CORRECT current behavior** (the known dataset gap, reload ledger, BLOCKING pre-7k) — they re-baseline at the reload, including the fifth fingerprint.
  - **Reset-order verification (resume audit Phase 2):** `scripts/reset_session.js` deletes `remediation_work_items` (line 51) before `check_results` (line 54) — the V015 FK (NO ACTION) is safe under session reset. Recorded; no scripts change needed.
  - **Standing fingerprint added (fifth):** `remediation_work_items` — 61 rows @ `f6e912d4f1d27ac87b56b5f3d6d3eb5f`, canonical query recorded verbatim below (content-pure: work_item_id, check_result_id, created_at excluded; '∅' sentinel, '|' concat_ws, ';' agg, ORDER BY check_name, demo_session_id, patient_id via the check_results join). Supersedes `2e5a8b845ad18a38278865d0f9f0405e` (124 rows; 7k re-baseline): query text unchanged; data changed deliberately at the 7k append — smoking coverage fix + PAT000041 A1C — this thread, 2026-07-11; row count fell 124 → 61 because Dataset A's 20 dataset-gap smoking FAILs and PAT000041's A1C FAIL ×3 no longer exist.

    ```sql
    SELECT count(*) AS rows,
           md5(string_agg(row_text, ';' ORDER BY check_name, demo_session_id, patient_id)) AS fingerprint
    FROM (
      SELECT cr.check_name, w.demo_session_id, w.patient_id,
             concat_ws('|',
               coalesce(w.patient_id::text,       '∅'),
               coalesce(w.organization_id::text,  '∅'),
               coalesce(cr.check_name::text,      '∅'),
               coalesce(w.phenotype::text,        '∅'),
               coalesce(w.use_case_name::text,    '∅'),
               coalesce(w.responsible_role::text, '∅'),
               coalesce(w.action_required::text,  '∅'),
               coalesce(w.priority::text,         '∅'),
               coalesce(w.status::text,           '∅'),
               coalesce(w.resolved_at::text,      '∅'),
               coalesce(w.resolution_notes::text, '∅'),
               coalesce(w.demo_session_id::text,  '∅')
             ) AS row_text
      FROM remediation_work_items w
      JOIN check_results cr ON cr.check_result_id = w.check_result_id
    ) t;
    ```
- **7k/7l — complete (2026-07-11, commit `836aac9` code; evidence gate_7k_precheck.txt / gate_7k_fix_dryrun.txt / gate_7k_execute.txt).** The dataset reload landed and Step 7 acceptance is verified against Datasets B and C.
  - **Ratified mechanism (R1) — surgical CSV-sourced append, NOT reset-and-reload.** The 7k pre-check found a STOP condition: `load_dataset.js` always mints a new session UUID (`INSERT INTO demo_sessions … RETURNING session_id`, no re-attach path), so a naive reset+reload would strand the §6 anchors and shift every fingerprint on identical data. The anchors were preserved by never touching `demo_sessions`: CSVs edited FIRST (the canonical fix surface — **CRLF endings REQUIRED**: csv-parse record-delimiter auto-detection silently merges LF-appended lines into one record; caught by the append script's exact-21-rows count guard), then `scripts/append_observations_7k.js` derives its rows from the edited CSVs through the loader's own observations rowBuilder (reused verbatim — `load_dataset.js` exports nothing and runs main() at require time). Idempotent `ON CONFLICT ON CONSTRAINT pk_observations DO NOTHING` — ratified Tier-1 append-only deviation from DO UPDATE; a re-run must never modify an existing raw row. Raw-tier idempotency proven: re-run inserted=0/skipped=21 per session.
  - **The fixes (R2/R3) — 63 rows, OBS001421–1441.** 20 smoking observations (LOINC 72166-2, LA answer codes, status completed, source ehr) × 3 sessions for the ledger's 20 uncovered I10-active patients, plus PAT000041 A1C (4548-4, value 7.2 %, effective_date 20240915) × 3 sessions. **ALL rows encounter_id NULL** (ratified: confines the blast radius — unlinked rows are invisible to both layer5 date-concordance checks; deliberate deviation from the 33/33 encounter-linked precedent among pre-existing smoking rows; realism wart recorded). Observations now 1441/1435/1435 (A/B/C).
  - **Runtime cleanup before the rerun:** the five runtime tables were deleted (Tier 4→3 order, exactly 507/507/124/729/1245) because the work-item generator has no deletion path — stale work items for now-PASSING checks would linger under upsert-only regeneration.
  - **7k gate (confirmed by planning thread, 2026-07-11):** all locked cells and named lists exact. **Dataset A fully clean end-to-end for the first time** — zero FAILs across all 11 checks, all variables and use cases READY, zero no_valid_pathway rows, zero work items. Smoking FAILs exactly PAT000031–036 in B/C (Bug 3 reads correctly at last). PAT000041 resolved everywhere: A1C READY 1.0, diabetes `fallback_pass` via `a1c_fallback`, use-case READY fitness 1.0. Both layer5 date-concordance checks' fractional FAIL scores byte-identical to the 7f gate records — the NULL-linkage invisibility confirmed behaviorally. Work items 61 (A 0 / B 37 / C 24); lifecycle 61/61/61; all anti-joins 0; run-twice idempotent at the full-pipeline level (all five digests byte-identical across two complete engine runs).
  - **7l ratified as verified on the same evidence (planning thread, 2026-07-11):** the gate ran all-session and captured the full Dataset C surfaces — Bugs 4/6 fully resolved (care_coordination and derived-metric C ≡ A), Bug 5 partial (021/027/044 remain), Bugs 1/2/3 persist by design; remediation unlocks care_coordination 44→49, vbc_reporting 43→46, diabetes PARTIALLY_READY 4→2. A separate C-only run would add ceremony, not information.
  - **Parked:** (a) Remediation Roles doc says "Missing Required Covariate" vs config-canonical "Missing Required Variable" — stakeholder-doc wording drift, reconcile at the next Drive-doc touch; (b) OBS001441 `interpretation = 'H'` mirrored from the template onto a 7.2 value — cosmetic, no engine reads interpretation.
- **Engine runs end-to-end through the work-items stage.** `node scoring/index.js --session all` executes five stages against all three sessions: eleven checks, aggregation, pathway evaluation, use-case readiness, work items. `check_results` holds 1,245 rows, `variable_readiness_scores` 729, `use_case_pathway_results` 507, `use_case_readiness` 507, and `remediation_work_items` 61 — all five fingerprinted above. No runtime table remains empty.
- **Next: bug-set extension (Add-1/2/3)** — folds in before fixture-export and carries its OWN dataset reload + full five-fingerprint re-baseline (two-reload sequencing paragraph below). Then Step 8.

#### Not started (downstream)
- Step 8 (UI revamp), Step 9 (agentic layer), Step 10 (Vercel deploy).

#### Open design point — fixture-export layer (UI/UX spec dependency)
The locked Demo UI/UX Specification (§8.3, §10) requires a fixture-export step that serializes engine output to `src/data/fixtures/session-{a,b,c}.json`. Two of its required outputs are **not natively emitted by the engine schema** as currently specified and must be derived at export time — flagged here as an unresolved design point, not a settled mechanism:
- **`recommendationType`** (`ai_suggested_fix` | `route_to_stakeholder`, per spec §10.1) — no column for this exists in `remediation_work_items` or any engine output table.
- **The four-facts plain-language strings** (`whatFailed`, `whatUnlocks`, etc., per spec §6.3/§7) — composed from `remediation_work_items.action_required` + the Dataset B Bug Reconciliation, not stored by the engine.
The export step (or a config/schema addition) must own this derivation. Resolve at or before the Step 7 → fixture-export handoff.

#### Dataset reload ledger (executed at the 7k append, 2026-07-11)
Both ledger items landed via the surgical CSV-sourced append (7k/7l block above); the CSVs and the live sessions agree.
- **EXECUTED (was BLOCKING pre-7k) — 20 I10-active patients had no smoking observation in ANY session, including clean A** (PAT000002, 005, 007–013, 015, 018–021, 023, 027, 041–043, 045). Outcome: LOINC 72166-2 observations added for all 20 in all three sessions (OBS001421–1440); Dataset A now goes clean and B/C fail exactly PAT000031–036.
- **EXECUTED (was FRAMING) — PAT000041 A1C gap.** Outcome: one 4548-4 row (7.2 %, effective_date 20240915, OBS001441) added in all three sessions; `layer1_notnull_fields_a1c` now 36 PASS everywhere and PAT000041 reaches diabetes READY via `a1c_fallback` in all sessions.

#### Bug-set extension (folds in after 7l, before fixture-export)
The bug-set extension (Add-1 CSV-structural conformance, Add-2 lab recency, Add-3 value plausibility) folds in **after 7l, before fixture-export** — see the Build Plan's "Planned Bug-Set Expansion" section. Add-4 (DKA event validation) and denominator-validity are funded-phase methodology work (see `docs/methodology-open-questions.md`). Ratified (planning thread, 2026-07-11): the extension carries its OWN dataset reload and full five-fingerprint re-baseline, separate from the 7k ledger reload — two reloads total, never combined; each fingerprint supersession must trace to exactly one reload.

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
| 7e2 | `scoring/checks/device_patient_linkage_cgm.js` + `device_temporal_density_cgm_14d.js` — Bugs 1, 2 (device identity linkage + 14-day temporal density) | 7b, 7c |
| 7f  | Seven more checks: `layer1_notnull_fields_a1c.js`, `layer2_ranges_numeric_a1c.js`, `layer5_date_concordance_a1c.js`, `layer3_mapped_values.js`, `layer2_value_standards.js`, `layer5_date_concordance.js`, `layer1_notnull_fields_smoking.js` (Bug 3) | 7b, 7c |
| 7g  | `scoring/lib/aggregator.js` — writes `variable_readiness_scores` (weighted average per variable) | 7d, 7e, 7e2, 7f |
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
├── index.js                                   # (7g A1 — built) entry: node scoring/index.js --session <A|B|C|all|uuid>
├── lib/
│   ├── db.js                                  # pg pool from CKM_DIRECT
│   ├── constants.js                           # (7d — built) EVALUATION_DATE
│   ├── writer.js                              # (7d — built) idempotent upsert (ON CONFLICT DO UPDATE) per check+session
│   ├── config_loader.js                       # (7b) loads conditions/ into DB + validates enumerations
│   ├── aggregator.js                          # (7g B1 — built) variable_readiness_scores aggregation + writer
│   ├── pathway_evaluator.js                   # (7h — built) use_case_pathway_results writer
│   ├── use_case_writer.js                     # (7i — built) use_case_readiness writer
│   └── work_item_generator.js                 # (7j — built) remediation_work_items generator
└── checks/
    ├── device_patient_linkage_cgm.js          (7e2 — built; Bug 1)
    ├── device_temporal_density_cgm_14d.js     (7e2 — built; Bug 2)
    ├── layer1_notnull_fields_smoking.js       (7f — built; Bug 3)
    ├── layer6_denom_riskstrat.js              (7d — built; the template check)
    ├── device_derived_metric_consistency_cgm.js (7e — built; Bug 6 TIR concordance)
    ├── layer1_notnull_fields_a1c.js           (7f — built; A1C presence audit)
    ├── layer2_ranges_numeric_a1c.js           (7f — built; A1C range plausibility)
    ├── layer5_date_concordance_a1c.js         (7f — built; A1C date concordance)
    ├── layer3_mapped_values.js                (7f — built; Bug 4 meds/RxNorm)
    ├── layer2_value_standards.js              (7f — built; Bug 4 conditions/ICD-10)
    └── layer5_date_concordance.js             (7f — built; Bug 5 encounters date concordance)

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

Before writing a new check, mirror the Check module pattern above. **`layer6_denom_riskstrat.js` is the first built check (7d)** and establishes the shape the rest mirror — config-driven criteria, single query for all patients, three-way status mapping. The check module returns rows; `scoring/lib/writer.js` (built, 7d) handles the idempotent upsert. Never write `check_results` directly from a check module.

Every module also asserts config agreement at `runCheck` time (there is no startup sweep — drift fails inside the drifting check's own transaction). Two legitimate `assertConfigAgreement` shapes, no third variant:
- **Standalone with its own lookup** (`device_patient_linkage_cgm.js`) — when config agreement is the module's only config interaction.
- **Assert-on-loaded-entry** (`device_derived_metric_consistency_cgm.js`) — when the module already loads its config entry for `params`; `assertConfigAgreement(checkEntry)` takes the loaded entry and asserts only, no second lookup.

Add new checks to the `CHECKS` registry in `scoring/index.js`.

### Stub condition modules (7c)

The three stubs validate that the config loader and engine work generically — not just for diabetes. Each uses simple boolean aggregation: any check FAIL = NOT_READY. No pathway logic.

| Stub | Checks | Population | Bug it surfaces |
|------|--------|------------|-----------------|
| `hypertension_risk_stratification` | `layer1_notnull_fields_smoking` | ICD-10 I10 active | Bug 3 |
| `care_coordination` | `layer3_mapped_values` + `layer2_value_standards` | active DM or HTN diagnosis | Bug 4 |
| `vbc_reporting` | `layer5_date_concordance` | qualifying encounters | Bug 5 |

### Idempotency — tuples each writer owns

| Writer | Upsert conflict key (`INSERT ... ON CONFLICT DO UPDATE`) |
|--------|--------------------|
| check writer (`scoring/lib/writer.js`) | `(check_name, patient_id, demo_session_id)` |
| aggregator | `(variable_name, patient_id, demo_session_id)` |
| pathway evaluator | `(patient_id, use_case_name, demo_session_id)` |
| use_case writer | `(patient_id, use_case_name, demo_session_id)` |
| work item generator | `(check_result_id)` — one work item per FAIL |

DELETE+INSERT is superseded (2026-06-22 finding, during 7b): deleting rows collides with V010's `ON DELETE RESTRICT` FK. All writers upsert on the tuple above; the config loader already implements this pattern.

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

**V011 (2026-07-06)** dropped the NOT NULL on `computation`: the block is optional — NULL = boolean/pathway-only module (7c genericity finding; see Condition Module Schema §4.2).

CHECK constraint on `use_case_category` — values: `risk_stratification`, `care_coordination_delivery`, `vbc_reporting`.

### `use_case_pathway_results` (runtime output)
PK `pathway_result_id UUID`. Session-aware. Columns: `patient_id`, `use_case_name`, `pathway_result` (`'primary_pass'|'fallback_pass'|'no_valid_pathway'`), `active_pathway_id` (nullable), `organization_id`, `evaluated_at`, `demo_session_id`.

Index: `(patient_id, use_case_name, demo_session_id)` — for the join back to `use_case_readiness`.

CHECK constraint on `pathway_result` — values: `primary_pass`, `fallback_pass`, `no_valid_pathway`.

### Retrofit CHECK on `remediation_work_items.responsible_role`

V010 also adds a CHECK constraint on `remediation_work_items.responsible_role` enforcing the seven canonical values from the Condition Module Schema §3.2. This closes a gap in V006, which declared the column as `VARCHAR(32) NOT NULL` without a value list.

**V012 (2026-07-06)** adds the UNIQUE constraint `uq_check_results_upsert` on `check_results` (`check_name`, `patient_id`, `demo_session_id`) — the ON CONFLICT arbiter the check writer (`scoring/lib/writer.js`, §7) upserts against. It replaces the non-unique `idx_check_results_patient_check` (same three columns); patient-first lookups remain covered by `idx_check_results_patient`. No table added — table count stays 21.

**V013 (2026-07-09)** adds the downstream writers' ON CONFLICT arbiters (V012 precedent): UNIQUE `uq_variable_readiness_scores_upsert` on `variable_readiness_scores` (`variable_name`, `patient_id`, `demo_session_id`) and UNIQUE `uq_use_case_pathway_results_upsert` on `use_case_pathway_results` (`patient_id`, `use_case_name`, `demo_session_id`) — the latter replacing the non-unique V010 index on the same tuple. No table added — table count stays 21.

**V014 (2026-07-11)** adds the UNIQUE constraint `uq_use_case_readiness_upsert` on `use_case_readiness` (`patient_id`, `use_case_name`, `demo_session_id`) — the ON CONFLICT arbiter for the use-case writer (`use_case_writer.js`, 7i) — replacing the non-unique V001-era index on the same tuple, and drops the NOT NULL on `use_case_readiness.fitness_score` (boolean/pathway-only modules write no fitness_score; V011 precedent). No table added — table count stays 21.

**V015 (2026-07-11)** adds the UNIQUE constraint `uq_remediation_work_items_upsert` on `remediation_work_items` (`check_result_id`) — the ON CONFLICT arbiter for the work-item generator (`work_item_generator.js`, 7j); one work item per FAIL check result, stated as a constraint — replacing the non-unique `idx_remediation_work_items_check_result`. No table added — table count stays 21.

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

npm run score:all # all three sessions in dataset_state order

# direct
node scoring/index.js --session <A|B|C|all|uuid>
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
# As of 2026-07-11 V001–V015 all exist and are applied (21 tables, in DB `ckm_readiness`).
for f in V001 V002 V003 V004 V005 V006 V007 V008 V009 V010 V011 V012 V013 V014 V015; do
  psql "$CKM_DIRECT" -f ${f}__*.sql
done
psql "$CKM_DIRECT" -c "\dt"   # 21 tables
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
- **Idempotent writers.** Every writer upserts via `INSERT ... ON CONFLICT DO UPDATE` on the tuple it owns (see Section 7) — never DELETE+INSERT.
- **Full check names everywhere in the DB.** Short names live only in the config file as `check_name` references; they resolve to full names at load time via the variable tag.
- **Commit per sub-step.** 7a commit, 7b commit, etc.
- **Work on the `ckm-poc-build` branch.** Merge to `main` only at milestones.
- **Before writing a check:** follow the Check module pattern in Section 7 and mirror `scoring/checks/layer6_denom_riskstrat.js` (the built 7d template check).
- **Before writing a writer:** mirror `scoring/lib/writer.js` (built in 7d to the upsert idempotency contract in Section 7 — `INSERT ... ON CONFLICT DO UPDATE`) for the other writers.
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
- Deployment host: Regional node (ACO/IDN), not directly at clinical sites. Multi-state and opportunistic — POC targets Kansas, Montana, and Colorado, with Kansas the likely first deployment (see the Build Plan's Strategic Context).
