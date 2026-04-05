# Step 6 – Enrichment

## 1. Purpose

Derive **additional clinically meaningful features** from the normalized dataset to support:

- Better **analytics** (Step 7),
- Clearer **risk stratification** for diabetes-related use cases,
- Plausibility checks that can later be aligned with a formal **PIQI Diabetes Rubric**.

Enrichment is **deterministic first**, with **optional agentic assistance** (Archia) for:

- flagging implausible derived values,
- suggesting alternative thresholds,
- explaining risk tiers in natural language.

---

## 2. Inputs & Outputs

### 2.1 Input: Normalized Records

Input comes from Step 3 (Normalization), possibly AI-patched:

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

### 2.2 Output: Enriched Records

The Enrichment step creates `enrichedRecords: EnrichedRecord[]` with:

```ts
type BmiCategory = "underweight" | "normal" | "overweight" | "obese" | "unknown";

type DiabetesRiskTier = "low" | "medium" | "high" | "unknown";

type EnrichedRecord = NormalizedRecord & {
  enrichment: {
    bmi: number | null;               // kg/m^2
    bmiCategory: BmiCategory;
    diabetesRiskTier: DiabetesRiskTier;  // demo-level, not clinical
    hasDiabetesDiagnosis: boolean;
    hasKeyLabs: boolean;              // e.g. A1c or fasting glucose present
    hasDiabetesMedications: boolean;  // any mapped diabetes medication
  };
  enrichment_issues: string[];        // e.g. ["BMI_UNRELIABLE_NO_HEIGHT"]
  enrichment_version: "v3_enriched" | "v3_enriched_ai";
};
```

The step state includes:

- `enrichmentStatus: "idle" | "running" | "success" | "warning" | "error"`

---

## 3. Deterministic Enrichment Logic

### 3.1 BMI Computation

BMI formula:

```text
BMI = weight_kg / (height_m^2)
where height_m = height_cm / 100
```

Rules:

- If either height or weight is `null` → `bmi = null`, `bmiCategory = "unknown"`.
- If height_cm <= 0 or implausible (e.g., < 80 or > 230) → treat as missing for BMI:
  - `bmi = null`
  - `bmiCategory = "unknown"`
  - `enrichment_issues.push("BMI_UNRELIABLE_HEIGHT_OUT_OF_RANGE")`

- If weight_kg implausible (e.g., < 20 or > 300) → same behavior:
  - `bmi = null`
  - `bmiCategory = "unknown"`
  - `enrichment_issues.push("BMI_UNRELIABLE_WEIGHT_OUT_OF_RANGE")`

> These thresholds are **demo-level**, not clinical guidance.

### 3.2 BMI Category

If BMI is available:

- `< 18.5` → `"underweight"`
- `18.5–24.9` → `"normal"`
- `25–29.9` → `"overweight"`
- `>= 30` → `"obese"`

Else:

- `"unknown"`

### 3.3 Detect Diabetes Diagnosis

Using normalized diagnoses:

- `hasDiabetesDiagnosis = true` if **any** normalized diagnosis code:
  - starts with `"E10"` or `"E11"` (ICD-10)  
  - OR contains some demo-level diabetes codes based on your `ICD10_MAP`.

Otherwise:

- `hasDiabetesDiagnosis = false`.

### 3.4 Detect Key Labs

Using normalized labs:

- For v3, mark `hasKeyLabs = true` if **any** normalized lab code (or source string) suggests:
  - Hemoglobin A1c
  - Fasting plasma glucose
  - Basic metabolic panel

Driven by your demo `LOINC_MAP`, this might mean:

- `code` in `{ "4548-4", "1558-6" }` or
- `source` contains strings like `"a1c"`, `"hba1c"`, `"fasting glucose"` (case-insensitive).

Otherwise:

- `hasKeyLabs = false`.

### 3.5 Detect Diabetes Medications

Using normalized medications:

- `hasDiabetesMedications = true` if any medication’s normalized code or source indicates:
  - Insulin
  - Metformin
  - Other T1D/T2D medications (as per your demo `RXNORM_MAP`).

Demo-level logic:

- Check `source.toLowerCase()` for `"insulin"` or `"metformin"`.

Otherwise:

- `hasDiabetesMedications = false`.

### 3.6 Diabetes Risk Tier (Demo-Only)

**Important:** This is a non-clinical, demo-only tier:

Suggested deterministic rules:

- If `hasDiabetesDiagnosis` AND `hasKeyLabs` AND `hasDiabetesMedications`:
  - `diabetesRiskTier = "high"`
- If `hasDiabetesDiagnosis` AND (`hasKeyLabs` OR `hasDiabetesMedications`):
  - `diabetesRiskTier = "medium"`
- If NOT `hasDiabetesDiagnosis` BUT `hasKeyLabs` (suggesting at-risk screening):
  - `diabetesRiskTier = "low"`
- In all other cases:
  - `diabetesRiskTier = "unknown"`

This logic is easy to explain and trivial to adjust later.

---

## 4. UI Behavior

### 4.1 Summary View

The Step 6 panel should show a **cohort-level summary**:

- Count of patients per BMI category:
  - e.g., `Normal: 8`, `Overweight: 7`, `Obese: 5`
- Count of patients per diabetesRiskTier:
  - e.g., `Low: 3`, `Medium: 6`, `High: 4`, `Unknown: 7`

These can be presented as:

- A small bar chart, or
- Simple pill-style counts.

### 4.2 Record-Level Preview

Provide a table with columns:

- `ID`
- `Age`
- `BMI`
- `BMI Category`
- `Diabetes Risk Tier`
- `Has Diabetes Dx?`
- `Has Key Labs?`
- `Has Diabetes Meds?`

Allow a filter:

- “Show only Medium/High risk”
- “Show only records with enrichment issues”

### 4.3 Indicators & Status

- Bottom bar text:
  - “Enrichment complete – 12 patients with defined BMI”
  - “Enrichment complete – 10 patients assigned to medium/high risk tiers”
- Status badge:
  - Green: No critical issues
  - Yellow: Some enrichment issues (e.g., missing height/weight)
  - Red: Hard error (e.g., missing input dataset)

---

## 5. Agentic Assistance (AI_ENABLED=true)

When `AI_ENABLED=true`, Enrichment can use Archia to:

- Explain the distribution of BMI and risk tiers.
- Flag possible implausibilities.
- Suggest alternative, more clinically grounded thresholds for future versions.

### 5.1 When to Call Archia

Trigger points:

- After enrichment completes, provide CTA:
  - “Ask AI to analyze enrichment and risk tiers”
- Alternatively, when suspicious patterns appear, such as:
  - Many patients with `BMI > 60`
  - Many `unknown` risk tiers despite rich underlying data

### 5.2 Backend Call Example

```http
POST /archia/agent
Content-Type: application/json
```

Payload:

```json
{
  "step": "enrichment",
  "ai_enabled": true,
  "summary": {
    "bmiDistribution": {
      "underweight": 1,
      "normal": 8,
      "overweight": 7,
      "obese": 4,
      "unknown": 0
    },
    "riskTiers": {
      "low": 3,
      "medium": 6,
      "high": 4,
      "unknown": 7
    }
  },
  "examples": [
    {
      "id": "P010",
      "bmi": 42.1,
      "bmiCategory": "obese",
      "diabetesRiskTier": "high",
      "hasDiabetesDiagnosis": true,
      "hasKeyLabs": true,
      "hasDiabetesMedications": true
    }
  ],
  "context": {
    "cohort": "diabetes",
    "version": "v3_enriched"
  }
}
```

Expected Archia-style response:

```json
{
  "root_cause": "A substantial portion of patients fall into high BMI and high-risk tiers.",
  "insights": [
    "High-risk patients often have both diabetes diagnoses and key labs present, suggesting that lab workflow is working for them.",
    "Unknown risk tiers are primarily due to missing key labs or medications."
  ],
  "suggested_future_rules": [
    "Refine risk tiers using A1c thresholds when available.",
    "Flag patients with diabetes diagnoses but no recent labs as at-risk for care gaps."
  ],
  "step_by_step_report": "I analyzed the BMI categories and risk tiers to identify how many patients fall into each group..."
}
```

### 5.3 Agentic UI (Side Drawer)

When AI results arrive:

- Open right-hand side drawer titled:
  - “Enrichment – AI Analysis”
- Sections:
  - Summary of BMI and risk tiers
  - Root cause & insights
  - Suggested future rules for a more sophisticated rubric
  - Narrative explanation

Critically:

- Agentic insights **do not change** BMI or risk tiers in v3.
- They act as **advisory** for design discussions and the future Diabetes Rubric.

If, in the future, you decide to allow AI-suggested threshold changes, those should be:

- Explicit, user-approved, and applied only to **derived metrics**, not raw data.

---

## 6. Logging & Telemetry

For each enrichment run, log:

- Number of patients with valid BMI
- Counts per BMI category
- Counts per risk tier
- Number and type of `enrichment_issues`
- Whether AI analysis was invoked and key insights surfaced

This can inform:

- MVP design of more advanced enrichment modules
- Future steps to integrate formal Diabetes Rubric logic

---

## 7. Completion Criteria

Step 6 – Enrichment is **complete** when:

1. `enrichedRecords` exists and contains enrichment fields for all normalized records.
2. BMI is calculated (or flagged unknown) where possible.
3. Diabetes risk tiers are assigned using deterministic rules.
4. The UI surfaces:
   - Cohort-level summaries (BMI categories, risk tiers),
   - A record-level preview,
   - Any enrichment issues (e.g., missing data).
5. If `AI_ENABLED=true`:
   - The user may request an AI analysis in a side drawer,
   - The AI output is clearly advisory, not authoritative.

The enriched dataset (`enrichedRecords`) is then made available to **Step 7 – Analytics** for visualizations and the NLP “Ask Anything” tab.
