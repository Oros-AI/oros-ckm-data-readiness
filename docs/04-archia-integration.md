# Archia Integration – V3 Agentic Behavior

This document specifies how the Oros Health Data Pipeline Wizard talks to Archia’s agentic backend (or any equivalent agent runtime).

The goal is to keep:

- **Deterministic pipeline as system of record**
- **Agentic behavior as optional, explainable, auditable help**
- **AI behavior controlled via a single flag: `AI_ENABLED`**

---

## 1. Feature Flag – `AI_ENABLED`

### 1.1 Purpose

- When `AI_ENABLED=false`:
  - No calls to Archia are made.
  - The pipeline runs **deterministically only**.
  - The **Ask Anything** analytics tab is disabled or shows a “AI disabled” explanation.
  - Any “Fix with AI” buttons are hidden or disabled.

- When `AI_ENABLED=true`:
  - On eligible errors, the backend may call Archia for:
    - Error analysis
    - Suggested fixes
    - Optional patched rows
    - Narrative explanation.
  - The **Ask Anything** analytics tab is enabled.

### 1.2 Implementation (backend)

- Environment variable: `AI_ENABLED=true|false`
- Backend helper:

  ```ts
  const AI_ENABLED = process.env.AI_ENABLED === "true";
  ```

- All Archia-related code paths must check `AI_ENABLED` before making outbound calls.

---

## 2. Endpoint 1 – `POST /archia/agent`

Used when a **pipeline step encounters errors** (primarily Ingestion, Translation, Normalization; optionally Scoring or Enrichment later).

### 2.1 High-level Behavior

- Triggered when:
  - `AI_ENABLED=true` **and**
  - A step returns a failure or warning that is marked as AI-eligible.

- Backend constructs a payload summarizing:
  - Which step failed.
  - What went wrong.
  - Sample problematic rows/fields.
  - Relevant configuration/context.

- Archia returns:
  - Root cause (short explanation).
  - Suggested fixes (human-readable).
  - Optional patched rows (machine-usable).
  - A step-by-step narrative report.

### 2.2 Request Shape (to Archia)

Backend endpoint: `POST /archia/agent` (internal to our app).

Payload sent to Archia (conceptual shape):

```json
{
  "step": "Ingestion | Translation | Normalization | Scoring",
  "ai_enabled": true,
  "error_type": "SCHEMA_MISMATCH",
  "error_details": {
    "message": "Column 'dob' is missing",
    "missing_columns": ["dob"],
    "row_count": 250
  },
  "sample_records": [
    {
      "rowIndex": 12,
      "raw": {
        "patient_id": "P0012",
        "first_name": "Sallie",
        "last_name": "Johnson",
        "...": "..."
      }
    }
  ],
  "context": {
    "dataset_version": "v3_normalized",
    "value_sets_used": ["diagnosis", "lab_loinc", "medications_rxnorm"],
    "config": {
      "required_columns": ["patient_id", "dob", "sex"],
      "normalization_profile": "diabetes-demo-v1"
    },
    "run_id": "2025-01-12T10:22:11Z"
  }
}
```

Notes:

- `sample_records` should be truncated to a **small subset** for performance and privacy.
- `context` can evolve as we learn what Archia finds most useful.

### 2.3 Response Shape (from Archia)

Expected response (conceptual):

```json
{
  "root_cause": "The 'dob' column is missing, which prevents age-based rules from running.",
  "suggested_fixes": [
    "Add a 'dob' column to the CSV and re-export from the source system.",
    "If DOB is unavailable, configure a profile that does not require age-based enrichment."
  ],
  "patched_rows": [
    {
      "rowIndex": 12,
      "patched": {
        "patient_id": "P0012",
        "dob": "2012-05-01",
        "dob_source": "imputed_from_age_13",
        "...": "..."
      },
      "patch_metadata": {
        "confidence": 0.72,
        "rules_or_models": ["age_imputation_v1"]
      }
    }
  ],
  "insights": [
    {
      "type": "warning",
      "message": "Imputed DOBs should be clearly flagged and validated before production use."
    }
  ],
  "step_by_step_report": "1) Analyzed schema and detected that 'dob' is missing. 2) Checked for age fields that could be converted. 3) Proposed DOB imputation for 27% of rows based on 'age' column. 4) Generated patched rows for review."
}
```

Notes:

- `patched_rows` is **optional**. Archia may return only analysis + suggestions.
- In the demo, we may simulate this response server-side (no real call to Archia yet).

### 2.4 Frontend Behavior (Agent Drawer)

When a response is available:

- Open the **right-hand side drawer** for the relevant step.
- Show:
  - Root cause (short text).
  - Bullet list of suggested fixes.
  - Optional:
    - Table comparing **original vs patched** rows for a small sample.
  - Step-by-step narrative (collapsible panel).

User affordances:

- Toggle between “Original” and “Patched” view (if patched rows exist).
- “Apply AI Patch” button (if we support patching in this step).
- “Dismiss” button to ignore AI suggestions and continue deterministically.

Backend behavior on “Apply AI Patch”:

- Replace in-memory dataset for downstream steps with patched version.
- Update dataset version:
  - e.g., from `v3_normalized` → `v3_normalized_ai`.
- Re-run deterministic step (and downstream steps if “Run all” is chosen).

---

## 3. Endpoint 2 – `POST /archia/query`

Used for the **Ask Anything** tab in the Analytics step.

### 3.1 High-level Behavior

- The user asks a natural-language question about the dataset.
- Frontend calls our backend `/archia/query` endpoint.
- Backend:
  - Validates `AI_ENABLED`.
  - Constructs a query payload including:
    - The user’s question.
    - Optional filters or context (e.g., cohort, date ranges).
  - Calls Archia (or a placeholder).
- Archia returns:
  - A natural-language answer.
  - Optional structured results (aggregates, time series, etc.).

### 3.2 Request Shape (to Archia)

Backend endpoint: `POST /archia/query` (internal).

Payload to Archia (conceptual):

```json
{
  "question": "How many patients have type 1 diabetes and at least one A1C > 9.0 in the last 12 months?",
  "dataset_version": "v3_enriched_ai",
  "filters": {
    "cohort": "t1d_demo_cohort",
    "age_range": [2, 18]
  },
  "context": {
    "available_metrics": [
      "patient_count",
      "a1c_distribution",
      "time_in_range_summary"
    ],
    "run_id": "2025-01-12T10:22:11Z"
  }
}
```

### 3.3 Response Shape (from Archia)

Example response:

```json
{
  "answer": "Out of 20 patients in the demo dataset, 7 have type 1 diabetes and at least one A1C > 9.0 in the last 12 months.",
  "supporting_analysis": "Computed A1C lab results from normalized LOINC codes (4548-4, 17856-6) and filtered by the last 12 months.",
  "suggested_visualizations": [
    {
      "type": "bar",
      "metric": "a1c_distribution",
      "buckets": ["<7.0", "7.0-9.0", ">9.0"]
    }
  ],
  "follow_up_questions": [
    "How many patients improved their A1C from >9.0 to <8.0 over time?",
    "What is the average time in range for these 7 patients?"
  ],
  "raw_result": {
    "total_patients": 20,
    "t1d_high_a1c_patients": 7
  }
}
```

### 3.4 Frontend Behavior (Ask Anything Tab)

- Chat-like UI:
  - User enters question.
  - Shows a loading state.
  - Displays:
    - Answer.
    - Supporting analysis.
    - Optional visualization suggestion (we may implement later).
    - Follow-up suggestions as clickable chips.

- When `AI_ENABLED=false`:
  - Disable the Ask Anything tab, or show a message:
    > “AI-powered analytics are disabled in this environment. Deterministic reports remain available.”

---

## 4. Error Handling & Timeouts

### 4.1 When Archia is unreachable

If the call to Archia fails (timeout, 5xx, network):

- Backend should:
  - Log the error (for the demo, console + simple log).
  - Return a **graceful fallback** to the frontend:

    - For `/archia/agent`:
      ```json
      {
        "error": "archia_unavailable",
        "message": "Agentic analysis is temporarily unavailable. You can continue with deterministic behavior."
      }
      ```

    - For `/archia/query`:
      ```json
      {
        "error": "archia_unavailable",
        "message": "AI analytics are temporarily unavailable. Please try again later."
      }
      ```

- Frontend should:
  - Show a non-blocking error banner or inline message.
  - Allow user to continue using deterministic functionality.

### 4.2 When AI is disabled

If `AI_ENABLED=false` and frontend still calls backend by mistake:

- Backend should:
  - Return `400` or `501` with a clear JSON message:
    ```json
    {
      "error": "ai_disabled",
      "message": "AI/agentic features are disabled in this environment."
    }
    ```

- This protects us from accidental AI usage in restricted environments.

---

## 5. Logging & Audit (Demo vs Production)

For the **demo**:

- It is acceptable to log:
  - Step name.
  - Error type.
  - Count of affected rows.
  - High-level Archia response (root_cause, suggested_fixes.length).

For **future production**:

- Avoid logging PHI.
- Consider:
  - Structured logs (JSON) with `run_id` and `dataset_version`.
  - Explicit flags for AI usage events: `ai_used: true/false`.

---

## 6. Open Questions / Future Refinements

- How much of the dataset (or which summaries) does Archia need for robust analysis?
- Will Archia return structured “patch plans” we can apply more granularly?
- Do we need per-step schemas for `errors` instead of a generic `error_details` blob?
- How do we version the Archia integration contract as it evolves?

For now, this document is the **source of truth** for V3 demo integration.
