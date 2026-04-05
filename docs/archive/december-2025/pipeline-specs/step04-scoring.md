# Step 4 – Scoring (PIQI-Lite, PIQI-Ready)

## 1. Purpose

Compute **data quality scores** for the normalized dataset from Step 3, using a:

- Simple, **PIQI-inspired (PIQI-lite)** deterministic scoring model for the demo.
- Architecture that is **PIQI-ready** so that a future, formal **PIQI Diabetes Rubric** can be plugged in without rewriting the pipeline.
- Clear separation between:
  - **Deterministic scoring engine**
  - **Rubric configuration (rules, thresholds, weights)**
  - **Rendering (UI dashboards, status badges)**
  - **Optional agentic assistance (Archia)**

The v3 demo does **not** implement a real PIQI rubric. It uses a mock “PIQI-like” structure to score:

- **Completeness** – are required fields present?
- **Conformance** – do values conform to basic expectations?
- **Plausibility** – are values within plausible clinical ranges? (very minimal in v3)

A future PIQI Diabetes Rubric will extend and refine these dimensions.

---

## 2. Inputs & Outputs

### 2.1 Input: Normalized Records

Scoring consumes `normalizedRecords: NormalizedRecord[]` from Step 3, with fields like:

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

### 2.2 Input: Mock Rubric Configuration (PIQI-Lite)

For v3, we define a **very small, inline rubric** to demonstrate the pattern.  
Later, this will be externalized to a file:

- `dq-rubrics/diabetes-rubric-placeholder.json`

For the demo, we can define in code something like:

```ts
type DqDimension = "completeness" | "conformance" | "plausibility";

type DqDomain = "demographics" | "diagnoses" | "medications" | "labs";

type SimpleRubricRule = {
  id: string;
  domain: DqDomain;
  dimension: DqDimension;
  description: string;
  weight: number;        // 0–1 weight within a domain
};

type SimpleRubric = {
  id: string;
  name: string;          // e.g. "PIQI-Lite Diabetes Demo"
  version: string;       // e.g. "0.1.0-demo"
  domains: DqDomain[];
  dimensions: DqDimension[];
  rules: SimpleRubricRule[];
};
```

Example mock rubric (hard-coded for now):

- **Demographics completeness**: presence of age, sex, height, weight
- **Diagnosis conformance**: presence of mapped ICD-10 diagnosis
- **Medication completeness**: at least one mapped medication if diagnosis suggests diabetes (stretch)
- **Labs completeness**: presence of key diabetes-related labs (A1c, fasting glucose) – demo-level only

### 2.3 Output: Data Quality Scores

The scoring engine produces:

```ts
type DomainScore = {
  domain: DqDomain;
  completeness: number;   // 0–100
  conformance: number;    // 0–100
  plausibility: number;   // 0–100
};

type RecordScore = {
  id: string;             // record ID
  domainScores: DomainScore[];
  overallScore: number;   // aggregate 0–100
};

type DqScoringResult = {
  rubricId: string;       // e.g. "piqi-lite-diabetes-demo"
  rubricVersion: string;  // e.g. "0.1.0"
  domainScores: DomainScore[];   // aggregated across patients
  recordScores?: RecordScore[];  // optional for v3 UI (row-level detail)
};
```

The step state includes:

- `scoringStatus: "idle" | "running" | "success" | "error"`
- `scoringResult: DqScoringResult | null`

---

## 3. Deterministic Scoring Logic (PIQI-Lite)

### 3.1 Conceptual Approach

For each **domain** and **dimension**, we compute:

```text
score(domain, dimension) = (# of records meeting the rule criteria) / (total # of applicable records) * 100
```

In v3 demo, we keep rules very simple and intuitive.

### 3.2 Example Mock Rules (Deterministic)

#### 3.2.1 Demographics – Completeness

Per record, count:

- Age present?
- Sex present? (not null, not “Unknown”)
- Height present?
- Weight present?

For demo:

- Score is the **percentage of required fields present** across all records.

#### 3.2.2 Diagnoses – Conformance

Per record:

- At least **one mapped diagnosis** (`status === "mapped" or "mapped_via_ai"` and `code` not null).

Score: % of records with at least one mapped diagnosis.

#### 3.2.3 Medications – Completeness (demo-level)

If any diagnosis suggests diabetes (e.g., one mapped code in the `E10.*` or `E11.*` family):

- Check if the patient has **at least one medication** (mapped or unmapped).
- This is **not clinically rigorous**, just a placeholder:

Score: among diabetes patients, % with ≥1 medication recorded.

#### 3.2.4 Labs – Completeness

Given normalized labs:

- If the lab `source` or code suggests A1c, fasting glucose, or basic metabolic tests (based on your LOINC_MAP):

Score: % of patients with at least one relevant lab.

> All of these are only **demonstration rules**, not official PIQI metrics.

### 3.3 Aggregation

For each domain, we compute:

```ts
const domainScore: DomainScore = {
  domain: "diagnoses",
  completeness: completenessPct,  // e.g., N/A or 100
  conformance: conformancePct,
  plausibility: plausibilityPct   // optional in v3, can be 100 by default
};
```

Overall score might be a simple average of domain scores:

```ts
overallScore = average([
  domainScores.demographics.completeness,
  domainScores.diagnoses.conformance,
  domainScores.medications.completeness,
  domainScores.labs.completeness
]);
```

We keep the math **transparent and explainable** in tooltips.

---

## 4. Future PIQI Diabetes Rubric Integration (Design)

A future project will deliver a real PIQI Diabetes Rubric under Apache 2.0, likely with:

- richer domain breakdowns,  
- subdimensions,  
- weighted metrics,  
- more nuanced rules for diabetes care.

To prepare for it, we define a **rubric file location**:

```text
dq-rubrics/diabetes-rubric-placeholder.json
```

For v3, this file might look like:

```json
{
  "id": "piqi-diabetes-rubric-placeholder",
  "name": "PIQI Diabetes Rubric (Placeholder)",
  "version": "0.0.1-demo",
  "source": "PIQI Alliance (structure only, not final)",
  "domains": ["demographics", "diagnoses", "medications", "labs"],
  "dimensions": ["completeness", "conformance", "plausibility"],
  "notes": "This is a placeholder for structure only. No official scores."
}
```

The scoring engine should be written so that:

- **today**: it uses a hard-coded mock rubric for the demo.
- **later**: it can load a real rubric from JSON and apply rules.

---

## 5. UI Behavior

### 5.1 Layout

Within the **Step 4 – Scoring** panel:

- Section title: `Step 4 – Scoring`
- Short explainer:
  - “This step computes PIQI-lite style data quality scores for completeness, conformance, and plausibility across key domains. A future PIQI Diabetes Rubric will be plugged in here.”

### 5.2 Summary Cards

Show **domain-level scores** as cards:

- Demographics – completeness %
- Diagnoses – conformance %
- Medications – completeness %
- Labs – completeness %

Each card:

- Title: domain name
- Main metric: “Demographics Completeness: 92%”
- Optionally, a “View details” link that scrolls or expands a detail table.

### 5.3 Overall Score

At the top or bottom, show:

- “Overall Data Quality Score: 88%”  
- With a short note indicating:
  - “Demo compute using a simple PIQI-lite scoring model (not an official PIQI score).”

### 5.4 Detail Table (Optional in v3)

A table with rows per domain/dimension:

| Domain       | Dimension     | Score | Notes                         |
|-------------|--------------|-------|-------------------------------|
| Demographics| Completeness | 92%   | 3 patients missing weights    |
| Diagnoses   | Conformance  | 85%   | 4 patients without mapped ICD |
| Labs        | Completeness | 60%   | 8 patients missing A1c labs   |

This supports readability for clinical informatics stakeholders.

---

## 6. Agentic Assistance (AI_ENABLED=true)

When `AI_ENABLED=true`, scoring supports **optional agentic insights** from Archia without changing baseline deterministic scores unless the user explicitly applies recommendations that affect upstream data.

### 6.1 When to Call Archia

After deterministic scoring completes:

- If scores are all very high and no major issues → agentic analysis is optional or hidden behind a button.
- If one or more domains have low scores:
  - Show a CTA:  
    - “Ask AI to analyze data quality issues”

### 6.2 Backend Call Example

```http
POST /archia/agent
Content-Type: application/json
```

Payload (example structure):

```json
{
  "step": "scoring",
  "ai_enabled": true,
  "summary_scores": {
    "demographics": { "completeness": 92 },
    "diagnoses": { "conformance": 85 },
    "labs": { "completeness": 60 }
  },
  "signals": {
    "missing_labs": 8,
    "patients_without_mapped_diagnoses": 4
  },
  "sample_records": [
    {
      "id": "P010",
      "normalized": { /* subset of normalized record */ },
      "issues": ["NO_MAPPED_DIAGNOSIS", "MISSING_A1C"]
    }
  ],
  "rubric": {
    "id": "piqi-lite-diabetes-demo",
    "version": "0.1.0"
  }
}
```

### 6.3 Expected Archia Response (Demo)

```json
{
  "root_cause": "Lab completeness is low, especially for key diabetes measures like A1c.",
  "suggested_actions": [
    "Ensure A1c is captured at least every 3 months for patients with diabetes.",
    "Review lab interfaces for missing or unmapped A1c codes.",
    "Verify that clinics consistently send lab feeds to the HIE."
  ],
  "prioritized_domains": [
    {
      "domain": "labs",
      "dimension": "completeness",
      "priority": "high",
      "impact_comment": "Improving A1c completeness will significantly enhance diabetes care monitoring."
    }
  ],
  "step_by_step_report": "I reviewed domain scores and identified labs completeness as the main driver of lower overall quality..."
}
```

### 6.4 Agentic UI (Side Drawer)

As with other steps, use a **right-hand side drawer** when AI is used:

- Title: “Scoring – AI Analysis”
- Sections:
  - Root cause
  - Suggested actions
  - Prioritized domains
  - Narrative explanation

Importantly:

- **Agentic scoring does NOT override deterministic scores.**  
- Instead, it **explains** scores and **recommends** focus areas.

---

## 7. Original vs Patched Data & Re-Scoring

If earlier steps (Normalization, Enrichment) have been AI-patched and rerun:

- Scoring should always use the **current active dataset**:
  - `normalizedRecords` (original or AI-patched).
- The UI should label the scoring context clearly:
  - “Scoring on: deterministic dataset”
  - or “Scoring on: AI-patched dataset (v3_normalized_ai)”

If the user accepts additional changes upstream that affect data quality (e.g., new mappings, patching missing labs):

- Scoring should be re-runnable:
  - Provide a “Recompute Scores” button for Step 4.

---

## 8. Logging & Telemetry

The Scoring step should log:

- When scoring was run (timestamp).
- Which rubric ID and version were used.
- Aggregated scores per domain.
- Whether AI analysis was invoked.
- If future rubrics are loaded from file:
  - the `rubric.source` (e.g., “PIQI Alliance draft 2026-02-01”).

For v3 demo, logging can be console-based or in-memory, but the structure should anticipate more robust telemetry in an MVP.

---

## 9. Completion Criteria

Step 4 – Scoring is considered **complete** when:

1. A deterministic scoring run has been completed on the current normalized dataset.
2. Domain-level scores (completeness, conformance, plausibility) are computed and displayed.
3. An overall data quality score is visible.
4. If `AI_ENABLED=true` and AI is used:
   - The side drawer allows inspection of AI’s analysis.
   - It is clear that AI is advisory, not the scoring engine.
5. The architecture is **PIQI-ready**:
   - The scoring engine accepts a rubric shape that can later be pointed to a real PIQI Diabetes Rubric file under `dq-rubrics/`.

This step bridges the deterministic data quality pipeline and the future PIQI-aligned MVP while providing a credible, demo-friendly view of “good enough” scoring for January.
