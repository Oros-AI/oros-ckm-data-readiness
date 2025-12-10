# Oros Architecture  
## Phenotype-Based RACI Matrix  
**Version:** v1.0  
**Status:** Draft for POC → will stabilize for MVP**

---

# 1. Purpose

This document defines the **RACI model (Responsible, Accountable, Consulted, Informed)** for addressing each of the six Oros Data Quality Phenotypes.  
It clarifies:

- **Canonical RACI** — who *truly owns* the fix at the ecosystem level  
- **Operational RACI** — who actually *executes* remediation steps, especially when Oros acts on behalf of HIEs or ACOs  

This model is essential for:
- HIE onboarding workflows  
- ACO quality reporting  
- Rural clinic support  
- T1DX ingestion and normalization  
- PIQI-aligned quality scoring  

---

# 2. Overview of Two-Layer RACI

## 2.1 Canonical RACI (Ownership Layer)

This represents the *true, formal responsibility* in the healthcare ecosystem.

- **Clinic / Provider Organization**  
  Owns data correctness and completeness **inside the EHR**.  

- **EHR Vendor**  
  Owns structural, interface, and terminology correctness **inside their system**.  

- **HIE (e.g., LACIE)**  
  Owns correctness of data *transmission, normalization, and routing* once data leaves the EHR.  

- **ACO / Payer / Program Operator**  
  Owns attribution logic and measure interpretation requirements.  

- **Oros**  
  **Does not own data** but may execute remediation workflows *on behalf of* HIEs or ACOs.  


## 2.2 Operational RACI (Execution Layer)

This reflects *real-world execution* when HIEs / ACOs contract Oros to do work for them.

- **Oros Engineering & Data Pipeline**  
  Performs ingestion, validation, normalization, scoring, and issue detection.  

- **Oros Support / Remediation Team**  
  Generates reports, flags issues, communicates with stakeholders, and helps coordinate fixes.  

- **HIE / ACO Program Leads**  
  Relay remediation requirements back to clinics/EHR vendors if contractual authority is needed.  

This separation is critical:

> **Canonical RACI = ownership**  
> **Operational RACI = who actually does the work day-to-day**  

---

# 3. RACI Matrix by Phenotype

Below is the full matrix for all six phenotypes.  
Each section includes:

- Canonical RACI (ownership)
- Operational RACI (execution)
- Example scenario

---

# 3.1 Phenotype 1 — Missing EHR Data  
(e.g., missing A1c, missing encounters, missing diagnoses)

## Canonical RACI  
- **R (Responsible): Clinic**  
- **A (Accountable): Clinic Leadership / Medical Director**  
- **C (Consulted): HIE, ACO**  
- **I (Informed): Oros, T1DX, RTA**

Missing data originates **inside the EHR**, so the clinic owns the fix.

## Operational RACI  
- **R: Oros (detects), Clinic (fixes)**  
- **A: HIE or ACO program lead**  
- **C: EHR vendor**  
- **I: T1DX, RTA analytics teams**

Oros identifies missingness; Clinic/EHR vendor must correct.

## Example  
A rural clinic is missing 60% of A1c values → Oros flags → ACO informs clinic → Clinic updates workflows → Oros re-scores.

---

# 3.2 Phenotype 2 — Incorrect Coding / Terminology  
(e.g., wrong LOINC, ICD-10, or SNOMED codes)

## Canonical RACI  
- **R: Clinic (system-of-record assignment)**  
- **A: Clinic + EHR Vendor**  
- **C: HIE**  
- **I: ACO, Oros**

## Operational RACI  
- **R: Oros (detect mapping issues), Clinic/EHR (fix codes)**  
- **A: HIE / ACO**  
- **C: Terminology experts (OntoPro if engaged)**  
- **I: T1DX / RTA as downstream users**

## Example  
A1c uses custom local codes → Oros flags → EHR vendor updates LOINC mapping → HIE normalizes → ACO now sees accurate measure denominators.

---

# 3.3 Phenotype 3 — Structural / Formatting Errors  
(e.g., malformed HL7 v2, invalid CCD, incorrect FHIR)

## Canonical RACI  
- **R: EHR Vendor**  
- **A: Vendor + HIE Interface Team**  
- **C: Clinic IT, Oros**  
- **I: ACO, T1DX**

## Operational RACI  
- **R: Oros (diagnostics), HIE (interface fix)**  
- **A: HIE**  
- **C: EHR vendor**  
- **I: Clinic**

## Example  
OBX segments malformed → Oros detects → HIE escalates to vendor → Vendor patches interface → Oros confirms fix.

---

# 3.4 Phenotype 4 — Plausibility Errors  
(e.g., impossible lab values, invalid timestamps)

## Canonical RACI  
- **R: Clinic (data entry) or Device/EHR (automation)**  
- **A: Clinic Leadership**  
- **C: HIE**  
- **I: ACO, T1DX**

## Operational RACI  
- **R: Oros (flag inconsistencies)**  
- **A: HIE or ACO**  
- **C: Clinic**  
- **I: RTA/T1DX**

## Example  
BP 420/380 appears → Oros flags → Clinic corrects → Measures and risk models stabilize.

---

# 3.5 Phenotype 5 — Identity Resolution Errors  
(duplicate MRNs, conflicting demographics, failed MPI)

## Canonical RACI  
- **R: Clinic (source of truth)**  
- **A: Clinic + HIE (MPI)**  
- **C: Oros**  
- **I: ACO, T1DX**

## Operational RACI  
- **R: Oros (detect mismatches)**  
- **A: HIE MPI Administrator**  
- **C: Clinic Registration Team**  
- **I: ACO, T1DX**

## Example  
Two MRNs for same patient → Oros flags → HIE merges records → D-Data Dock can link CGM streams correctly.

---

# 3.6 Phenotype 6 — Transmission / Routing Failures  
(HL7 downtime, CCD routing errors, interface outages)

## Canonical RACI  
- **R: HIE Interface Team**  
- **A: HIE**  
- **C: EHR vendor**  
- **I: Oros, ACO**

## Operational RACI  
- **R: Oros (monitor uptime)**  
- **A: HIE**  
- **C: EHR vendor**  
- **I: Clinic, ACO**

## Example  
CCD files stop flowing after upgrade → Oros detects → HIE escalates → Vendor reconfigures routing.

---

# 4. Consolidated RACI Table

| Phenotype | Responsible (Canonical) | Accountable (Canonical) | Responsible (Operational) | Accountable (Operational) |
|----------|--------------------------|---------------------------|-----------------------------|-----------------------------|
| Missing Data | Clinic | Clinic Leadership | Oros (detect), Clinic (fix) | HIE / ACO |
| Incorrect Coding | Clinic / Vendor | Vendor + Clinic | Oros (detect), Clinic/EHR (fix) | HIE / ACO |
| Structural Errors | Vendor | Vendor + HIE | Oros (diagnose), HIE (fix) | HIE |
| Plausibility Errors | Clinic | Clinic Leadership | Oros (flag), Clinic (fix) | HIE / ACO |
| Identity Errors | Clinic + HIE | Clinic + HIE | Oros (detect), HIE (MPI fix) | HIE |
| Transmission Failures | HIE | HIE | Oros (monitor), HIE (fix) | HIE |

---

# 5. Demo-Friendly Summary

> “For each data quality issue, Oros distinguishes between **who owns the fix** and **who executes the fix**.  
> Clinics and vendors are often canonically responsible, but HIEs and ACOs frequently rely on Oros to detect and operationalize remediation.  
>  
> This two-layer RACI makes roles clear, prevents confusion, and creates a scalable governance model.”

---

# End of Document
