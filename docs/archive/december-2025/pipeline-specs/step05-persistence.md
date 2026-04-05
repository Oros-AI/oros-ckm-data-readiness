# Step 5 – Persistence

## 1. Purpose

Persist the **normalized dataset** (with optional AI patches applied) into:

1. A **mock analytical store** (simulated DuckDB / DB layer for the demo).
2. A **downloadable NDJSON export** for interoperability and inspection.

Persistence is **deterministic** and must:

- Never silently modify data.
- Clearly indicate which dataset version is being written:
  - `v3_normalized` (deterministic-only)
  - `v3_normalized_ai` (after accepted AI patches)
- Surface write errors cleanly.
- Optionally use **Archia** to analyze and explain persistence errors when `AI_ENABLED=true`.

---

## 2. Inputs & Outputs

### 2.1 Input: Normalized Records

Input comes from Step 3 as `normalizedRecords: NormalizedRecord[]`, with each record:

```ts
type NormalizedRecord = {
  id: string;
  name: string;
  demographics: {
    age: number | null;
    sex: "M" | "F" | "Other" | "Unknown" | null;
    height_cm: number | null;
    weight_kg: number | null;
  };
  diagnoses: NormalizedDiagnosis[];
  medications: NormalizedMedication[];
  labs: NormalizedLab[];
  procedures: NormalizedProcedure[];
  normalization_issues: string[];
  version: "v3_normalized" | "v3_normalized_ai";
};
```

The step should respect the **current active dataset** (original vs AI-patched).

### 2.2 Output: Mock Persistence + NDJSON

For the v3 demo, Persistence produces:

1. **In-memory “DB” state**, e.g.:

   ```ts
   type PersistenceState = {
     runId: string;               // e.g. timestamp-based UUID
     recordCount: number;
     datasetVersion: "v3_normalized" | "v3_normalized_ai";
     persistedAt: string;         // ISO timestamp
   };
   ```

2. A **browser-side NDJSON export**, created from `normalizedRecords`:

   ```ts
   const ndjson = normalizedRecords
     .map(r => JSON.stringify(r))
     .join("\n");
   ```

3. UI indicators that:

   - Data has been “persisted”
   - NDJSON is available for download

Later MVP can replace the in-memory/mocked pieces with actual:

- DuckDB
- Postgres
- Data warehouse
- Lakehouse, etc.

---

## 3. Deterministic Persistence Behavior

### 3.1 Preconditions

Persistence can run only if:

- Step 3 (Normalization) has completed successfully or with warnings.
- `normalizedRecords` exists and has at least 1 record.

If not:

- `persistenceStatus = "error"`
- Show a clear error message:
  - “Cannot persist: normalization has not completed.”

### 3.2 Core Actions

When the user clicks **“Run Step”** on Step 5:

1. **Freeze a snapshot** of the current `normalizedRecords`.
2. Compute and store a `PersistenceState` object as described above.
3. Generate NDJSON in the browser (see Section 4.3).
4. Mark:

   - `persistenceStatus = "success"`
   - `persistenceRunId = <new run id>`

### 3.3 Data Is Not Mutated

Persistence:

- Does **not** change any `normalizedRecords`.
- Does **not** add or remove fields.
- Does **not** “clean” data beyond what earlier steps already did.

It is a **write-only** operation from the pipeline’s perspective.

---

## 4. UI Behavior

### 4.1 Layout

Within **Step 5 – Persistence** panel:

- Title: “Step 5 – Persistence”
- Short description:
  - “This step writes the normalized dataset into a mock analytical store and generates an NDJSON export for downstream use.”

### 4.2 Summary Section

Show:

- Number of records persisted: `recordCount`
- Dataset version used:
  - “Dataset version: v3_normalized”
  - or “Dataset version: v3_normalized_ai (AI-patched)”
- Timestamp of last persistence:
  - “Last persisted at: 2025-01-15T10:32:17Z”

If no persistence has run yet:

- Show placeholder:
  - “No dataset has been persisted yet.”

### 4.3 NDJSON Download

Provide:

- A **preview** of the first 3–5 NDJSON lines in a small scrollable code block.
- A **Download NDJSON** button that:
  - Creates a `Blob` from the NDJSON string.
  - Uses `URL.createObjectURL` and `<a download="pipeline-output.ndjson">` to trigger browser download.

Edge cases:

- If `normalizedRecords.length === 0`, disable the button and show:
  - “No records available to export.”

### 4.4 Status & Controls

Controls:

- **Run Step** – triggers persistence; disabled while `persistenceStatus = "running"`.
- **Run All Steps** – if used from earlier steps, Step 5 should:
  - Execute persistence after enrichment (Step 6) if the wizard defines that order.
  - For the v3 wizard, we can assume:
    - Steps are sequential for the single-run demo.

Bottom bar:

- Left text:
  - “Persistence pending”
  - “Last run succeeded – 20 records persisted”
  - “Error: normalization must be completed first”
- Right badge: `Pending`, `Success`, or `Error`.

---

## 5. Agentic Assistance (AI_ENABLED=true)

Agentic persistence is **advisory**, not a writer.

### 5.1 When to Use Archia

Persistence errors might occur if:

- The NDJSON serialization fails.
- The dataset contains unexpected structures (e.g., non-serializable values).
- A future MVP DB write returns errors (schema mismatch, constraint violations, etc.).

When `AI_ENABLED=true` and a persistence error occurs, show CTA:

- “Ask AI to analyze persistence error”

or, in non-error context, a smaller CTA:

- “Ask AI what downstream systems could do with this dataset”

### 5.2 Error-Focused Call Example

```http
POST /archia/agent
Content-Type: application/json
```

Payload example:

```json
{
  "step": "persistence",
  "ai_enabled": true,
  "error": {
    "type": "serialization_error",
    "message": "Cannot convert field 'labs[0].code' to string."
  },
  "sample_record": {
    "id": "P010",
    "normalized": { /* truncated record */ }
  },
  "context": {
    "target": "NDJSON",
    "runId": "2025-01-14T10-12-01Z"
  }
}
```

Expected Archia response:

```json
{
  "root_cause": "Certain nested objects contain fields that are not serializable as JSON.",
  "suggested_fixes": [
    "Ensure all codes and values are primitive strings or numbers.",
    "Avoid retaining full terminology server response objects in the normalized record."
  ],
  "step_by_step_report": "I inspected one of the failing records and noticed that the 'code' field is an object rather than a string..."
}
```

### 5.3 Advisory Call (Non-Error)

Optionally, the user may ask:

- “What could a downstream HIE or Population Health platform do with this dataset?”

The UI could send:

```json
{
  "step": "persistence",
  "ai_enabled": true,
  "dataset_profile": {
    "recordCount": 20,
    "domains": ["demographics", "diagnoses", "medications", "labs"],
    "dq_summary": { /* scores from Step 4 */ }
  }
}
```

Archia returns ideas like:

- Use cases for dashboards
- Possible value-based care workflows
- Suggestions for additional DQ checks

These insights are **purely narrative** and not part of the deterministic pipeline.

---

## 6. Original vs Patched Dataset Context

If earlier steps used AI patches (Normalization, Enrichment), the Persistence step must:

- Clearly identify which dataset is being persisted.
- Provide a label:

  - “Persisting deterministic dataset (no AI patches)”
  - or “Persisting AI-patched dataset (v3_normalized_ai)”

The user should not be surprised which path is being written downstream.

The UI may also offer (for future MVP):

- A small dropdown:
  - “Choose dataset to persist: [Deterministic] / [AI-patched]”

For v3, we can assume: persist **whichever dataset is currently active**.

---

## 7. Logging & Audit Trail

For each Persistence run, log:

- `runId`
- `timestamp`
- `datasetVersion` (deterministic vs AI-patched)
- `recordCount`
- Success/failure
- If Archia was invoked:
  - high-level error description
  - summary of AI suggestions

For the demo, this can be stored in memory but should be structured to support later:

- export to NDJSON
- pushing to a logging stack
- or writing a “run history” table.

---

## 8. Completion Criteria

Step 5 – Persistence is **complete** for v3 when:

1. The user can click **Run Step** and see:
   - Record count
   - Dataset version
   - Timestamp of last run
2. A valid NDJSON export is generated and downloadable.
3. If `AI_ENABLED=true` and a persistence error occurs:
   - The user can invoke AI analysis.
   - The side drawer explains likely root causes and suggests next steps.
4. It’s clear from the UI which dataset (deterministic or AI-patched) was persisted.

Persistence should feel like a stable “checkpoint” in the pipeline, suitable for feeding downstream systems such as:

- population health platforms,
- registries,
- research databases,
- or HIE-level analytics engines.
