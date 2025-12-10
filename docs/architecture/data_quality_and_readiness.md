# Oros Architecture  
## Data Quality & Data Readiness Model  
**Version:** v1.0  
**Status:** Draft for POC → will stabilize for MVP  

---

## 1. Purpose

This document defines the **Data Quality (DQ)** and **Data Readiness** framework for the Oros Pipeline.  
It provides a unified, intuitive structure for:

- HIEs  
- ACOs  
- RTA (D-Data Dock)  
- T1DX research/QI programs  
- Site-level clinics  
- EHR vendors  
- Governance bodies (NCQA, PIQI Alliance)

The model separates **EHR data integrity problems** (DQ phenotypes) from **workflow capability checks** (readiness domains), enabling clear scoring, remediation, and use-case enablement.

---

## 2. Core Concept – Data Quality ≠ Data Readiness

### 2.1 Data Quality (DQ)

Answers: *“What is wrong with the EHR data?”*  

Covers structural, semantic, identity, and completeness issues originating from **EHR → HIE → ACO** data feeds.

- DQ is **domain-independent**: the same defects impact multiple workflows.
- DQ is expressed as a small set of **phenotypes** that can be scored, tracked, and remediated.

### 2.2 Data Readiness

Answers: *“Are we ready to run this specific clinical, reporting, or QI workflow?”*  

Examples of workflows:

- D-Data Dock (CGM-only, then full EHR + CGM)
- NCQA HEDIS measures
- ACO/MSSP value-based reporting (CMS eCQMs)
- T1DX site-level QI projects

Readiness requires:

- Sufficient, clean **EHR data**
- **Identity resolution** so data can be linked correctly to people
- **Program or workflow enrollment** (e.g., CGM-sharing agreements)
- Presence of **specific data elements** required for that workflow

---

## 3. Final Data Quality Phenotypes (EHR/HIE Only)

All relevant EHR data issues are grouped into **six** operationally meaningful types.  
These apply across clinics, HIEs, ACOs, and research/QI programs.

### 3.1 DQ Phenotype 1 — Missing EHR Data

Typical examples:

- Missing A1c values
- Missing blood pressure readings
- Missing encounters (e.g., ED visits, hospitalizations)
- Missing diagnoses or medications
- Missing key demographics needed for attribution or matching

Impact:

- Blocks HEDIS and CMS measure computation
- Reduces accuracy of risk stratification and analytics
- Undermines program eligibility decisions

---

### 3.2 DQ Phenotype 2 — Incorrect Coding / Terminology

Typical examples:

- Wrong or outdated LOINC codes for labs
- Incorrect ICD-10 or SNOMED codes for diagnoses
- Medication codes not mapped correctly (e.g., RxNorm)
- Use of local/custom codes that are not normalized

Impact:

- Measures appear incomplete or incorrect
- Sites fail to meet program requirements despite doing the right clinical work
- HIE and ACO analytics become unreliable across sites

---

### 3.3 DQ Phenotype 3 — Structural / Formatting Errors

Typical examples:

- Malformed HL7 v2 segments
- Invalid CCD document structure
- Incorrect or incomplete FHIR resources
- Numeric fields encoded as text, or vice versa

Impact:

- Messages are dropped, ignored, or only partially processed
- Data silently fails to appear in downstream systems
- Interface teams spend time debugging basic transport instead of value-add use cases

---

### 3.4 DQ Phenotype 4 — Plausibility Errors

Typical examples:

- Out-of-range values (e.g., BP 420/380, A1c 81)
- Wrong units (mg/dL vs mmol/L, kg vs lb)
- Impossible timestamps (e.g., dates in the far future or far past)
- Clinically inconsistent combinations of values

Impact:

- Analytics become misleading or dangerous
- Outlier removal becomes ad hoc and manual
- Clinicians and analysts lose trust in dashboards

---

### 3.5 DQ Phenotype 5 — Identity Resolution Errors

Typical examples:

- Duplicate MRNs for the same person
- Conflicting demographics across systems
- Failed Master Patient Index (MPI) matching
- Records linked to the wrong individual

Impact:

- CGM, labs, and encounters attach to the wrong patient
- Attribution lists become unreliable
- Patient-level analytics and risk stratification cannot be trusted

---

### 3.6 DQ Phenotype 6 — Transmission / Routing Failures

Typical examples:

- HL7 feed downtime
- CCD documents not routed to the right endpoint
- Interface misconfiguration after an upgrade
- Missing or delayed messages

Impact:

- Data gaps appear without obvious cause
- Monthly or quarterly reporting windows are missed
- Sites lose confidence in the integration stack

---

## 4. Data Readiness Domains (Final Model)

**Data Readiness** is **use-case dependent** and built on top of Data Quality.  

A clinic or HIE may have excellent DQ scores overall but still be “not ready” for a specific workflow if certain data elements or program conditions are missing (e.g., A1c values for CMS122, or CGM enrollment for D-Data Dock).

Below are the Readiness Domains currently defined for the Oros ecosystem.

---

### 4.1 Domain 1 — Identity Readiness (Foundational)

A universal prerequisite for all workflows.

A site is **Identity Ready** when:

- A stable MRN (or equivalent patient identifier) exists
- Core demographics are complete (e.g., name, date of birth, sex)
- Identity resolution (MPI) succeeds across systems (EHR → HIE → Oros / D-Data Dock)

Identity readiness is required for:

- Safe linking of CGM streams to patients
- HEDIS measure computation
- ACO / MSSP quality reporting
- T1DX project eligibility
- All D-Data Dock workflows (CGM-only and full EHR + CGM)

This domain is primarily gated by:

- DQ Phenotype 1 (Missing EHR Data – demographics)
- DQ Phenotype 5 (Identity Resolution Errors)

---

### 4.2 Domain 2 — D-Data Dock Readiness (CGM-Only Mode)

Years 1–2 of the Kansas rural health initiative focus on a **CGM-only** mode of D-Data Dock.

A site is **CGM-Ready for D-Data Dock** when:

- It is **Identity Ready**
- The clinic is enrolled in the RTA CGM-sharing program
- Patients are mapped correctly under the Dexcom (or other manufacturer) sharing agreement
- The CGM data stream is active and flowing into D-Data Dock

Key points:

- CGM data itself is **not treated as a data quality issue** in this model; it is already structured and standardized.
- Readiness here depends on **identity**, **program enrollment**, and **stream availability**, not on CGM “quality.”

---

### 4.3 Domain 3 — D-Data Dock Readiness (Full EHR + CGM Mode)

In later phases (e.g., Year 3+), D-Data Dock uses both CGM and EHR data.

A site is **Full D-Data Dock Ready** when:

- It is **Identity Ready**
- It is **CGM-Ready** (as per Domain 2)
- EHR complements are available and clean, including:
  - A1c laboratory values
  - Encounter data (e.g., DKA-related hospitalizations)
  - Medications relevant to diabetes management
  - Diagnoses (e.g., diabetes, comorbidities)

- There are no major Data Quality defects in the lab, encounter, medication, or diagnosis pipelines.

This readiness domain enables:

- Combined CGM + EHR analytics
- More accurate risk stratification
- Rural patient monitoring and follow-up at scale

---

### 4.4 Domain 4 — NCQA HEDIS Readiness

This domain covers readiness for computing **NCQA HEDIS** measures.  
It is explicitly **not** the same as CMS eCQMs (e.g., CMS122, CMS165).

A site is **HEDIS-Ready** when:

- Required EHR elements for the selected HEDIS measures are present
- Coding is correct (LOINC, ICD-10, SNOMED, RxNorm as applicable)
- Encounters and vitals (e.g., BP) are sufficiently complete
- Exclusions can be identified (e.g., certain comorbidities, hospice)
- Attribution and denominator logic can be supported

This aligns with:

- The RTA HEDIS-focused project
- NCQA and PIQI-aligned work

---

### 4.5 Domain 5 — ACO / VBC Program Readiness (Includes CMS eCQMs)

This domain captures readiness for **ACO and value-based care programs**, including **CMS eCQM** measures such as CMS122 (A1c Poor Control) and CMS165 (Controlling High Blood Pressure).

A site or ACO is **ACO/VBC Ready** when:

- CMS eCQMs relevant to its contracts (e.g., CMS122, CMS165) can be computed reliably without manual stitching
- Attribution lists are available and usable
- Supplemental and program-specific fields are present (e.g., payer-specific requirements)
- Data Quality phenotypes do not prevent calculation of measures

In practice:

- **ACO/VBC Readiness = CMS eCQM readiness + program-specific extras.**

This domain is most relevant for:

- ACO leadership (e.g., Jodi and Care Collaborative)
- MSSP and other CMS quality programs
- Value-based payment arrangements

---

### 4.6 Domain 6 — T1DX QI Project Readiness

This domain is specific to individual T1DX quality improvement or research projects.

A site is **T1DX-Ready** for a given project when:

- The required EHR elements for that project are present (labs, encounters, device data, etc.)
- Completeness thresholds are met
- Coding conforms to project rules
- Monthly or periodic ingestion is reliable

This domain is **project-configurable** and can be defined per T1DX initiative.

---

### 4.7 Domain 7 — Future: RPM / Telehealth Readiness

This domain is reserved for future use and will likely be gated by:

- Presence of required RPM documentation (e.g., time logs, notes)
- Availability of the correct CPT codes in the EHR
- Integration of device data where relevant
- Alignment of clinic workflows with billing and compliance requirements

---

## 5. ASCII Architecture Diagram (Markdown-Safe)

    +-----------------------------+
    |       Identity Readiness    |
    |  (Foundational prerequisite)|
    +--------------+--------------+
                   |
                   v
      +--------------------------------------------+
      |              Data Readiness                |
      +--------------------------------------------+
      |  CGM-Only D-Data Dock Readiness            |
      |  Full D-Data Dock Readiness (EHR + CGM)    |
      |  HEDIS Readiness (NCQA)                    |
      |  ACO/VBC Readiness (CMS eCQMs + extras)    |
      |  T1DX QI Project Readiness                 |
      |  RPM Readiness (future)                    |
      +--------------------------------------------+
                   ^
                   |
    +--------------+--------------+
    |       Data Quality          |
    |  (Six EHR Data Phenotypes)  |
    +-----------------------------+

---

## 6. Miro-Friendly Block Diagram (Text-Only)

DATA QUALITY (EHR-ONLY ISSUES)  
--------------------------------  
1. Missing EHR Data  
2. Incorrect Coding / Terminology  
3. Structural / Formatting Errors  
4. Plausibility Errors  
5. Identity Resolution Errors  
6. Transmission / Routing Failures  

These defects impact every downstream workflow.

DATA READINESS (WORKFLOW CAPABILITY LAYERS)  
-------------------------------------------  

[Identity Readiness]  ← foundational layer

Above this layer:

[CGM-Only D-Data Dock Readiness]  
  - Identity ready  
  - Enrollment ready  
  - CGM stream active  

[Full D-Data Dock Readiness]  
  - All of the above  
  - EHR complements clean (A1c, encounters, dx, meds)  

[HEDIS Readiness]  
  - NCQA measures  
  - Required fields present  
  - Coding valid  

[ACO/VBC Readiness]  
  - CMS eCQMs (CMS122, CMS165)  
  - Attribution + supplemental data  
  - Clinic program requirements  

[T1DX Readiness]  
  - Project-specific data domains  
  - Completeness & coding thresholds  

[RPM Readiness] (future)  
  - Documentation + vitals  
  - Device feeds  

Each readiness layer uses the same Data Quality phenotypes underneath.

---

## 7. Demo-Friendly Explanation

You can use or adapt this text in decks, demos, or documentation:

> Oros separates **Data Quality** from **Data Readiness**.  
>  
> Data Quality is about what is broken in the EHR data — missing A1c, wrong LOINC codes, malformed HL7, identity mismatches, and so on. These issues show up as one of six phenotypes.  
>  
> Data Readiness is about whether a workflow can run once data is clean.  
>  
> For example:  
> - D-Data Dock CGM-only mode requires identity readiness and an active CGM data stream.  
> - Full D-Data Dock requires clean EHR data in addition to CGM.  
> - HEDIS readiness requires the NCQA-specified data elements.  
> - ACO/VBC readiness requires that CMS eCQM measures (like CMS122 and CMS165), along with program-specific fields, can be computed without manual stitching.  
> - T1DX readiness depends on project-specific data elements and thresholds.  
>  
> Every readiness domain sits on top of the same six Data Quality phenotypes, which Oros scores and for which it can generate remediation guidance.

---

## 8. Related Documents

- **Phenotype-Based RACI Matrix**  
  Describes who is responsible and who executes remediation for each Data Quality phenotype.  
  See: `docs/architecture/phenotype_raci_matrix.md`

- **Remediation Scenarios**  
  Concrete, human-readable remediation summaries per phenotype.  
  See: `docs/architecture/remediation_scenarios.md`

- **Frontend Feedback Synthesis**  
  Captures user feedback (RTA, T1DX, ACO, HIE) and how it maps to UI decisions.  
  See: `docs/frontend/feedback_synthesis.md`

---

_End of document._