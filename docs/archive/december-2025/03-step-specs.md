# Oros DQ Pipeline – Step Specifications (Index)

This document serves as an index for all step specifications in the Oros DQ Demo (v3).  
Each step is defined in its own modular file under `docs/pipeline-specs/`.  
This improves clarity, collaboration, and future extension of deterministic and agentic workflows.

---

## 📘 Step Specification Modules

### **Step 1 — Ingestion**
**File:** `pipeline-specs/step01-ingestion.md`  
Process input CSVs, validate column structure, preview ingested records, trigger agentic fallback for malformed rows.

---

### **Step 2 — Translation**
**File:** `pipeline-specs/step02-translation.md`  
Convert CSV rows → structured JSON, detect schema mismatches, support FHIR-lite evolution, surface translation errors.

---

### **Step 3 — Normalization**
**File:** `pipeline-specs/step03-normalization.md`  
Normalize terminology (ICD-10/RxNorm/LOINC/SNOMED-CT), demographics units, handle invalid/missing codes, agentic fixes with versioning.

---

### **Step 4 — Scoring**
**File:** `pipeline-specs/step04-scoring.md`  
Deterministic PIQI-lite completeness scoring (0–100), domain-level thresholds, and optional PIQI-inspired agentic scoring extension.

---

### **Step 5 — Persistence**
**File:** `pipeline-specs/step05-persistence.md`  
Mock write to DuckDB or persistence layer, generate NDJSON export, support agentic data patch logging.

---

### **Step 6 — Enrichment**
**File:** `pipeline-specs/step06-enrichment.md`  
Compute BMI, diabetes risk scores, risk tiers, and derived features. Agentic support for medical plausibility checks.

---

### **Step 7 — Analytics**
**File:** `pipeline-specs/step07-analytics.md`  
Two-tab analytics: deterministic dashboards and agentic “Ask Anything” NLP interface.  
Respects global `AI_ENABLED` configuration.

---

## 🧭 How to Use This Index

1. The implementation team should reference the individual step files when building or modifying the pipeline.
2. The UX/UI team can design screens directly against the requirements defined in each step module.
3. The Archia integration team can follow the agentic sections inside each step (e.g., agent triggers, payloads, patch flows).
4. The index will stay stable even as individual step specs evolve.

---

## 🧩 Notes

- Each step specification includes: deterministic logic, agentic triggers, data contracts, UI expectations, and logging requirements.
- This index and module structure aligns with the v3 architecture document.
- All updates to pipeline steps should be made inside the appropriate `pipeline-specs/stepXX-*.md` file.