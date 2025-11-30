# Oros Health Data Pipeline Wizard (v3) — Overview & Index

This repository contains the **modular 7-step pipeline wizard** used to ingest, translate, normalize, score, enrich, persist, and analyze healthcare data (for the demo: synthetic CSVs).  
It supports **deterministic processing** and optional **agentic fallback workflows** via Archia.

---

## Quickstart

Prerequisites  
- Node.js 20+ (LTS)  
- npm  
- Git  

Clone the repository:

```bash
git clone https://github.com/Oros-AI/oros-health-pipeline-ui.git
cd oros-health-pipeline-ui
```

Check out the v3 development branch:

```bash
git checkout v3-wizard-agentic
```

Install dependencies:

```bash
npm install
```

Start the local dev server:

```bash
npm run dev
```

Then open the URL printed by Vite (usually `http://localhost:5173`).

### What to do in the UI

1. Upload **CSV A (clean)** to see the full deterministic “happy path.”  
2. Upload **CSV B (errorful)** to see error messaging and (when `AI_ENABLED=true`) optional agentic analysis in eligible steps.  
3. Navigate through the 7-step pipeline using the top navigation bar:
   - Ingestion  
   - Translation  
   - Normalization  
   - Scoring  
   - Persistence  
   - Enrichment  
   - Analytics  

### AI / Agentic Behavior

Agentic behavior is controlled via a single backend flag:

```env
AI_ENABLED=true   # enable Archia integration
AI_ENABLED=false  # deterministic-only mode
```

When `AI_ENABLED=false`:
- No agentic calls are made  
- The side drawer stays hidden  
- The Ask Anything analytics tab is disabled  

When `AI_ENABLED=true`:
- Errors in Ingestion, Translation, or Normalization may trigger Archia analysis  
- The side drawer appears with root cause, suggested fixes, optional patches, and narratives  

---

This README provides:

- A unified architecture overview  
- A full step index (Steps 1–7)  
- Mermaid diagrams (pipeline, architecture, data flow)  
- Deterministic vs agentic behavior rules  
- UX conventions for the wizard  
- Archia integration contract  
- Dataset versioning rules  
- Developer onboarding  
- Links to step specifications  
- Optional references (Miro board, future PIQI Diabetes Rubric)  

This is the **source of truth** for engineers implementing v3.

---

# 1. High-Level Concept

The Pipeline Wizard is a **single-page, step-driven UI** that walks users through:

1. **Ingestion** (CSV → internal raw rows)  
2. **Translation** (raw rows → FHIR-like records)  
3. **Normalization** (value mapping → ICD-10, LOINC, RxNorm, units)  
4. **Scoring** (PIQI-lite DQ metrics)  
5. **Persistence** (mock DB + NDJSON export)  
6. **Enrichment** (BMI, risk strata, diabetes heuristics)  
7. **Analytics** (deterministic dashboards + optional NLP “Ask Anything”)  

At each stage, failures can trigger **agentic analysis** (if AI is enabled).  
Deterministic processing remains the authoritative system of record.

---

# 2. Quick Navigation — Step Specifications

Click into any step for full detail:

| Step | File | Purpose |
|------|------|---------|
| **01 — Ingestion** | [pipeline-specs/step01-ingestion.md](pipeline-specs/step01-ingestion.md) | Upload CSV, parse into raw rows, detect ingestion errors |
| **02 — Translation** | [pipeline-specs/step02-translation.md](pipeline-specs/step02-translation.md) | Map raw fields to FHIR-like structure (demo) |
| **03 — Normalization** | [pipeline-specs/step03-normalization.md](pipeline-specs/step03-normalization.md) | Map codes & units to ICD-10, LOINC, RxNorm; produce structured clinical data |
| **04 — Scoring** | [pipeline-specs/step04-scoring.md](pipeline-specs/step04-scoring.md) | PIQI-lite completeness, conformance, plausibility scoring |
| **05 — Persistence** | [pipeline-specs/step05-persistence.md](pipeline-specs/step05-persistence.md) | Persist normalized data + NDJSON export |
| **06 — Enrichment** | [pipeline-specs/step06-enrichment.md](pipeline-specs/step06-enrichment.md) | BMI, BMI category, diabetes risk tier, cohort flags |
| **07 — Analytics** | [pipeline-specs/step07-analytics.md](pipeline-specs/step07-analytics.md) | Deterministic reports + AI chat surface |

---

# 3. Deterministic vs Agentic Behavior (Core Rules)

### Deterministic
- Always produces the authoritative dataset  
- Runs even when AI is disabled  
- User sees clear structured errors  
- No silent mutations  
- Dataset versions:  
  - `v3_normalized`  
  - `v3_normalized_ai`  
  - `v3_enriched`  
  - `v3_enriched_ai`  

### Agentic (Archia)
Triggered **only** when:
- A step errors  
- A user explicitly requests AI analysis  
- AI is enabled (`AI_ENABLED=true`)  

Agentic behavior:
- Diagnoses errors  
- Suggests root causes  
- Proposes patches  
- Provides reasoning narratives  
- Never silently changes data  
- Any “patched” dataset requires **user approval**  

All agentic interactions appear in a **right-hand side drawer**.

---

# 4. Top-Level Pipeline Diagram (High-Level Mermaid)

```mermaid
flowchart LR
    A1[Upload CSV<br>Step 1: Ingestion]
    A2[Translate to FHIR-like<br>Step 2: Translation]
    A3[Normalize Codes<br>Step 3: Normalization]
    A4[PIQI-Lite Scoring<br>Step 4: Scoring]
    A5[Persist + NDJSON<br>Step 5: Persistence]
    A6[Enrichment<br>Step 6: Enrichment]
    A7[Analytics<br>Step 7: Analytics]

    A1 --> A2 --> A3 --> A4 --> A5 --> A6 --> A7
```

---

# 5. Deterministic + Agentic Architecture

The system has two main layers:

- **Frontend (FE) – React / Vite**
  - **Wizard UI (Steps 1–7)** – deterministic CSV pipeline UI
  - **Side Drawer – Agentic Insights** – shows Archia explanations, suggested fixes, and patched-row previews

- **Backend (BE) – Node / TypeScript**
  - **Deterministic Pipeline Engine** – runs the 7-step pipeline, owns the source-of-truth data
  - **Archia Client** – thin client that calls Archia’s APIs when AI is enabled

**Normal data flow (AI disabled or no errors):**

1. FE → BE deterministic engine to run each step.
2. BE returns updated pipeline state to FE.
3. Wizard UI + Analytics tabs render results from deterministic state.

**Agentic fallback on error (only when `AI_ENABLED=true`):**

1. A step fails in the deterministic engine (e.g., ingestion, translation, normalization).
2. BE calls **Archia Client**, which sends the error context + sample rows to Archia.
3. Archia returns:
   - root cause
   - suggested fixes
   - optional patched rows
   - narrative report
4. FE shows this in the **Side Drawer – Agentic Insights**:
   - toggle between *original* vs *patched* rows
   - accept / reject fixes
5. If the user accepts, BE re-runs the deterministic pipeline on the patched data and updates the main UI.

---

# 6. Dataset Versioning Model

```mermaid
flowchart TB
    RAW[Raw CSV Rows]
    TRANS[FHIR-like Translated Records]
    NORM[v3_normalized / v3_normalized_ai]
    ENRICH[v3_enriched / v3_enriched_ai]

    RAW --> TRANS --> NORM --> ENRICH
```

Rules:
- Version suffix `_ai` only appears after a user accepts an AI patch  
- Analytics always operates on **currently active dataset**  
- Persistence step explicitly reports dataset version  

---

# 7. Archia Integration Contract

### Standard Request Payload

```json
{
  "step": "<step-name>",
  "ai_enabled": true,
  "errors": [],
  "sample_records": [],
  "context": {},
  "dataset_version": "v3_normalized",
  "metadata": {
    "runId": "2025-01-12T10:22:11Z"
  }
}
```

### Standard Response Shape

```json
{
  "root_cause": "...",
  "suggested_fixes": ["..."],
  "patched_rows": [],
  "insights": [],
  "step_by_step_report": "..."
}
```

---

# 8. UX Conventions (Consistent Across Steps)

### Side Drawer
Used for:
- Agentic insights  
- Root cause analysis  
- Proposed fixes  
- Narrative summaries  

### Bottom Status Bar
- Shows: Pending, Success, Warning, Error  
- Always visible  

### Run Step
- Runs only current step  

### Run All
- Sequentially executes downstream steps  

### Dataset Version Badge
- Shows dataset lineage at top-right of main pane  

### Analytics Tabs
- Tab 1: Deterministic Reports  
- Tab 2: Ask Anything (enabled only when AI_ENABLED=true)  

---

# 9. Developer Onboarding

### Run locally

```bash
npm install
npm run dev
```

### Enable/Disable AI

In `.env`:

```bash
AI_ENABLED=true
```

or

```bash
AI_ENABLED=false
```

### Test Clean vs Errorful CSV

We use two demo CSVs:

- Clean (runs end-to-end deterministically)  
- Errorful (triggers agentic fallback at Ingestion, Translation, or Normalization)  

Place them in:

```text
/demo-data/
```

---

# 10. Future Integration Slots

### PIQI Diabetes Rubric (Full Version)
- Will replace PIQI-lite logic in Step 4  
- Will live in: `/dq-rubrics/diabetes.json`  
- Will reference terminology service  

### Terminology Service
- ICD-10, LOINC, RxNorm  
- Future integration via `/services/terminology-client.ts`  

### Real Persistence Layer
- DuckDB or Postgres  
- Replace mock persistence in Step 5  

### RTA / HIE Integration
- Eventual API contract for ingestion  
- Patient registry alignment  
- Data Quality dashboards  

---

# 11. Additional Reference (Optional)

**Miro Board – Working Notes & Ideation**  
_(Exploratory, not source-of-truth)_  
https://miro.com/app/board/uXjVJOTpxV4=/?share_link_id=77225652384

---

# 12. Detailed Diagrams Appendix

(Full-size diagrams — ideal for Fibery import or engineering discussions.)

---

## 12.1 Full Pipeline (Expanded)

```mermaid
flowchart TB
    subgraph RAW[Step 1 – Ingestion]
        R1[Upload CSV]
        R2[Parse Rows]
        R3[Validate Structure]
    end

    subgraph TRANS[Step 2 – Translation]
        T1[Map Fields to FHIR-like]
        T2[Detect Missing Fields]
    end

    subgraph NORM[Step 3 – Normalization]
        N1[ICD-10 Mapping]
        N2[LOINC Mapping]
        N3[RxNorm Mapping]
        N4[Unit Conversion]
    end

    subgraph SCORE[Step 4 – Scoring]
        S1[Completeness]
        S2[Conformance]
        S3[Plausibility]
    end

    subgraph PERSIST[Step 5 – Persistence]
        P1[Mock DB Write]
        P2[NDJSON Export]
    end

    subgraph ENRICH[Step 6 – Enrichment]
        E1[BMI]
        E2[Risk Tier]
        E3[Flags]
    end

    subgraph ANALYTICS[Step 7 – Analytics]
        A1[Deterministic Reports]
        A2[NLP Ask Anything]
    end

    RAW --> TRANS --> NORM --> SCORE --> PERSIST --> ENRICH --> ANALYTICS
```

---

## 12.2 Agentic Fallback Routing

```mermaid
flowchart LR
    D[Deterministic Step Runs] -->|Error| A[Archia Agentic Analysis]
    A -->|Suggestions| U[User Reviews Fixes]
    U -->|Accept| R[Re-run Deterministic Step]
    U -->|Reject| D2[Continue Deterministic Path]
```
