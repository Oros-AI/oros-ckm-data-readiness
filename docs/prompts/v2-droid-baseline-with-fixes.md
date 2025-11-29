# Oros – Healthcare Data Pipeline Wizard (V2 Baseline + Fixes)

You are an expert TypeScript/React engineer.  
Your task is to (re)create a **single-page CSV workflow wizard UI** for a healthcare data pipeline.  
This V2 baseline includes **all features currently implemented** plus a few **fixes and improvements that must be implemented now** (not just documented).

The result must be a **clean, production-quality Vite + React + TypeScript + Tailwind** project that matches this spec.

---

## 1. Tech Stack & Project Structure

- **Frontend framework:** React 18 with TypeScript
- **Bundler:** Vite
- **Styling:** Tailwind CSS
- **Charts:** Any React/D3 wrapper (e.g., `recharts`) is OK, but structure components so we could later swap to raw D3.
- **Routing:** **No React Router**. This is a **single-page wizard**, all navigation is state-driven.
- **State management:** Local React state / `useReducer` / custom hooks – no external state library.

Create a structure similar to:

- `src/App.tsx` – wizard orchestration + layout
- `src/state/wizardState.ts` – wizard state, actions, reducer
- `src/types/wizard.ts` – shared types & enums
- `src/services/pipelineService.ts` – deterministic pipeline logic + scoring + NDJSON generation
- `src/steps/…Step.tsx` – one file per step:
  - `IngestionStep.tsx`
  - `TranslationStep.tsx`
  - `NormalizationStep.tsx`
  - `ScoringStep.tsx` (label in UI is “Scoring”)
  - `PersistenceStep.tsx`
  - `EnrichmentStep.tsx`
  - `AnalyticsStep.tsx`
- `src/components/TopPipelineBar.tsx` – train-track style step bar (top 15%)
- `src/components/BottomStatusBar.tsx` – status / log bar (bottom ~5%)
- `src/components/StepWorkspace.tsx` – generic middle content area (80%)

Also include a sample data file:

- `sample-patient-data.csv` – 20 synthetic patient records we can ingest.

---

## 2. Layout & Visual Design

The app is a **single page** divided into three vertical sections:

1. **Top bar (15% height)** – “pipeline train-track”
   - Left: product/title (e.g., “Healthcare Pipeline Wizard” + small Oros logo placeholder).
   - Center: horizontal sequence of **7 circular steps**:
     1. Ingestion  
     2. Translation  
     3. Normalization  
     4. Scoring  
     5. Persistence  
     6. Enrichment  
     7. Analytics
   - Each circle has:
     - Label
     - Status color:
       - Grey: Pending (not run yet)
       - Blue: Running
       - Green: Success
       - Red: Error
   - Clicking a step:
     - Switches the middle content to that step’s UI.
     - Does **not** automatically execute the step.

2. **Middle content (80% height)** – step-specific workspace
   - Shows the UI for the currently selected step.
   - Each step shows:
     - Clear title
     - Short description
     - Step-specific controls / previews
     - A **“Run Step”** button
   - Where meaningful, show a **data preview** (e.g., table or JSON snippet).

3. **Bottom bar (5% height)** – status & messages
   - Shows:
     - Last executed step name
     - Status: Pending / Running / Success / Error
     - Short message / error reason if any
   - Optional: a small log of recent events (last few actions).

Use Tailwind to keep the layout clean, with a neutral medical-data feel (whites, greys, subtle blues/greens).

---

## 3. Pipeline Overview

The wizard models a **7-step deterministic data pipeline** over CSV patient data.

The steps are:

1. **Ingestion** – upload CSV file
2. **Translation** – convert CSV rows to JSON objects
3. **Normalization** – map fields to standardized terminologies/units
4. **Scoring (DQ Scoring)** – compute completeness-based quality scores per domain
5. **Persistence** – simulate saving normalized data + NDJSON generation
6. **Enrichment** – derive BMI, diabetes risk scores
7. **Analytics** – visualize enriched data

We keep the pipeline **deterministic** in V2.  
Agentic behavior will be added in V3 and is **out of scope** here.

---

## 4. Data Model & Types (High Level)

In `src/types/wizard.ts` define:

- **StepId** – union of:
  - `"INGESTION" | "TRANSLATION" | "NORMALIZATION" | "SCORING" | "PERSISTENCE" | "ENRICHMENT" | "ANALYTICS"`
- **StepStatus** – `"PENDING" | "RUNNING" | "SUCCESS" | "ERROR"`
- **DomainQualityScore**:
  - `domain: string` – e.g., `"Demographics"`, `"Vitals"`, …
  - `score: number` – integer 0–100
  - `label: "Excellent" | "Good" | "Fair" | "Poor"`
  - `present?: number` – count of non-missing values used
  - `total?: number` – total possible values
- **WizardState** – includes:
  - `currentStep: StepId`
  - `stepStatuses: Record<StepId, StepStatus>`
  - `lastMessage: string | null`
  - `csvRawText: string | null`
  - `parsedRecords: RawRecord[]` – rows from CSV
  - `translatedRecords: any[]` – JSON objects from translation
  - `normalizedRecords: NormalizedRecord[]`
  - `qualityScores: DomainQualityScore[]`
  - `enrichedRecords: EnrichedRecord[]`
  - `ndjsonContent: string | null` – NDJSON constructed in Persistence step
  - `isRunningAll: boolean` – for Run All behavior

Use clear types for `RawRecord`, `NormalizedRecord`, `EnrichedRecord`.

---

## 5. Step Details

### 5.1 Ingestion Step

**Goal:** Upload a CSV file and show a preview.

- Input format: **CSV** with columns like:
  - `id`, `name`, `age`, `sex`, `height`, `weight`,
  - `diagnosis1`, `diagnosis2`,
  - `medication1`, `medication2`,
  - `lab1`, `lab2`,
  - `procedure1`, `procedure2`
- UI:
  - File upload component for `.csv`
  - When a file is selected:
    - Read as text (FileReader).
    - Store raw CSV string in state.
    - Parse into `parsedRecords` (array of objects) using a simple CSV parser.
  - Show a small table preview (e.g., first 5 rows).
  - “Run Step”:
    - Mark step as RUNNING → SUCCESS if parse succeeds, ERROR if not.
    - On error, show a short message in bottom bar.

### 5.2 Translation Step

**Goal:** Convert parsed CSV rows into structured JSON objects.

- Input: `parsedRecords` from Ingestion.
- Implementation:
  - “Run Step”:
    - If no parsed records:
      - Set this step to ERROR and show message: “No ingested data. Please run Ingestion first.”
    - Otherwise:
      - Transform records into JSON objects (possibly with some type coercion).
      - Save to `translatedRecords`.
      - Mark step SUCCESS.
- UI:
  - Brief description.
  - JSON preview: show 3 sample JSON objects (pretty-printed).

### 5.3 Normalization Step

**Goal:** Normalize data to standardized terminology and units.

- Input: `translatedRecords`.
- Implementation:
  - Build a **mock normalization**:
    - Map diagnoses to fake ICD-10 codes.
    - Map medications to fake RxNorm codes.
    - Map labs to fake LOINC codes.
    - Map procedures to fake SNOMED CT codes.
    - Normalize age to years; sex to `M`, `F`, `Other`.
    - Convert height to cm, weight to kg.
  - Use small, hard-coded mapping dictionaries sufficient for the demo.
  - Store results in `normalizedRecords`.
- Missing data:
  - If any field is missing, leave it null/undefined but preserve the record.
- UI:
  - Show a small table or JSON preview of normalized records (3 rows).
  - “Run Step” handles missing inputs with a clear error if translation wasn’t run.

### 5.4 Scoring Step (DQ Scoring)

**Goal:** Compute **completeness-based data quality scores** per domain.

- UI label for this step: **“Scoring”**
- Conceptually: a **mock PIQI-like scoring** based **only on completeness**, not a full PIQI implementation.

**Domains:**

- `Demographics` – fields like id, age, sex, etc.
- `Vitals` – e.g., height, weight.
- `Labs`
- `Medications`
- `Conditions`
- `Procedures`
- `Allergies`
- `Immunizations`

**Scoring logic (implement this in `pipelineService.ts`):**

- For each domain:
  - Determine which fields/arrays belong to that domain.
  - For each patient:
    - Use `isPresent()` helper to check if value is non-missing.
  - Compute:
    - `present` = total non-missing values in this domain across all records.
    - `total` = total possible values for that domain.
    - `score` = `Math.round((present / total) * 100)` (0–100).
- Map `score` to qualitative `label`:
  - `90–100` → `"Excellent"`
  - `75–89` → `"Good"`
  - `50–74` → `"Fair"`
  - `<50` → `"Poor"`

**UI behavior:**

- Show a **card per domain** with:
  - Domain name
  - Score as integer percent (e.g., `83%`)
  - Label (Excellent/Good/Fair/Poor)
  - Present/total counts where available (e.g., `170 / 200 values present`)
- Color thresholds:
  - Green: score ≥ 90
  - Yellow: score ≥ 75
  - Orange: score ≥ 50
  - Red: score < 50
- Include a small note:
  > “Note: This is a demo completeness-based quality score, not a full PIQI implementation.”

### 5.5 Persistence Step

**Goal:** Simulate writing normalized data to a database and generate NDJSON.

- Input: `normalizedRecords`.
- Implementation:
  - Mock DB persistence:
    - No real DB, but pretend we write to “DuckDB”.
    - In code, you can simply:
      - Count records.
      - Simulate a short delay (optional).
  - **NDJSON generation (must be implemented):**
    - If there are normalized records:
      - Build `ndjsonContent` as:
        ```ts
        const ndjson = normalizedRecords
          .map(r => JSON.stringify(r))
          .join('\n');
        ```
      - Store string in `wizardState.ndjsonContent`.
    - If no data:
      - Set step to ERROR with a clear message.

**UI:**

- Display:
  - Number of normalized records “written.”
- Show a **preview of the first 3 NDJSON lines**:
  - Display as text in a scrolling code-style box.
- Add a **“Download NDJSON”** button:
  - Enabled only when `ndjsonContent` is available.
  - On click:
    - Use `Blob` + `URL.createObjectURL` to trigger download of `pipeline-output.ndjson`.
- If no normalized data:
  - Disable the button and show a short message:
    - “No normalized records available. Please run Normalization successfully first.”

### 5.6 Enrichment Step

**Goal:** Compute simple enrichment metrics.

- Input: `normalizedRecords`.
- Implement:
  - **BMI**:
    - Use height (cm) and weight (kg).
    - `BMI = weightKg / (heightM^2)`, where `heightM = heightCm / 100`.
  - **Diabetes risk score**:
    - Simple mock formula using age, BMI, maybe presence of diabetes-related diagnoses.
    - Example: base on age + BMI + whether any condition code includes `"E11"` etc.
  - Attach enrichment values to `enrichedRecords`.
- UI:
  - Show a small table with columns:
    - id, BMI, diabetes risk score (0–100), maybe category (Low/Moderate/High).
  - “Run Step” must set status, handle missing normalization, and update bottom bar.

### 5.7 Analytics Step

**Goal:** Show a **multi-chart dashboard** over enriched data.

- Use a chart library (`recharts` or similar) with a structure that could be swapped for D3 later.
- Examples of charts:
  - Distribution of ages.
  - Distribution of BMI.
  - Distribution of diabetes risk scores (e.g., histogram or bar chart).
- UI:
  - Cards with 2–3 simple charts.
  - Use responsive layout but keep it simple.

---

## 6. Global Controls & Run-All Behavior (MUST IMPLEMENT)

We need both **per-step execution** and a robust **Run All** behavior.

### 6.1 Per-Step Behavior

- Each step has its own “Run Step” button.
- Clicking “Run Step”:
  - Sets that step status to RUNNING.
  - Calls the relevant pipeline function (`runIngestion`, `runTranslation`, etc.).
  - On success: updates relevant state; sets status to SUCCESS.
  - On failure: sets status to ERROR and writes a clear error message to the bottom bar.
- Steps should validate **dependencies**:
  - Example: Translation requires Ingestion to be successful.
  - If dependencies haven’t run, show an error and do not proceed.

### 6.2 Run All (Sequential) – **FIX / IMPLEMENTATION REQUIRED**

Implement a **top-level “Run All Steps” button** that:

1. Runs all 7 steps **in order**, using the same logic as individual “Run Step” actions.
2. Is fully **sequential**:
   - Waits for each step to complete (and update state) before moving to the next.
3. If any step fails:
   - Stop the sequence.
   - Mark that step as ERROR.
   - Leave remaining steps as PENDING.
   - Update bottom status bar with the error message and the step name.
4. Use an `isRunningAll` boolean in `wizardState` to:
   - Disable all “Run Step” buttons while Run All is active.
   - Disable the “Run All” button while active.
   - Optionally show a small indicator: “Running all steps…”.

**Important:**  
Our current codebase **does not fully implement this improved Run All behavior yet**.  
In this V2 baseline, please **implement it as described here** so that newly generated / refactored code has correct Run All semantics.

---

## 7. Status Bar Behavior

The bottom bar should always show:

- `Last action:` (e.g., “Ran Normalization” or “Run All stopped at Scoring”)
- `Status:` Pending / Running / Success / Error
- `Message:` short human-readable message (error reason or summary)

When a step succeeds, show a short summary, e.g.:

- “Ingestion: 20 rows parsed.”
- “Normalization: mapped diagnoses and medications for 20 records.”
- “Scoring: computed completeness scores for 8 domains.”
- “Persistence: generated NDJSON with 20 lines (previewing first 3).”

---

## 8. Sample Data

Provide `sample-patient-data.csv` with ~20 synthetic patients. Columns may include:

- `id`
- `name`
- `age`
- `sex`
- `height_cm`
- `weight_kg`
- `diagnosis1`
- `diagnosis2`
- `medication1`
- `medication2`
- `lab1_value`
- `lab2_value`
- `procedure1`
- `procedure2`

Use plausible demo values; do **not** include real PHI.

---

## 9. Non-Functional Requirements

- **Type safety:** TypeScript should compile with no errors; prefer strict typing over `any`.
- **No dead code:** Remove unused components like the old Dashboard/NewRun layout.
- **No runtime warnings:** Fix obvious React warnings (keys, missing deps, etc.).
- **Clean commit structure:** You don’t need to create commits, but structure code logically.

---

## 10. Summary

**Goal:** A clean, V2-level **Healthcare Pipeline Wizard** that:

- Uses CSV ingestion only.
- Implements a 7-step deterministic pipeline.
- Provides a train-track wizard UI with per-step views.
- Implements a transparent, completeness-based DQ scoring step.
- Generates and allows download of NDJSON in the Persistence step.
- Has a robust, sequential **Run All** implementation (this is a key fix).
- Keeps everything in a single-page wizard without React Router.

Please implement or refactor the project to match this spec exactly.