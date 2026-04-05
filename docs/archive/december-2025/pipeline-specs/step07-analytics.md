# Step 7 – Analytics

## 1. Purpose

Provide a **single-page Analytics surface** that:

1. Shows **deterministic, reproducible dashboards** based on the enriched + scored dataset (Steps 4–6).
2. Exposes an **NLP “Ask Anything” chat** interface backed by Archia when `AI_ENABLED=true`.
3. Makes the separation between:
   - Deterministic analytics
   - Agentic / AI-assisted analytics
   explicit and easy to explain to clinical informaticians and technical leads.

The Analytics step is **read-only** with respect to the dataset. It does not mutate underlying records.

---

## 2. Inputs & Outputs

### 2.1 Inputs

Analytics consumes (read-only):

- `enrichedRecords: EnrichedRecord[]` from Step 6
- `scoringResult: DqScoringResult | null` from Step 4
- Optional `persistenceState: PersistenceState | null` from Step 5

Where:

```ts
type EnrichedRecord = NormalizedRecord & {
  enrichment: {
    bmi: number | null;
    bmiCategory: "underweight" | "normal" | "overweight" | "obese" | "unknown";
    diabetesRiskTier: "low" | "medium" | "high" | "unknown";
    hasDiabetesDiagnosis: boolean;
    hasKeyLabs: boolean;
    hasDiabetesMedications: boolean;
  };
  enrichment_issues: string[];
  enrichment_version: "v3_enriched" | "v3_enriched_ai";
};

type DqScoringResult = {
  rubricId: string;
  rubricVersion: string;
  domainScores: {
    domain: string;        // e.g. "demographics"
    completeness: number;  // 0–100
    conformance: number;   // 0–100
    plausibility: number;  // 0–100
  }[];
  recordScores?: any;      // optional for v3
};

type PersistenceState = {
  runId: string;
  recordCount: number;
  datasetVersion: "v3_normalized" | "v3_normalized_ai";
  persistedAt: string;
};
```

### 2.2 Outputs (Analytics View)

No new data objects are persisted. The step outputs:

- Visual summaries (charts/tables) on screen.
- Optional **NLP answers** from Archia (when enabled).
- UX affordances for stakeholders to explore the dataset qualitatively.

---

## 3. Layout & Tab Structure

Analytics is presented in a **two-tab layout** within the same central area:

1. **Tab A: Deterministic Reports**
2. **Tab B: Ask Anything (AI)**

### 3.1 Tab Selector

At the top of the Analytics content area (below the fixed step wizard bar):

- A horizontal tab bar:

  - **Deterministic Reports**
  - **Ask Anything (AI)**

When `AI_ENABLED=false`:

- The **Ask Anything** tab is:
  - Disabled (greyed out),
  - Or shows a clear message:
    - “AI features are disabled by configuration. Deterministic analytics remain available.”

---

## 4. Tab A – Deterministic Reports

Deterministic Reports should be usable **even if AI is off** and the dataset is purely deterministic.

### 4.1 Cohort Summary Section

A top section with key stats (cards):

- Total patients in current run (`enrichedRecords.length`)
- % with diabetes diagnosis (`hasDiabetesDiagnosis`)
- % with key labs
- % with diabetes medications
- Overall DQ score (if `scoringResult` available)

Example small cards:

- “20 Patients”
- “75% with diabetes diagnosis”
- “60% with key labs”
- “Overall data quality: 88%”

### 4.2 BMI & Risk Tier Distributions

Use simple charts or tables (for demo; no D3 requirement in spec):

- **BMI distribution** (bar chart or table):
  - Underweight, Normal, Overweight, Obese, Unknown

- **Diabetes risk tier distribution**:
  - Low, Medium, High, Unknown

The implementation can use a simple charting library or just React tables with counts.

### 4.3 Data Quality Domain Scores

If `scoringResult` is present:

- Show a table:

  | Domain       | Completeness | Conformance | Plausibility |
  |-------------|--------------|------------|--------------|
  | Demographics| 92%          | N/A        | 100%         |
  | Diagnoses   | 88%          | 85%        | 100%         |
  | Labs        | 60%          | 70%        | 100%         |

- Include labeling:

  - “Scores are computed using a PIQI-lite demo rubric (not an official PIQI score).”

### 4.4 Optional Record-Level Explorer (Simplified)

Support a basic table that can be sorted/filtered:

Columns:

- ID
- Age
- BMI
- Risk Tier
- Has Diabetes Dx?
- Has Key Labs?
- Has Diabetes Meds?

Filters:

- “Show only high risk”
- “Show only medium/high risk”
- “Show only patients missing key labs”

This explorer should be:

- Fully deterministic.
- Responsive to changes in upstream steps (i.e., if dataset is AI-patched, this reflects that).

---

## 5. Tab B – Ask Anything (AI)

The **Ask Anything** tab exposes an **NLP analytics chat** powered by Archia, but only if `AI_ENABLED=true`.

### 5.1 Behavior When AI is Disabled

If `AI_ENABLED=false`:

- The Ask Anything tab should either:
  - Be disabled, or
  - Show a message-only state:

    > “AI / agentic analytics are currently disabled by configuration.  
    > You can still use deterministic reports in the other tab.”

No network calls to Archia should be made.

### 5.2 Chat UI Basics

When `AI_ENABLED=true`, the tab should show:

- A scrollable **conversation area**:
  - Messages from “User” and “AI”
- A **text input** at the bottom:
  - Placeholder: “Ask a question about this dataset (e.g., ‘How many high-risk patients are missing A1c?’)”
- A **Send** button.

Messages are local to the current pipeline run/session.

### 5.3 Backend Call

On submit, the frontend calls a backend endpoint, e.g.:

```http
POST /archia/query
Content-Type: application/json
```

With payload:

```json
{
  "step": "analytics",
  "ai_enabled": true,
  "question": "How many high-risk patients are missing A1c?",
  "filters": {
    "riskTier": null,
    "hasKeyLabs": null
  },
  "dataset_profile": {
    "recordCount": 20,
    "dqSummary": {
      "overallScore": 88
    }
  }
}
```

For v3 demo:

- This endpoint may be mocked to return canned or semi-structured responses.

### 5.4 Expected Response Shape

The backend returns:

```json
{
  "answer": "Out of 20 patients, 4 are in the high-risk tier and 3 of them are missing key diabetes labs.",
  "structured": {
    "highRiskCount": 4,
    "highRiskMissingLabs": 3
  },
  "reasoning_summary": "I filtered patients tagged as 'high' risk and checked which ones have no key labs ..."
}
```

### 5.5 Rendering AI Answers

In the Ask Anything tab, each response should display:

- The main `answer` text.
- Optional “Details” toggle that, when expanded:
  - Shows `structured` fields in a small table.
  - Shows `reasoning_summary` in smaller font.

All of this is **advisory** and **read-only**.

No AI answer should directly modify the dataset, scoring, or enrichment.

---

## 6. AI Boundaries and Feature Flag

### 6.1 `AI_ENABLED` Behavior

- If `AI_ENABLED=false`:
  - **No** calls to `/archia/query` are made.
  - Ask Anything tab is disabled or informative-only.
  - Deterministic Reports tab still works fully.

- If `AI_ENABLED=true`:
  - Ask Anything tab is active.
  - Frontend calls backend endpoints as described.
  - All AI content is clearly labeled as such.

### 6.2 No Automatic Data Changes

Even when AI is enabled:

- The Ask Anything tab must **never** modify:
  - `enrichedRecords`
  - `normalizedRecords`
  - `scoringResult`
  - `persistenceState`

If, in future, you want “actionable AI” (e.g., “Apply this filter to the view”), those actions should be:

- Optional UI events,
- Not silent mutations of the underlying dataset.

---

## 7. Logging & Telemetry

Analytics logging (for future MVP) should consider:

- How often each tab is used.
- Common question patterns in the Ask Anything tab.
- Whether AI answers refer to misalignments between scoring, enrichment, and actual data.

For v3 demo:

- Light logging (console/in-memory) of:
  - Each question asked.
  - High-level shape of responses (no PHI).

---

## 8. Completion Criteria

Step 7 – Analytics is considered **complete** for v3 when:

1. The **Deterministic Reports** tab:
   - Shows cohort summary metrics.
   - Shows BMI and risk tier distributions.
   - Displays DQ domain scores (if available).
   - Provides a simple record-level explorer.

2. The **Ask Anything (AI)** tab:
   - Is clearly:
     - disabled with explanation when AI is off, or
     - enabled and functional when AI is on.
   - Can send at least one question and show a valid response.

3. There is a clear visual and conceptual distinction between:
   - Deterministic analytics (always available after pipeline run),
   - AI-powered analytics (optional, controlled by `AI_ENABLED`).

Analytics should feel like the **capstone view** that leverages all upstream steps (1–6) without introducing ambiguity about what is deterministic vs agentic.

