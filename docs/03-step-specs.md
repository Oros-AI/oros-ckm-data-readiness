# Step Specs – V3 Wizard

This document captures deterministic + agentic behavior per step.

---

## Step 1 – Ingestion

*(To be filled in as we finalize the spec.)*

---

## Step 2 – Translation

*(To be filled in as we finalize the spec.)*

---

## Step 3 – Normalization

### Deterministic Behavior

- Input: translated JSON records (per patient).
- Tasks:
  - Map diagnoses to ICD-10 codes.
  - Map medications to RxNorm codes.
  - Map labs to LOINC codes.
  - Map procedures to SNOMED CT codes.
  - Normalize demographics:
    - Age in years.
    - Height in standardized unit (cm, if possible).
    - Weight in standardized unit (kg, if possible).
    - Sex normalized to M/F/Other.

- For V3 demo:
  - Start with **simple, opinionated rules**:
    - Height:
      - If value > 3 and < 3m -> assume cm or inches and convert if clearly inches.
    - Weight:
      - If value > threshold -> assume pounds and convert to kg, else assume kg.
  - Use internal lookup tables for common codes (ICD-10, RxNorm, etc.).
  - Non-matched values remain as raw strings but are highlighted.

- Output:
  - A `normalizedRecords` array where each record includes:
    - Standardized demographics.
    - Code fields populated where lookup succeeds.
    - Original raw values preserved alongside codes if helpful.

### Agentic Behavior (Archia)

- Trigger condition:
  - Normalization detects issues such as:
    - Missing or ambiguous codes.
    - Implausible units or values (e.g., absurd weight/height).
- When `AI_ENABLED = true`:
  1. Backend creates a payload and calls `POST /archia/agent`:
     - `step: "Normalization"`
     - `errorType` and `errorDetails`
     - `sampleRows` (subset of problematic rows)
     - optional metadata (e.g., which value sets were used).
  2. Archia responds with:
     - `root_cause`
     - `suggested_fixes[]`
     - `patched_rows[]` (optional)
     - `step_by_step_report`.

- Frontend behavior:
  - Opens the **AI side drawer** for Normalization.
  - Shows:
    - Short explanation (root cause).
    - List of suggested fixes.
    - A toggle to view **Original** vs **Patched** rows.
    - A narrative “What the agent did” section.
  - User can:
    - Accept a patch (create a new dataset version).
    - Or keep the original data.

### Data Versioning & Audit

- Normalization step must never silently overwrite the original dataset.
- We track:
  - `datasetId` (for the source CSV).
  - `version` numbers for:
    - Original deterministic normalization.
    - Any subsequent Archia-assisted patches.
- On patch apply:
  - Create a new `normalizedRecords` version.
  - Record an audit entry with:
    - `step: "Normalization"`
    - old vs new values (diff summary)
    - reference to Archia response (if used)
    - timestamp and user identity (when available).

### UI Behavior

- Main panel:
  - “Normalized Data Preview” table.
  - Summary of normalization standards (ICD-10, RxNorm, LOINC, SNOMED CT, units).
- Side drawer (when AI triggered):
  - Title: “Normalization – AI Analysis”
  - Sections:
    - “Root Cause”
    - “Suggested Fixes”
    - “Original vs Patched” table preview
    - “Analysis Report” (step-by-step narrative)
  - Actions:
    - **Apply Patch & Re-run** – re-run downstream steps on patched data.
    - **Dismiss** – keep original deterministic result.

---

## Step 4 – Scoring

*(To be filled in – currently completeness-based, will stay mostly deterministic.)*

---

## Step 5 – Persistence

*(To be filled in – includes NDJSON export and eventual logging.)*

---

## Step 6 – Enrichment

*(To be filled in.)*

---

## Step 7 – Analytics

*(To be filled in: deterministic reports + Ask-Anything tab.)*