# CKM Data Readiness — Dataset B Bug Reconciliation

**Project:** Oros CKM Data Readiness POC  
**Document purpose:** Authoritative reference for Dataset B (buggy) and Dataset C (remediated) generation  
**Last updated:** 2026-04-02

---

## Reconciliation summary

The original spec (§5) assigned bug target patient IDs based on a cohort ordering
that does not match the finalized Dataset A patient assignment. Six bugs are defined;
four required patient ID reconciliation. The table below is the governing reference
for all Dataset B and Dataset C generation scripts.

**Finalized Dataset A cohort bands:**

| ID range | Cohort | CGM | BP | Weight |
|---|---|---|---|---|
| PAT000001–PAT000020 | Diabetes + CGM | ✓ | — | — |
| PAT000021–PAT000030 | Diabetes EHR-only | — | — | — |
| PAT000031–PAT000040 | Hypertension + BP | — | ✓ | — |
| PAT000041–PAT000045 | Heart Failure + Weight | — | — | ✓ |
| PAT000046–PAT000050 | Overlap DM + HTN | ✓ | ✓ | — |

---

## Bug reconciliation table

| Bug | Bug name | Spec patient IDs | **Reconciled patient IDs** | Reconciliation reason |
|---|---|---|---|---|
| 1 | Patient-Device Identity Linkage Failure | PAT000021–PAT000025 | **PAT000016–PAT000020** | Spec IDs fall in DM EHR-only cohort (no CGM). Moved to last 5 of DM+CGM band. |
| 2 | CGM Temporal Density Below Threshold | PAT000026–PAT000033 | **PAT000001–PAT000008** | Spec IDs fall in DM EHR-only and HTN cohorts (no CGM). Moved to first 8 of DM+CGM band. |
| 3 | Missing Smoking Status | PAT000041–PAT000046 | **PAT000031–PAT000036** | Spec IDs fall in HF and Overlap cohorts, not HTN. Moved to first 6 of HTN band. |
| 4 | Invalid Terminology Codes | Not patient-specific | **TBD at Dataset B generation** | 3 medication records + 3 condition records; specific row selection deferred. |
| 5 | Date Concordance Failure | Not patient-specific | **TBD at Dataset B generation** | 7 encounter records; specific row selection deferred. |
| 6 | Derived Metric Concordance Failure | PAT000034–PAT000036 | **PAT000046–PAT000048** | Spec IDs fall in HTN cohort (no CGM). Moved to first 3 of Overlap band (CGM-enabled). |

---

## Full bug specifications

### Bug 1 — Patient-Device Identity Linkage Failure

| Field | Value |
|---|---|
| **Reconciled patients** | PAT000016, PAT000017, PAT000018, PAT000019, PAT000020 |
| **Affected table** | cgm_readings.csv |
| **Affected field** | user_id |
| **Dataset A value** | PAT000016 (patient_id format, exact match) |
| **Dataset B value** | UUID v4 string, e.g. `a3f2c1d0-5b6e-4f72-9c1a-8d3e7f0b2c4a` (no crosswalk) |
| **Effect** | These 5 patients cannot be linked to their CGM records. Temporal density score cannot be computed. CGM variable status = FAIL on device_patient_linkage. |
| **Check triggered** | `device_patient_linkage` — Priority: High |
| **Use case blocked** | Diabetes Risk Stratification — NOT READY |
| **Dataset C status** | ❌ UNRESOLVED — requires HIE identity resolution and upstream pipeline reconfiguration. System correctly detects and flags the failure but cannot fix it automatically. |

---

### Bug 2 — CGM Temporal Density Below Threshold

| Field | Value |
|---|---|
| **Reconciled patients** | PAT000001, PAT000002, PAT000003, PAT000004, PAT000005, PAT000006, PAT000007, PAT000008 |
| **Affected table** | cgm_readings.csv |
| **Affected field** | Readings removed (contiguous gap blocks on specific days) |
| **Dataset A value** | Temporal density 0.839–0.943 for all CGM patients (all ≥ 70% threshold) |
| **Dataset B value** | 6–8 hour contiguous gaps introduced on days 4–7 and 11–14 of the 14-day window, reducing coverage to ~58% (below 70% TIDE threshold) |
| **Effect** | Temporal density check fails for 8 patients. TIR cannot be validly computed. CGM variable readiness = FAIL on device_temporal_density. |
| **Check triggered** | `device_temporal_density` — Priority: High |
| **Use case blocked** | Diabetes Risk Stratification — NOT READY |
| **Dataset C status** | 🟡 PARTIALLY REMEDIATED — density computed, gaps flagged, readiness state correctly characterized as insufficient. Root cause requires clinic-level action on device adherence. System cannot create missing readings. ("Partially remediated" refers to the platform's half — detection, flagging, and routing are complete; the underlying readings are unchanged in C, so the density check correctly produces identical results for B and C.) |

---

### Bug 3 — Missing Smoking Status for Hypertension Risk Stratification

| Field | Value |
|---|---|
| **Reconciled patients** | PAT000031, PAT000032, PAT000033, PAT000034, PAT000035, PAT000036 |
| **Affected table** | observations.csv |
| **Affected field** | Rows removed: LOINC 72166-2 (smoking status) observations |
| **Dataset A value** | Smoking status observation (LOINC 72166-2) present for all 10 HTN patients |
| **Dataset B value** | Smoking status observations entirely absent for PAT000031–000036 (6 of 10 HTN patients). Field completeness = 4/10 = 40%, below 75% threshold. |
| **Effect** | Completeness check fails for smoking status variable in HTN cohort. Required covariate for hypertension risk algorithms is missing for majority of patients. |
| **Check triggered** | `layer1_notnull_fields` (observations, smoking status variable) — Priority: Medium |
| **Use case blocked** | Hypertension Risk Stratification — NOT READY |
| **Dataset C status** | ❌ UNRESOLVED — requires clinician documentation at point of care or EHR workflow update. System correctly identifies and routes the gap as a work item but cannot populate clinical data that was never collected. |

---

### Bug 4 — Invalid Terminology Codes

| Field | Value |
|---|---|
| **Affected records** | CND000222 (PAT000024), CND000341 (PAT000040), CND000344 (PAT000040), MED000100 (PAT000008), MED000220 (PAT000015), MED000378 (PAT000032) |
| **Affected tables** | medications.csv (3 records), conditions.csv (3 records) |
| **Affected field** | `code` in both tables |
| **Dataset A value** | All RxNorm and ICD-10 codes valid |
| **Dataset B — conditions** | E1X.21 (malformed), Z99.99X (non-existent), 410.9 (ICD-9, not ICD-10) |
| **Dataset B — medications** | 999999, INVALID01, 00000 |
| **Dataset C corrections** | E1X.21 → E11.9, Z99.99X → I10, 410.9 → I10, 999999 → 847191, INVALID01 → 314076, 00000 → 617310 |
| **Check triggered** | `layer3_mapped_values` (medications), `layer2_value_standards` (conditions) — Priority: Medium |
| **Use case blocked** | Care Coordination — Diabetes — PARTIALLY READY |
| **Dataset C status** | ✅ FULLY RESOLVED — deterministic code mapping applied. conditions.csv and medications.csv MD5s match Dataset A exactly. |

---

### Bug 5 — Date Concordance Failure in Encounters

| Field | Value |
|---|---|
| **Affected records** | ENC000187, ENC000194, ENC000205, ENC000207 (normalizable); ENC000246, ENC000294, ENC000417 (unresolved) |
| **Affected table** | encounters.csv |
| **Affected field** | `encounter_date` |
| **Dataset A value** | All 490 encounter_date values in valid YYYYMMDD format |
| **Dataset B — 4 records** | MM/DD/YYYY format — auto-normalizable |
| **Dataset B — 3 records** | ENC000246: ambiguous transposition (20240506 = May 6 vs Jun 5, both plausible dates); ENC000294: invalid month 20; ENC000417: invalid month 18 |
| **Dataset C — 4 records** | Normalized to YYYYMMDD ✓ |
| **Dataset C — 3 records** | Left unresolved — require source-system lookup or clinical confirmation |
| **Check triggered** | `layer5_date_concordance` — Priority: Medium |
| **Use case blocked** | VBC Reporting — ACCESS CKM — NOT READY |
| **Dataset C status** | 🟡 PARTIALLY RESOLVED — 4 of 7 encounter dates normalized. 3 records remain flagged: 1 ambiguous transposition undetectable by format checking alone, 2 with impossible month values requiring manual correction. |

---

### Bug 6 — Derived Metric Concordance Failure

| Field | Value |
|---|---|
| **Reconciled patients** | PAT000046, PAT000047, PAT000048 |
| **Affected table** | observations.csv |
| **Affected field** | `value` where code=`97506-0` and interpretation=`TIR` |
| **Dataset A value** | PAT000046 = 80.54%, PAT000047 = 98.87%, PAT000048 = 97.92% |
| **Dataset B value** | Pre-stored TIR overwritten to 65.00% for all three patients. Raw cgm_readings.csv unchanged — recomputing TIR from raw still yields 80–99%. |
| **Dataset C value** | PAT000046 = 80.54%, PAT000047 = 98.87%, PAT000048 = 97.92% (restored from recomputation) |
| **Check triggered** | `device_derived_metric_consistency` — Priority: Medium |
| **Use case blocked** | Diabetes Risk Stratification — PARTIALLY READY |
| **Dataset C status** | ✅ FULLY RESOLVED — TIR and GMI recomputed from raw cgm_readings.csv. Raw data untouched (cgm_readings.csv MD5 identical to Dataset B). |
| **Strategic note** | Bug 6 is the most important bug for NCQA positioning. It enforces the methodology principle that derived metrics (TIR, GMI) are outputs, not inputs. A site reporting TIR directly from device output without recomputation may produce inconsistent values across manufacturers. |

---

## Check and readiness cross-reference

| Bug | Check name | Priority | Dataset A | Dataset B | Dataset C |
|---|---|---|---|---|---|
| 1 | device_patient_linkage | High | READY | NOT READY | ❌ UNRESOLVED |
| 2 | device_temporal_density | High | READY | NOT READY | 🟡 PARTIALLY REMEDIATED |
| 3 | layer1_notnull_fields | Medium | READY | NOT READY | ❌ UNRESOLVED |
| 4 | layer3_mapped_values | Medium | READY | PARTIALLY READY | ✅ RESOLVED |
| 4 | layer2_value_standards | Medium | READY | PARTIALLY READY | ✅ RESOLVED |
| 5 | layer5_date_concordance | Medium | READY | NOT READY | 🟡 PARTIALLY RESOLVED |
| 6 | device_derived_metric_consistency | Medium | READY | NOT READY | ✅ RESOLVED |

---

## Use-case readiness arc

| Use case | Dataset A | Dataset B | Dataset C |
|---|---|---|---|
| Diabetes Risk Stratification | READY | NOT READY | NOT READY |
| Hypertension Risk Stratification | READY | NOT READY | PARTIALLY READY |
| Care Coordination — Diabetes | READY | PARTIALLY READY | READY |
| Care Coordination — HTN | READY | PARTIALLY READY | READY |
| VBC Reporting — ACCESS CKM | READY | NOT READY | PARTIALLY READY |
| HEDIS CDC — Diabetes | READY | NOT READY | PARTIALLY READY |

Dataset C does not fully remediate all use cases — this is intentional. The demo shows
that remediation is iterative: one remediation pass resolves some blocking bugs but
leaves others requiring stakeholder action outside the system.

**Key demo narrative:** Bugs 4 and 6 are system-remediable (AI-assisted, deterministic).
Bugs 5 and 2 are partially remediable. Bugs 1 and 3 require external stakeholder action
and remain unresolved — demonstrating that the system correctly characterizes problems
it cannot fix, and routes them to the right actors.

---

## Dataset canonical file inventory

### Dataset A — 10 files

| File | Rows | MD5 |
|---|---|---|
| patients_dataset_a.csv | 50 | ab6fc106507ed6255f369b90d9d65662 |
| providers_dataset_a.csv | 15 | d794ee2e82125be7aeb3691796672384 |
| encounters_dataset_a_v2.csv | 490 | fd67601b431bf97fb45f45ad9abf6502 |
| conditions_dataset_a.csv | 463 | 90543211fbd9e4bed491ac5800584c4c |
| medications_dataset_a.csv | 604 | bd0a22991a11b88e82fcf31dac8c37a9 |
| observations_dataset_a.csv | 1,420 | 90f54d723c8f771bca0d106657191692 |
| cgm_readings_dataset_a.csv | 90,462 | c656b53a0bd66a89618f3c10ec259518 |
| cgm_window_metadata_dataset_a.csv | 25 | 39d1881d952abe75eb9257f203ddd81a |
| bp_readings_dataset_a.csv | 328 | 9588a149d1a08898ea2027c488b242bd |
| weight_readings_dataset_a.csv | 70 | 91ef428556b0383ead71c6c61b740c8d |

### Dataset B — 10 files

| File | Rows | MD5 |
|---|---|---|
| patients_dataset_b.csv | 50 | ab6fc106507ed6255f369b90d9d65662 |
| providers_dataset_b.csv | 15 | d794ee2e82125be7aeb3691796672384 |
| encounters_dataset_b.csv | 490 | 8e3f0523d6241a6ff9f2d373a89da8a1 |
| conditions_dataset_b.csv | 463 | 61c5ab2af790ddf847aa88e9d1d2f55b |
| medications_dataset_b.csv | 604 | bc597a3243efa5f1304f92ffdde09a6a |
| observations_dataset_b.csv | 1,414 | 47d03606cf78a42db2ed4b3991bbe423 |
| cgm_readings_dataset_b.csv | 78,717 | 284bec0b0c4272549037e5983977e0e1 |
| cgm_window_metadata_dataset_b.csv | 25 | dd6f07df6fc4348349a8bf3a2c7f4e1a |
| bp_readings_dataset_b.csv | 328 | 9588a149d1a08898ea2027c488b242bd |
| weight_readings_dataset_b.csv | 70 | 91ef428556b0383ead71c6c61b740c8d |

### Dataset C — 10 files

| File | Rows | MD5 |
|---|---|---|
| patients_dataset_c.csv | 50 | ab6fc106507ed6255f369b90d9d65662 |
| providers_dataset_c.csv | 15 | d794ee2e82125be7aeb3691796672384 |
| encounters_dataset_c.csv | 490 | f27e75132629fe23a2d9f7f13df8f7a3 |
| conditions_dataset_c.csv | 463 | 90543211fbd9e4bed491ac5800584c4c |
| medications_dataset_c.csv | 604 | bd0a22991a11b88e82fcf31dac8c37a9 |
| observations_dataset_c.csv | 1,414 | 74b2be533f559131e54278a0211f9842 |
| cgm_readings_dataset_c.csv | 78,717 | 284bec0b0c4272549037e5983977e0e1 |
| cgm_window_metadata_dataset_c.csv | 25 | dd6f07df6fc4348349a8bf3a2c7f4e1a |
| bp_readings_dataset_c.csv | 328 | 9588a149d1a08898ea2027c488b242bd |
| weight_readings_dataset_c.csv | 70 | 91ef428556b0383ead71c6c61b740c8d |

---

*All patient IDs confirmed against dataset_a_clean/patients.csv.
Bug reconciliation documented in header comments of all generation scripts.
Validated by Claude and ChatGPT before Dataset C generation.*
