# Step 1 – Data Ingestion

## 1. Purpose

Ingest a batch of synthetic patient records from CSV into the pipeline’s in-memory dataset.

Goals:

- Provide a **clear, inspectable preview** of ingested records.
- Validate CSV structure and basic data types **deterministically**.
- Surface row-level errors without using AI.
- When `AI_ENABLED=true`, optionally **invoke Archia** as an *assistant* for diagnosing ingestion failures and suggesting fixes.
- Support two demo scenarios:
  - **CSV A (clean)** → pipeline runs end-to-end without errors.
  - **CSV B (errorful)** → deterministic ingestion fails on some rows, agentic fallback kicks in (if enabled).

---

## 2. Inputs & Outputs

### 2.1 Expected CSV columns

The demo assumes a *flat* CSV with the following header row (order may be fixed for v3):

- `ID`
- `Name`
- `Age`
- `Sex`
- `Height`
- `Weight`
- `Diagnosis1`
- `Diagnosis2`
- `Medication1`
- `Medication2`
- `Lab1`
- `Lab2`
- `Procedure1`
- `Procedure2`

> v3 scope: **CSV only**. No Excel, JSON, or NDJSON ingestion yet.

### 2.2 Demo files

In the repo, we expect two demo CSVs (names can be refined later, but the behavior must exist):

- `sample-patient-data-clean.csv` – 20 valid records, no deterministic errors.
- `sample-patient-data-error.csv` – 20 records with intentional issues (e.g., missing required fields, invalid types, out-of-range values).

These can live under `public/` or a dedicated `demo-data/` folder, as long as the UI can easily reference them.

### 2.3 Ingestion output (internal structure)

Deterministically ingested rows become an in-memory array of **raw records**, something like:

```ts
type RawPatientRecord = {
  id: string;
  name: string;
  age: number | null;
  sex: "M" | "F" | "Other" | null;
  height: number | null;   // cm not enforced yet
  weight: number | null;   // kg not enforced yet
  diagnosis1: string | null;
  diagnosis2: string | null;
  medication1: string | null;
  medication2: string | null;
  lab1: string | null;
  lab2: string | null;
  procedure1: string | null;
  procedure2: string | null;
  // optional metadata
  _rowIndex: number;
};
```

The ingestion step writes:

- `rawData` – array of `RawPatientRecord`
- `ingestionErrors` – array of row-level issues (see below)
- `ingestionStatus` – one of: `"idle" | "running" | "success" | "error"`

Subsequent steps (translation, normalization, etc.) depend on `rawData`.

---

## 3. Deterministic Behavior (no AI)

### 3.1 Trigger

The user can:

- Click **“Run Step”** on Step 1 to ingest the currently selected CSV.
- Click **“Run All Steps”** on Step 1 to ingest and then chain downstream steps (2–7) sequentially (logic for Run All will be orchestrated in `App` / wizard state, but Step 1 must be idempotent and re-runnable).

### 3.2 Validation rules (v3 scope)

1. **Header validation**
   - Required columns: all columns listed in section 2.1.
   - If **any required column is missing**, ingestion is marked as **failed**:
     - `ingestionStatus = "error"`
     - `ingestionErrors` contains a single “schema” error.
     - No downstream steps should run (even in Run All).

2. **Row-level parsing**
   - For each row:
     - `ID` and `Name` must be non-empty strings.
     - `Age` must be an integer between `0` and `110`. Otherwise ⇒ row error.
     - `Sex` must be in `{ "M", "F", "Other" }` (case-sensitive for now). Otherwise ⇒ row error.
     - `Height` and `Weight` must be numeric if present; blanks are allowed and treated as `null`.
     - All other fields (`Diagnosis*`, `Medication*`, `Lab*`, `Procedure*`) are **free-text** at this stage (no coding validation yet).

3. **Error classification**

For each row, we track errors as:

```ts
type IngestionError = {
  rowIndex: number;          // 1-based data row (excluding header)
  id?: string;               // parsed ID if available
  field: string;             // e.g. "Age", "Sex"
  type: "missing" | "invalid" | "out_of_range" | "schema";
  message: string;           // human-readable
  rawValue: string | null;
};
```

4. **Success vs partial success**
   - If **no errors** ⇒ `ingestionStatus = "success"` and all 20 records are available.
   - If **some rows have errors**:
     - v3 deterministic behavior: **still ingest all rows**, but mark the step status as `"error"` and show error counts.
     - Downstream steps **may choose to proceed** only on rows without errors, but the default demo path is:
       - If using **clean CSV**, ingestion is “green” and Run All flows smoothly.
       - If using **errorful CSV**, scoring/analytics can still work but with warnings.

> We may later introduce a stricter “fail-fast” mode, but v3 keeps it soft-fail for demo flexibility.

---

## 4. UI Behavior

### 4.1 Layout (top, middle, bottom)

Consistent with the v2/v3 wizard layout:

1. **Top bar (15% height)**  
   - Wizard navigation: steps 1–7 with progress indicator and “train track” style.
   - Step 1 circle is **highlighted** in green/blue when active.
   - For Step 1, status subtleties:
     - Grey: Not run.
     - Green: Success, no errors.
     - Yellow/Orange: Completed with warnings / row errors.
     - Red: Hard failure (e.g., missing columns).

2. **Middle pane (content)**  

For Step 1:

- **Header**: “Step 1: Data Ingestion”
- **Description**: one short paragraph describing expected columns and purpose.
- **File selection area**:
  - `Choose File` input (supports CSV from user machine).
  - Optional quick buttons:
    - “Load Clean Demo CSV”
    - “Load Errorful Demo CSV”
- **Ingested Data Preview**:
  - A table showing the first **10–20 rows** (or just 20 since demo size is small).
  - Columns: ID, Name, Age, Sex, Height, Weight, Diagnosis1, Diagnosis2, Medication1, Medication2, Lab1, Lab2, Procedure1, Procedure2.
  - A small label like: “20 records loaded” or “20 records loaded, 3 with issues”.
- **Error summary panel**:
  - Total rows, total errors.
  - Breakdown by type (invalid age, invalid sex, missing required fields, schema issues).
  - Clicking “View details” (v3 stretch) could open a side drawer or modal listing error rows.

3. **Bottom bar (5% height)**  

- Left: textual status, e.g.:
  - “Ingestion pending”
  - “Ingestion completed successfully”
  - “Ingestion completed with 3 row errors”
  - “Ingestion failed: missing column ‘Diagnosis1’”.
- Right: simple badge: `Pending` (grey), `Success` (green), `Warnings` (yellow), `Error` (red).

### 4.2 Controls

- **Run Step** button:
  - Runs ingestion on the currently selected CSV.
  - Disables while status is `"running"`.
- **Run All Steps** button:
  - Orchestrated by the wizard, but Step 1 must:
    - Set status to `"running"`.
    - On success, emit an event / state change so that Step 2 can start (when Run All is active).
    - On hard failure, signal the wizard to stop the chain.
- **CSV selector** (v3 UX stretch):
  - Radio buttons or dropdown to choose:
    - “Upload custom CSV”
    - “Use clean demo CSV”
    - “Use errorful demo CSV”

---

## 5. Agentic Behavior (Archia) – Optional

Agentic ingestion support is **only active when** `AI_ENABLED=true`. Otherwise, everything in this section is disabled/hidden.

### 5.1 When to call Archia

After deterministic ingestion completes:

- If `ingestionStatus === "success"` and `ingestionErrors.length === 0`:
  - **No AI call**; nothing to diagnose.
- If there are **schema errors** (missing columns) or **multiple row errors**:
  - When the user clicks **“Ask AI to analyze errors”** (or similar CTA), the frontend triggers an Archia request via the backend.

### 5.2 Request to backend

Frontend calls a backend endpoint (placeholder):

```http
POST /archia/ingestion-diagnose
Content-Type: application/json
```

Payload (example shape):

```json
{
  "step": "ingestion",
  "ai_enabled": true,
  "csv_name": "sample-patient-data-error.csv",
  "errors": [
    {
      "rowIndex": 3,
      "field": "Age",
      "type": "out_of_range",
      "rawValue": "999"
    },
    {
      "rowIndex": 5,
      "field": "Sex",
      "type": "invalid",
      "rawValue": "X"
    }
  ],
  "sample_rows": [
    {
      "rowIndex": 3,
      "raw": {
        "ID": "P003",
        "Name": "Michael Johnson",
        "Age": "999",
        "Sex": "M",
        "...": "..."
      }
    },
    {
      "rowIndex": 5,
      "raw": {
        "ID": "P005",
        "Name": "Robert Brown",
        "Age": "67",
        "Sex": "X",
        "...": "..."
      }
    }
  ],
  "config": {
    "max_rows": 5
  }
}
```

The backend forwards this to Archia (exact integration is out of scope for v3; we can mock the response).

### 5.3 Expected Archia-style response

```json
{
  "root_cause": "Several rows have ages outside the expected range (0–110) and invalid sex codes.",
  "suggested_fixes": [
    "Clamp ages >110 to 110 or mark as missing, depending on your policy.",
    "Restrict Sex to {M, F, Other}. Map 'X' to 'Other' or mark as missing."
  ],
  "patched_rows": [
    {
      "rowIndex": 3,
      "patched": {
        "Age": "110"
      }
    },
    {
      "rowIndex": 5,
      "patched": {
        "Sex": "Other"
      }
    }
  ],
  "step_by_step_report": "I reviewed 5 error rows. Ages of 999 and 200 are implausible ... (longer narrative)"
}
```

### 5.4 UI for agentic response

Use the **right-hand side drawer** pattern (shared across steps):

- When the Archia response arrives, open a **side drawer** anchored to the right:
  - Title: “Ingestion – AI Analysis”
  - Sections:
    - **Root cause** – short paragraph.
    - **Suggested fixes** – bullet list.
    - **Patched rows** – table or list showing:
      - Row index
      - Original vs patched values for affected fields.
    - **Narrative** – scrollable text area with the `step_by_step_report`.

- Provide two main actions in the drawer:
  - **Apply patches & Re-run** (deterministic):
    - Applies `patched_rows` to an **ephemeral copy** of the dataset.
    - Marks that a “patched” run is active.
    - Re-runs deterministic ingestion logic on the patched rows / dataset.
  - **Keep original**:
    - Closes the drawer; keeps deterministic run as-is.

### 5.5 Original vs patched toggle

When patches are applied:

- The main preview table gains a **toggle** or badge:
  - `View: Original | Patched`
- The status bar reflects that the current view is patched, e.g.:
  - “Ingestion (patched run) – 20 rows, 0 errors after fixes suggested by AI.”
- All downstream steps should consume the **currently active** dataset (original vs patched), but we always keep:
  - `rawDataOriginal`
  - `rawDataPatched` (if user applies AI fixes)
  - A simple per-session **patch log** entry noting:
    - Time
    - Rows and fields changed
    - Whether user accepted or rejected patches.

> For v3 demo, the patch log can be an in-memory structure; persistence to disk/db is out of scope.

---

## 6. Logging & Telemetry (lightweight for v3)

The ingestion step should log (in a simple JS object or console for now):

- Number of rows ingested.
- Number of rows with errors (by type).
- Whether AI was enabled.
- Whether AI was called.
- Whether patches were applied.

This is primarily to help debug and to inform future telemetry design.

---

## 7. Completion Criteria for Step 1

Step 1 is considered **complete** when:

- Deterministic ingestion has run at least once on a selected CSV.
- The **Ingested Data Preview** shows all rows (20 for the demo).
- Error summary is visible (even if zero).
- When using the errorful CSV:
  - Row-level errors are visible.
  - If `AI_ENABLED=true`:
    - The “Ask AI to analyze errors” CTA is available.
    - The side drawer shows a mock Archia response when triggered.
    - The user can apply or ignore patches.
- Global wizard state knows:
  - `rawData` (original or patched, whichever is active),
  - `ingestionStatus`,
  - `ingestionErrors`.

This spec should be enough for:

- Droid to scaffold backend + state wiring,
- Cursor to implement React components and state transitions,
- Archia team to understand where and how their ingestion agent will be invoked.
