# Oros Architecture  
## Remediation Scenarios (Phenotype-Based)  
**Version:** v1.0  
**Status:** Draft for POC → expandable as operational cases emerge**

---

# 🔧 Purpose

This document translates each **Data Quality Phenotype** into a clear, representative **operational remediation scenario**.  
It supports:

- Site onboarding (HIE, ACO, rural clinics)  
- Technical debugging (EHR vendors, HIE interface teams)  
- Clinical/QI workflows (RTA, T1DX)  
- Demonstrating how Oros translates scoring into action  

Each scenario includes:

- Title (clinical + technical)  
- Why it matters  
- How Oros detects the issue  
- Canonical RACI (ownership)  
- Operational RACI (execution)  
- Likely root cause  
- Suggested remediation pathway  
- Enabled vs blocked outcomes  
- Placeholder for future real-world expansions  

---

# 📌 Scenario 1 — Missing A1c  
**Phenotype:** Missing EHR Data

## Summary  
A significant portion of diabetic patients at a rural clinic have **no A1c lab values** in the EHR or transmitted to the HIE.

## Why This Matters  
- Blocks CMS122 (A1c Poor Control)  
- Blocks HEDIS diabetes measures  
- Limits D-Data Dock full-mode analytics  
- Weakens clinical decision support  
- Prevents ACO financial reconciliation  

## How Oros Detects It  
- Missingness scoring on A1c for known diabetic patients  
- Expected-frequency heuristics (e.g., at least annual A1c)  
- Cross-site completeness benchmarking across similar clinics  

## Canonical RACI  
- Responsible: Clinic  
- Accountable: Clinic Leadership  
- Consulted: HIE, ACO  
- Informed: Oros, RTA, T1DX  

## Operational RACI  
- Responsible: Oros (detect), Clinic (fix)  
- Accountable: HIE or ACO program lead  
- Consulted: EHR Vendor  
- Informed: RTA / T1DX  

## Likely Root Causes  
- Lab interface misconfigured or missing A1c mapping  
- Local lab codes not mapped to standard LOINC  
- Clinic not ordering A1c at recommended intervals  

## Suggested Remediation  
1. Clinic and EHR vendor review A1c ordering workflows and mapping.  
2. HIE validates that A1c results appear correctly in HL7/CCD feeds.  
3. Clinic updates clinical workflows if ordering behavior is the problem.  
4. Oros reruns completeness and readiness scoring.  

## Enabled Outcomes  
- CMS122 becomes computable.  
- HEDIS diabetes measures become computable.  
- D-Data Dock receives required EHR complements for full-mode analytics.  

## Blocked Outcomes (if unresolved)  
- ACO quality reporting delayed or impossible.  
- Rural site remains ineligible for D-Data Dock full-mode.  

---

# 📌 Scenario 2 — Wrong LOINC for A1c  
**Phenotype:** Incorrect Coding / Terminology

## Summary  
A1c labs are stored using incorrect or local codes, causing downstream systems to interpret them as missing.

## Why This Matters  
- Causes false missingness, even when tests are performed.  
- Breaks CMS122 and HEDIS diabetes measures.  
- Confuses clinics, who believe they are compliant.  

## How Oros Detects It  
- Terminology audits of incoming lab codes against known A1c LOINC sets.  
- Mapping table validation for each sending site.  
- Cross-site comparison of expected LOINC usage patterns.  

## Canonical RACI  
- Responsible: Clinic / EHR Vendor  
- Accountable: Vendor + Clinic  
- Consulted: HIE  
- Informed: Oros  

## Operational RACI  
- Responsible: Oros (detect), Vendor/Clinic (fix mapping)  
- Accountable: HIE or ACO  
- Consulted: Terminology experts (e.g., OntoPro)  
- Informed: RTA / T1DX  

## Likely Root Causes  
- Local test codes were substituted for LOINC.  
- Incorrect or outdated mapping table.  
- Vendor configuration errors during implementation.  

## Suggested Remediation  
1. Update A1c mapping in the EHR to standard LOINC codes.  
2. HIE normalizes incoming codes and verifies mapping behavior.  
3. Oros validates that A1c now appears correctly in measure logic.  

## Enabled Outcomes  
- Accurate A1c capture for all relevant measures.  
- Restoration of trust in quality reports.  

## Blocked Outcomes (if unresolved)  
- Underreported measure denominators and performance.  

---

# 📌 Scenario 3 — Malformed HL7 OBX Segment  
**Phenotype:** Structural / Formatting Error

## Summary  
Lab results arrive with malformed HL7 v2 OBX segments, causing ingestion failures or partial parsing.

## Why This Matters  
- Labs silently fail to enter population health and analytics systems.  
- Creates misleading gaps in completeness.  
- Delays onboarding and troubleshooting for rural sites.  

## How Oros Detects It  
- HL7 schema validation and parsing.  
- Segment-level error counters and logs.  
- Structural anomaly detection on OBX segments.  

## Canonical RACI  
- Responsible: EHR Vendor  
- Accountable: Vendor + HIE Interface Team  
- Consulted: Clinic IT  
- Informed: ACO, Oros  

## Operational RACI  
- Responsible: Oros (diagnose), HIE (interface fix)  
- Accountable: HIE  
- Consulted: Vendor  
- Informed: Clinic  

## Likely Root Causes  
- Interface upgrade regression.  
- Incorrect OBX data type or missing required fields.  
- Misconfigured HL7 routing rules.  

## Suggested Remediation  
1. Vendor corrects HL7 OBX structure based on interface specifications.  
2. HIE updates routing/interface configuration if needed.  
3. Oros validates that the feed is structurally sound and labs flow as expected.  

## Enabled Outcomes  
- Reliable ingestion of lab data.  
- Stable analytics and measure computation.  

## Blocked Outcomes (if unresolved)  
- Missing labs in quality measures and D-Data Dock.  

---

# 📌 Scenario 4 — Impossible Blood Pressure (e.g., 420/380)  
**Phenotype:** Plausibility Error

## Summary  
A blood pressure value is recorded with clinically impossible values.

## Why This Matters  
- Skews CMS165 (Controlling High Blood Pressure).  
- Reduces clinician trust in dashboards and reports.  
- Compromises monitoring of hypertension control programs.  

## How Oros Detects It  
- Range checks on systolic and diastolic values.  
- Unit validation (e.g., mmHg vs other units).  
- Encounter-level consistency rules and anomaly checks.  

## Canonical RACI  
- Responsible: Clinic  
- Accountable: Clinic Leadership  
- Consulted: HIE  
- Informed: ACO  

## Operational RACI  
- Responsible: Oros (flag), Clinic (review and correct)  
- Accountable: HIE or ACO program lead  
- Consulted: Clinic staff / quality team  
- Informed: T1DX or other analytics users  

## Likely Root Causes  
- Manual data entry typo.  
- Wrong units entered.  
- Faulty blood pressure device or documentation workflow.  

## Suggested Remediation  
1. Clinic reviews the outlier record in the EHR.  
2. Corrects or deletes the erroneous entry, or corrects units.  
3. Oros rescans and refreshes measure logic and trends.  

## Enabled Outcomes  
- Accurate CMS165 scoring.  
- Reliable BP trends at site and population level.  

## Blocked Outcomes (if unresolved)  
- Inflated hypertension control failure rates.  
- Misleading analytics for QI teams.  

---

# 📌 Scenario 5 — Duplicate MRN  
**Phenotype:** Identity Resolution Error

## Summary  
A patient has multiple MRNs across clinic and HIE systems, fragmenting their record.

## Why This Matters  
- CGM streams cannot be reliably linked to the correct patient.  
- Labs and encounters are split across identities.  
- Attribution lists become unreliable.  
- D-Data Dock workflows may fail or behave unpredictably.  

## How Oros Detects It  
- MPI mismatch and duplicate analysis.  
- Conflicting demographics across records.  
- Duplicate identifiers for overlapping populations.  

## Canonical RACI  
- Responsible: Clinic Registration, HIE MPI  
- Accountable: Clinic + HIE  
- Consulted: Oros  
- Informed: ACO, T1DX  

## Operational RACI  
- Responsible: Oros (detect), HIE (merge), Clinic (confirm identity)  
- Accountable: HIE  
- Consulted: Clinic Registration Team  
- Informed: RTA / T1DX  

## Likely Root Causes  
- Multiple registration systems or workflows.  
- Typographic errors in key demographics.  
- Inconsistent demographic updates over time.  

## Suggested Remediation  
1. HIE merges the patient records in the MPI.  
2. Clinic verifies and corrects demographics as needed.  
3. Oros revalidates identity readiness and downstream linkages.  

## Enabled Outcomes  
- Safe CGM linkage to the correct patient.  
- Accurate longitudinal analytics and readiness scoring.  

## Blocked Outcomes (if unresolved)  
- D-Data Dock workflows remain blocked or unsafe for this patient.  

---

# 📌 Scenario 6 — CCD Feed Down  
**Phenotype:** Transmission / Routing Failure

## Summary  
The CCD feed from the clinic to the HIE goes down for days or weeks, creating a large gap in data.

## Why This Matters  
- Encounters and labs stop flowing into the shared data environment.  
- ACO denominators and numerators become unreliable.  
- Attribution logic may fail or produce gaps.  
- Reporting deadlines and performance incentives are at risk.  

## How Oros Detects It  
- Feed uptime and volume monitoring.  
- Sudden drop in inbound CCD count.  
- Gap analysis for encounter and lab intervals.  

## Canonical RACI  
- Responsible: HIE Interface Team  
- Accountable: HIE  
- Consulted: EHR Vendor  
- Informed: Clinic, ACO  

## Operational RACI  
- Responsible: Oros (monitor and alert), HIE (fix routing)  
- Accountable: HIE  
- Consulted: Vendor  
- Informed: Clinic  

## Likely Root Causes  
- Routing rules changed or removed during an upgrade.  
- SSL certificate expiration.  
- Interface deactivation or misconfiguration.  

## Suggested Remediation  
1. HIE restores CCD routing and validates connectivity.  
2. Vendor confirms CCD generation on the EHR side.  
3. Oros reprocesses backlog if available and rescans readiness.  

## Enabled Outcomes  
- Continuous data flow from clinic to HIE.  
- Reliable measure computation and readiness assessment.  

## Blocked Outcomes (if unresolved)  
- Sites appear perpetually “not ready” for measures and D-Data Dock.  

---

# 🧩 Appendix: Future Real-World Scenarios

As Oros onboards more clinics, HIEs, and ACOs, each phenotype should accumulate **real operational cases**.

Suggested format for adding new scenarios:

Scenario: <Short title>  
Phenotype: <Which phenotype>  
Summary: <2–3 sentences>  
Root Cause: <What was actually broken>  
Remediation: <What was done>  
Outcome: <How readiness and trust improved>  

These will inform future refinements to the Data Quality phenotype taxonomy and RACI models.

---

End of document.
