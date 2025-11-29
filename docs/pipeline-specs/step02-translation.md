# Step 2 – Translation

## 1. Purpose

Translate raw ingested CSV rows (Step 1 output) into a **canonical JSON structure** suitable for normalization, scoring, enrichment, persistence, and analytics.  
This step performs **strict deterministic translation**, surfaces translation errors, and (optionally) triggers Archia agentic analysis when `AI_ENABLED=true`.

The translation output **is not FHIR**; it is a simplified internal JSON model for the v3 demo.

---

## 2. Inputs & Outputs

### 2.1 Input: Raw Data

Input comes directly from Step 1 (`rawData` array):

```ts
type RawPatientRecord = {
  id: string;
  name: string;
  age: number | null;
  sex: "M" | "F" | "Other" | null;
  height: number | null;
  weight: number | null;
  diagnosis1: string | null;
  diagnosis2: string | null;
  medication1: string | null;
  medication2: string | null;
  lab1: string | null;
  lab2: string | null;
  procedure1: string | null;
  procedure2: string | null;
  _rowIndex: number;
};
```

### 2.2 Output: Canonical JSON Records

The Translator produces `translatedRecords` with the following structure:

```ts
type TranslatedRecord = {
  id: string;
  name: string;

  demographics: {
    age: number | null;
    sex: "M" | "F" | "Other" | "Unknown" | null;
    height_cm: number | null;
    weight_kg: number | null;
  };

  diagnoses: string[];
  medications: string[];
  labs: string[];
  procedures: string[];

  raw: Record<string, any>;   // All original raw fields

  translation_issues: string[];
};
```

### 2.3 Status Flags

The step sets:

- `translationStatus: "idle" | "running" | "success" | "warning" | "error"`
- `translationErrors: TranslationError[]`

Where:

```ts
type TranslationError = {
  rowIndex: number;
  field: string;
  type: "missing" | "invalid" | "schema" | "unparseable";
  message: string;
  rawValue: any;
};
```

---

## 3. Deterministic Translation Logic (Always On)

### 3.1 Field Conversion Rules

- **Age**
  - Must be numeric or null.
  - If non-numeric → `translation_issues.push("INVALID_AGE")`

- **Sex**
  - Normalize to `"M" | "F" | "Other"`.
  - Unrecognized values mapped to `"Unknown"` and flagged.

- **Height/Weight**
  - Must be numeric or null.
  - Left as-is; units converted in Step 3.

- **Multi-field arrays**
  - `diagnoses = [diagnosis1, diagnosis2].filter(Boolean)`
  - Same structure for medications, labs, procedures.

### 3.2 Error Handling

If any record has issues:

- Record-level `translation_issues[]` is populated.
- The step status becomes `"warning"` instead of `"success"`.

If the translation fails catastrophically (e.g., corrupted input):

- `translationStatus = "error"`
- Downstream steps cannot run.

### 3.3 Deterministic Completion

The step is considered **complete** when:

- `translatedRecords` exists,
- All rows were processed deterministically,
- Errors are surfaced (but do not block the step unless catastrophic).

---

## 4. UI Behavior

### 4.1 Layout

The Translation screen includes:

- Section header: **Step 2 — Translation**
- Short description
- Two modes of preview:
  1. **Canonical JSON preview (default)**  
  2. **FHIR-like preview (optional toggle)**

### 4.2 Canonical JSON Preview

- Show first 5–10 translated records in a scrollable JSON viewer.
- Key highlights:
  - `demographics.age`
  - `sex`
  - `height_cm`, `weight_kg`
  - `diagnoses[0]` preview
- A “Show Issues Only” filter toggles display of rows with `translation_issues`.

### 4.3 Optional FHIR-style Preview (UI only)

Toggling “FHIR Preview” displays a **non-pipeline** representation:

```json
{
  "resourceType": "Patient",
  "id": "P001",
  "gender": "male",
  "extension": [
    { "url": "height", "valueQuantity": { "value": 175, "unit": "cm" } },
    { "url": "weight", "valueQuantity": { "value": 85,  "unit": "kg" } }
  ]
}
```

### 4.4 Bottom Bar Status Indicators

- **Success (green)** — No issues.
- **Warning (yellow)** — Issues detected.
- **Error (red)** — Cannot continue.

---

## 5. Agentic Assistance (Optional; AI_ENABLED=true)

### 5.1 Trigger Conditions

After deterministic translation:

- If `translation_issues.length === 0` → **No AI call**
- If issues exist → offer a CTA:
  - **"Ask AI to Analyze Translation Issues"**

### 5.2 Backend Call (via `archiaClient.ts`)

```http
POST /archia/translate
Content-Type: application/json
```

Payload includes:

```json
{
  "step": "translation",
  "ai_enabled": true,
  "errors": [ ... ],
  "sample_rows": [ ... ],
  "context": { "cohort": "diabetes" }
}
```

### 5.3 Expected Response (Mock for Demo)

```json
{
  "root_cause": "Age field contains non-numeric strings in several records.",
  "suggested_fixes": [
    "Map English number words to integers.",
    "Mark unknown ages as null."
  ],
  "patched_rows": [
    {
      "rowIndex": 8,
      "patched": { "Age": 50 }
    }
  ],
  "step_by_step_report": "Reviewed all records with non-numeric ages ..."
}
```

---

## 6. Agentic UI Behavior (Side Drawer)

When AI results return:

- Open a **side drawer** with:
  - Root cause
  - Suggested fixes
  - Table of patched rows (diff format)
  - Long-form narrative (expandable)
- Buttons:
  - **Apply Patches & Re-run Translation**
  - **Dismiss**

### 6.1 Applying Patches

- Updating only the specific fields in patched rows.
- Re-run deterministic translation on updated rows.
- Mark dataset version as `v2_translated_ai`.
- Store patch log entry:
  - Row index
  - Fields changed
  - User acceptance decision

### 6.2 Original vs Patched Toggle

The translation preview gets:

```
View: Original | Patched
```

---

## 7. Logging & Telemetry

Track:

- Number of rows translated
- Number of translation issues
- Whether Archia was invoked
- Patch acceptance decisions

Logging may be console-based or in-memory for v3 demo.

---

## 8. Completion Criteria

Translation step is complete when:

- Deterministic translation has been run at least once.
- `translatedRecords` exists (patched or original).
- Any accepted patches have been re-translated deterministically.
- Step state is not `"error"`.

Downstream steps (Normalization, Scoring, etc.) rely on the latest `translatedRecords`.

