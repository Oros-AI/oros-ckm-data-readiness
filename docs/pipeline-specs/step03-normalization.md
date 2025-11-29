# Step 3 – Normalization

## 1. Purpose

Normalize the translated records from Step 2 into a **standardized structure** with:

- Consistent code systems (ICD-10, RxNorm, LOINC, optional SNOMED CT for procedures).
- Clear separation of domains (demographics, diagnoses, medications, labs, procedures).
- Explicit flags for unmapped or ambiguous values.
- A clean data contract for Scoring, Persistence, Enrichment, and Analytics.

Normalization is **deterministic first**, with optional **agentic assistance** (Archia) when `AI_ENABLED=true`.

---

## 2. Inputs & Outputs

### 2.1 Input: Translated Records

Input comes from Step 2 as `translatedRecords: TranslatedRecord[]`, with a shape like:

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
  diagnoses: string[];   // free-text
  medications: string[]; // free-text
  labs: string[];        // free-text test names
  procedures: string[];  // free-text
  raw: Record<string, any>;
  translation_issues: string[];
};
```

### 2.2 Output: Normalized Records

The Normalizer produces `normalizedRecords: NormalizedRecord[]`, e.g.:

```ts
type NormalizedCodeStatus = "mapped" | "unmapped" | "unknown" | "mapped_via_ai";

type NormalizedDiagnosis = {
  source: string;            // original free-text
  code: string | null;       // e.g. "E11.9"
  system: "ICD-10" | null;
  status: NormalizedCodeStatus;
};

type NormalizedMedication = {
  source: string;
  code: string | null;       // e.g. RxNorm mock
  system: "RxNorm" | null;
  status: NormalizedCodeStatus;
};

type NormalizedLab = {
  source: string;
  code: string | null;       // e.g. "4548-4"
  system: "LOINC" | null;
  status: NormalizedCodeStatus;
};

type NormalizedProcedure = {
  source: string;
  code: string | null;       // optional SNOMED
  system: "SNOMED-CT" | null;
  status: NormalizedCodeStatus;
};

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

  normalization_issues: string[];   // e.g. ["UNMAPPED_DIAGNOSIS: 'Hyperglycemia NOS'"]

  version: "v3_normalized" | "v3_normalized_ai";
};
```

### 2.3 Status Flags

The step tracks:

- `normalizationStatus: "idle" | "running" | "success" | "warning" | "error"`
- Optional `normalizationSummary` for quick UI display:
  - counts of mapped/unmapped per domain

---

## 3. Deterministic Normalization Logic

### 3.1 Demographics

- **Age**
  - Use `translated.demographics.age` as-is.
  - If age is not numeric or outside reasonable range (0–120):
    - Set to `null`.
    - Add `normalization_issues.push("INVALID_AGE")`.

- **Sex**
  - Pass through from translation (`"M" | "F" | "Other" | "Unknown" | null`).
  - If value is still invalid, map to `"Unknown"` and add `normalization_issues.push("UNKNOWN_SEX")`.

- **Height/Weight**
  - Use `translated.demographics.height_cm` and `weight_kg` as-is.
  - Optionally add plausibility checks (e.g., height < 80 cm or > 230 cm):
    - Flag suspicious values with `normalization_issues.push("IMPLAUSIBLE_HEIGHT")`, but do **not** change them deterministically in v3.

> v3 scope: No extra unit conversion here; translation already coerces to cm/kg.

### 3.2 Deterministic Terminology Mapping

Use **small, hard-coded demo dictionaries** for now (no external terminology server).

Example (pseudo-TS):

```ts
const ICD10_MAP: Record<string, string> = {
  "diabetes": "E11.9",
  "type 2 diabetes": "E11.9",
  "type 1 diabetes": "E10.9",
  "hypertension": "I10"
  // etc…
};

const RXNORM_MAP: Record<string, string> = {
  "metformin": "860975",
  "lisinopril": "29046"
};

const LOINC_MAP: Record<string, string> = {
  "hba1c": "4548-4",
  "fasting glucose": "1558-6",
  "total cholesterol": "2093-3"
};

const SNOMED_MAP: Record<string, string> = {
  "blood draw": "123038009"
};
```

#### 3.2.1 Diagnoses

For each `diagnosisSource` in `translated.diagnoses`:

1. Normalize the string:
   - `s = diagnosisSource.trim().toLowerCase()`
2. If `ICD10_MAP[s]` exists:
   - `code = ICD10_MAP[s]`
   - `system = "ICD-10"`
   - `status = "mapped"`
3. Else:
   - `code = null`, `system = null`, `status = "unmapped"`
   - Push issue: `UNMAPPED_DIAGNOSIS: '<original>'`

#### 3.2.2 Medications

Same pattern with `RXNORM_MAP`:

- Mapped → `status = "mapped"`
- Unmapped → `status = "unmapped"` + issue `UNMAPPED_MEDICATION: '...'`.

#### 3.2.3 Labs

Use `LOINC_MAP`:

- Mapped → `status = "mapped"`
- Unmapped → `status = "unmapped"` + `UNMAPPED_LAB: '...'`.

#### 3.2.4 Procedures

Use `SNOMED_MAP` if desired; otherwise, keep simple:

- If known in `SNOMED_MAP` → `status = "mapped"`
- Else → `status = "unmapped"` + `UNMAPPED_PROCEDURE: '...'`.

### 3.3 Normalization Issues

Each record collects issues into `normalization_issues[]`. Examples:

- `UNMAPPED_DIAGNOSIS: 'Hyperglycemia NOS'`
- `UNMAPPED_MEDICATION: 'Herbal supplement'`
- `UNMAPPED_LAB: 'Sugar test'`
- `INVALID_AGE: 'abc'`
- `IMPLAUSIBLE_WEIGHT: 300` (if we add range checks)

### 3.4 Deterministic Completion

The step is **deterministically complete** when:

- All `translatedRecords` have been processed into `normalizedRecords`.
- Each record has `version = "v3_normalized"`.
- `normalizationStatus` is:
  - `"success"` if `normalization_issues` is empty across all records.
  - `"warning"` if there are issues but the step still produced valid `normalizedRecords`.
  - `"error"` only in catastrophic failures (e.g., null input array).

Downstream steps **always** consume `normalizedRecords`.

---

## 4. UI Behavior

### 4.1 Summary View

The Normalization panel should show:

- **Title**: “Step 3 – Normalization”
- **Summary counters** (per domain):
  - Diagnoses: N mapped / M unmapped
  - Medications: N mapped / M unmapped
  - Labs: N mapped / M unmapped
  - Procedures: optional

These can be displayed as simple stat cards or a small grid.

### 4.2 Record Preview Table

Provide a lightweight tabular preview:

Columns (suggested):

- ID
- Age
- Sex
- Main diagnosis (first mapped diagnosis code or source text)
- Main medication (first mapped RxNorm or source text)
- Indicators:
  - `Dx unmapped?`
  - `Meds unmapped?`
  - `Labs unmapped?`

Allow filtering:

- “Show records with normalization issues only”

### 4.3 Raw vs Normalized Toggle

Offer a small toggle, e.g.:

```
View: Raw (translated) | Normalized
```

- **Raw**: show key fields from `translatedRecords`.
- **Normalized**: show `normalizedRecords` columns and statuses.

This reinforces transparency and helps users understand what changed.

### 4.4 Status & Warnings

Bottom bar for Step 3:

- Left text:
  - Examples:
    - “Normalization complete – all values mapped”
    - “Normalization complete with 12 unmapped terms”
- Right badge:
  - Green: Success (no issues)
  - Yellow: Completed with issues
  - Red: Error (hard failure)

---

## 5. Agentic Assistance (AI_ENABLED=true)

Agentic normalization support is **optional** and only active when `AI_ENABLED=true`.

### 5.1 Trigger Conditions

After deterministic normalization:

- If no `normalization_issues` exist:
  - No AI call; step remains purely deterministic.
- If there are unmapped or invalid fields:
  - Offer CTA: **“Ask AI to suggest mappings”**

This CTA should appear near the issues summary.

### 5.2 Backend Call

Frontend calls:

```http
POST /archia/agent
Content-Type: application/json
```

With payload like:

```json
{
  "step": "normalization",
  "ai_enabled": true,
  "unmapped_values": {
    "diagnoses": ["Hyperglycemia NOS", "Glucose issue"],
    "medications": ["Unknown pill"],
    "labs": ["Sugar test"]
  },
  "sample_records": [
    {
      "id": "P010",
      "diagnoses": ["Hyperglycemia NOS"],
      "medications": ["Unknown pill"],
      "labs": ["Sugar test"],
      "normalization_issues": [
        "UNMAPPED_DIAGNOSIS: 'Hyperglycemia NOS'",
        "UNMAPPED_MEDICATION: 'Unknown pill'",
        "UNMAPPED_LAB: 'Sugar test'"
      ]
    }
  ],
  "context": {
    "cohort": "diabetes",
    "schema": "normalized_v1"
  }
}
```

### 5.3 Expected Response (Mock for Demo)

```json
{
  "root_cause": "Some diagnoses, medications, and labs are recorded in non-standard free text.",
  "suggested_fixes": [
    "Map 'Hyperglycemia NOS' to ICD-10 R73.9.",
    "Flag 'Unknown pill' as unknown, not guessed.",
    "Treat 'Sugar test' as non-specific and leave unmapped."
  ],
  "patched_records": [
    {
      "id": "P010",
      "diagnoses": [
        {
          "source": "Hyperglycemia NOS",
          "code": "R73.9",
          "system": "ICD-10",
          "status": "mapped_via_ai"
        }
      ],
      "medications": [
        {
          "source": "Unknown pill",
          "code": null,
          "system": null,
          "status": "unknown"
        }
      ],
      "labs": [
        {
          "source": "Sugar test",
          "code": null,
          "system": null,
          "status": "unmapped"
        }
      ]
    }
  ],
  "step_by_step_report": "Reviewed all unmapped diagnoses and found that 'Hyperglycemia NOS' best maps to R73.9...",
  "limitations": [
    "Mappings should be reviewed by a clinician.",
    "Medication mapping is conservative; unknown entries are not auto-coded."
  ]
}
```

---

## 6. Agentic UI Behavior (Side Drawer)

When AI results arrive:

- Open a **right-hand side drawer**, titled:
  - “Normalization – AI Suggestions”
- Sections:
  - **Root cause** – one paragraph.
  - **Suggested fixes** – bullet list.
  - **Patched records** – show:
    - ID
    - Original vs proposed codes
    - Status change (`unmapped` → `mapped_via_ai`).
  - **Step-by-step report** – scrollable text.
  - **Limitations** – explicit cautions (to reinforce trust & safety).

### 6.1 Actions

- **Apply Selected Patches**
  - Allow the user to select which record-level suggestions to accept.
  - For accepted patches:
    - Merge updated diagnosis/medication/lab/procedure entries into `normalizedRecords`.
    - Set `status = "mapped_via_ai"` on those entries.
    - Update `normalization_issues` accordingly (remove issues that are resolved).
    - Set `version = "v3_normalized_ai"` on patched records.
- **Reject All**
  - Close the drawer, preserve purely deterministic `normalizedRecords`.

### 6.2 Original vs Patched

If patches are applied:

- Use an indicator near the summary:
  - “Showing AI-patched normalized data”
- For debugging, a toggle (global or per record) can show original normalized vs AI-patched normalized values.

---

## 7. Logging & Audit Trail

For each accepted patch, log:

- `timestamp`
- `step: "normalization"`
- `id` and optionally `rowIndex` (if we carry it)
- `changes[]` with:
  - `fieldPath` (e.g., `diagnoses[0].code`)
  - `from`
  - `to`
- `source: "archia"`
- Optional `patch_reason` from AI response

This aligns with a shared `fixLog` across all steps.

For v3 demo, this log can live in memory; later it may be persisted for audit & replay.

---

## 8. Completion Criteria

The Normalization step is considered **complete** when:

1. Deterministic normalization has run at least once on `translatedRecords`.
2. `normalizedRecords` is populated for all records.
3. `version` is set:
   - `"v3_normalized"` for deterministic-only runs.
   - `"v3_normalized_ai"` for records patched by AI.
4. UI clearly shows:
   - Count of mapped vs unmapped per domain.
   - Any remaining `normalization_issues`.
5. If `AI_ENABLED=true` and AI is used:
   - Side drawer interaction is available.
   - The user can accept or reject patches explicitly.

Downstream steps (Scoring, Persistence, Enrichment, Analytics) always consume the **latest** `normalizedRecords` according to user choices (deterministic-only vs deterministic+AI).
