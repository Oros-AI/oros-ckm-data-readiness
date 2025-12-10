# Oros Frontend – User Feedback Synthesis  
**Version:** v1.1  
**Status:** Updated to collapse Juan + Dan into a single unified persona**

This document consolidates user feedback from:  
- RTA Clinical Leadership (Dan + Juan unified)  
- T1DX Analytics Team (Sukhtej & Anton)  
- RTA Dashboard Planning Session  
- ACO Leadership  
- HIE Technical Leaders  

It translates real user needs into *options* (not decisions) for the v3 Wizard and MVP frontend.

---

# 1. High-Level Themes Across All Users

### 1.1 Users want persona-specific experiences  
Not everyone wants to see pipeline steps.  
Some want analytics only, others want full technical visibility.

### 1.2 Strong desire for “Data Readiness Reports”  
Users consistently want to know:  
> “Can I run the workflow I care about with the data I have?”

### 1.3 Clear separation of Data Quality vs Data Readiness  
Users implicitly understand this model when explained.

### 1.4 Ability to select scoring rubric  
Different orgs use different specs (PIQI, T1DX v1.0/v1.1).

### 1.5 “Ask Anything” panel should always remain accessible  
Context-sensitive prompts preferred.

### 1.6 Remediation must be actionable  
Showing “data is bad” is insufficient → users want pathways.

### 1.7 Agentic mode must be visible and explainable  
Users want clarity when AI is acting.

---

# 2. Unified Persona: **RTA Clinical Leader (Dan)**  
*(represents both Dan and Juan; Juan functions as a “superuser variant” but shares the same product needs)*

This single persona covers:

- RTA clinical leadership  
- KUMC clinical users  
- Rural health transformation leadership  
- D-Data Dock users (CGM-only mode, then full EHR+CGM mode)  
- Clinicians using data for patient care & operational decision-making  

## 2.1 Overview  
The RTA Clinical Leader is a clinician whose primary goal is:  
> “Do I have enough clean, complete, trustworthy data from rural sites to treat patients and support our programs?”

They do **not** care about technical ingestion steps.  
They care about readiness, sufficiency, completeness, and analytics.

## 2.2 What they care about  
- D-Data Dock readiness  
- CGM-only and full-mode readiness  
- Site-level comparisons across rural clinics  
- Completeness of A1c, BP, encounters, meds, diagnoses  
- Identity readiness (MRN + demographics)  
- High-level remediation guidance  
- Ability to trust dashboards and patient data panels  
- Running analytics directly on validated, normalized datasets  

## 2.3 What they do *not* care about  
- HL7 message structure  
- CCD parsing  
- Terminology normalization details  
- Database schemas  
- Pipeline execution graphs  
- File-level validation reports  

## 2.4 UX Implications  
- **Skip Steps 1–6** of the wizard; default to Analytics & Readiness  
- Show domain-specific readiness:  
  - Identity  
  - CGM-only  
  - Full EHR+CGM  
  - HEDIS (if relevant)  
  - ACO/VBC readiness  
  - T1DX readiness  
- Provide clear quality summaries per rural clinic  
- Provide “fix vs benefit” pathway (remediation_scenarios)  
- Provide persona-aware suggested questions in Ask Anything  

## 2.5 Superuser Variation (Juan)  
Juan participates in design conversations and may request:  
- Additional validation visualizations  
- More detailed completeness or trending charts  
- Cohort-level analytics summaries  

However, **his functional UI needs are identical**, so no separate persona is required.

---

# 3. Other Personas (unchanged)

## 3.1 T1DX Analytics Team  
Needs include rubric selection, monthly ingestion quality trends, mapping diagnostics, and project readiness.

## 3.2 ACO Leadership  
Focuses on CMS122, CMS165, attribution reliability, clinic comparisons, readiness reports.

## 3.3 HIE Technical Leadership (e.g., Greg Ator)  
Wants full pipeline visibility, validation diagnostics, feed status, terminology mapping summaries, and structural error logs.

---

# 4. Feature Requests & UX Implications

## 4.1 Collapsible Pipeline Steps  
Options:  
1. Persona-based auto-collapse  
2. Global toggle (“Clinical Mode” vs “Technical Mode”)  
3. Default collapsed for RTA Clinical Leader  

## 4.2 Readiness Reports Section  
Includes all readiness domains:  
- Identity  
- CGM-only D-Data Dock  
- Full D-Data Dock  
- HEDIS readiness  
- ACO/VBC readiness  
- T1DX project readiness  

Each domain should show:  
- Required elements  
- Missing elements  
- How to fix  
- What becomes possible afterward  

## 4.3 Rubric Selection (Step 5 – Scoring)  
Rubrics:  
- PIQI Diabetes  
- T1DX v1.0  
- T1DX v1.1  
- Future RTA rules  

## 4.4 Ask Anything Panel  
Behavior:  
- Always present  
- Persona-aware suggested prompts  
- Step-aware suggested prompts  

## 4.5 Agentic Mode  
Indicate when agentic actions occur:  
- Subtle icon or banner  
- Activity log  
- Explainer text  

## 4.6 Remediation Integration  
Connect to:  
- `remediation_scenarios.md`  
- RACI insights  
- Enabled/blocked outcomes  

---

# 5. POC vs MVP

### POC  
- Persona-based collapsing (simple)  
- Readiness reporting (simplified)  
- Rubric selection  
- Ask Anything + agentic mode indication  
- Integration with remediation scenarios  

### MVP  
- Role-based access control  
- Full readiness dashboards per persona  
- Multi-site analytics  
- Exportable remediation reports  
- Monthly ingestion dashboards  
- Cohort comparison tools  

---

# 6. Demo Narrative

> “RTA clinical users like Dan—and by extension Juan—only care about whether they have enough trustworthy data to run D-Data Dock and support rural patient care.  
> The frontend must therefore minimize technical noise, surface readiness reports, highlight gaps, and provide actionable remediation to unlock clinical workflows.”

---

# Cross-References Updated  
- Remediation Scenarios → `remediation_scenarios.md`  
- Data Quality & Readiness Model → `data_quality_and_readiness.md`  
- Phenotype RACI Matrix → `phenotype_raci_matrix.md`  

---

End of document.
