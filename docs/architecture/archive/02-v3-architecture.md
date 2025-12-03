⚠️ **Deprecated Document**
# V3 Architecture – Deterministic + Agentic + NLP

## Goals

1. **Deterministic pipeline as system of record**
   - The existing 7-step wizard remains the primary, auditable flow.
2. **Optional agentic fallback (Archia)**
   - When enabled, Archia suggests fixes and explanations for pipeline errors.
3. **AI feature flag**
   - Single configuration (`AI_ENABLED`) can turn all AI behavior on/off.
4. **NLP Analytics**
   - Ask-Anything chat over the final clean dataset (via Archia or similar).
5. **Auditability**
   - Any data changes are explicit, versioned, and logged.

## High-Level Components

- **Frontend (React / Vite)**

  - Single-page wizard UI (steps 1–7).
  - Side drawer for AI explanations, suggested fixes, and patches.
  - Analytics section with:
    - Deterministic reports tab
    - Ask-Anything (NLP) tab

- **Backend (Node / Express – planned)**

  - Orchestrates deterministic pipeline operations that need a server.
  - Provides stable API endpoints for the frontend:
    - `/pipeline/*` endpoints (future)
    - `/archia/agent` – agentic fallback for errors
    - `/archia/query` – NLP question answering
  - Enforces `AI_ENABLED` feature flag.

- **Data Store (future)**
  - Initially: in-memory per user session.
  - Later: DuckDB / Postgres / other persistent store for:
    - raw, translated, normalized datasets
    - patch versions & audit logs
    - analytics aggregates.

### Database Decision Placeholder (To Be Finalized)

> **The selection of the primary database for the v3 demo is intentionally deferred until Dominique + Sivaram finalize requirements.**
>
> The wizard treats the persistence layer as a **pluggable database**, meaning all components (Pipeline Steps 5–7, Analytics, and Archia patch storage) refer only to a generic “primary database” rather than a specific technology.

#### Assumptions (independent of DB choice)

- One _logical_ database per environment (local or demo)
- Supports basic transactional operations (insert/update of runs, patient records)
- Can persist normalized records and derived artifacts
- Can be queried by Step 7 Analytics (counts, distributions, metrics)
- Can store dataset versions (deterministic vs patched runs)

#### Candidate technologies under evaluation

- **SQLite + Prisma** – simple, file-based, developer-friendly for demos
- **PostgreSQL** – production-grade, ideal long-term
- **DuckDB** – analytics-optimized, columnar, in-process
- **Couchbase FHIR CE** – FHIR-native, document-oriented
- **Other options** depending on constraints

#### Decision Status

👉 **TBD.**  
This section will be replaced with the final DB selection after Dominique + Sivaram alignment.

Only this architecture area — and Step Specs **5** (Persistence) & **7** (Analytics) — will require updates once the database is finalized.

- **Archia API (external)**

  - LLM/agentic runtime used as a “copilot”:
    - Explains root causes of pipeline errors.
    - Suggests fixes / patches.
    - Answers analytic questions over the dataset.

- **Terminology Service (external or mocked)**
  - For normalization and code mapping:
    - ICD-10, RxNorm, LOINC, SNOMED CT.
  - V3 may start with in-code lookup tables, but the architecture assumes a proper terminology API later.

## Runtime Flows (Conceptual)

### 1. Deterministic Only (AI_DISABLED)

- `AI_ENABLED = false`
- Pipeline steps 1–7 run as today, purely deterministic.
- On error:
  - User sees clear error messages and problem rows/fields.
  - **No calls** are made to `/archia/*`.
- Analytics:
  - Deterministic reports tab is available.
  - Ask-Anything tab is disabled or shows a message explaining that AI is off.

### 2. Deterministic + Agentic Fallback (AI_ENABLED)

- `AI_ENABLED = true`
- Pipeline still runs deterministically first.
- When a supported step fails (initially: Ingestion, Translation, Normalization):

  1. Backend prepares an error payload with:
     - `step`, `errorType`, `errorDetails`, `sampleRows`, and relevant metadata.
  2. Backend calls `POST /archia/agent`.
  3. Archia returns:
     - `root_cause` – short explanation
     - `suggested_fixes[]` – items user can review
     - `patched_rows[]` – optional corrected rows
     - `step_by_step_report` – narrative of what was analyzed and changed.
  4. Frontend opens an **AI side drawer** for that step:
     - Shows explanation, fixes, patches.
     - Lets user toggle between **Original** and **Patched** view.
     - Allows user to apply a patch “trial run” and re-run downstream steps.

- All Archia-inspired changes are:
  - Applied to a **new dataset version**, not overwriting the original.
  - Logged with metadata and user confirmation.

### 3. Analytics

- **Deterministic Reports tab**

  - Uses the final chosen dataset (original or patched).
  - Purely deterministic; does not require AI.

- **Ask-Anything tab**
  - If `AI_ENABLED = true`:
    - User types a question.
    - Frontend calls `POST /archia/query` with:
      - `question`
      - optional `filters` and dataset/version identifiers.
    - Backend forwards to Archia and returns:
      - `answer` (text)
      - optional `structured_results`.
  - If `AI_ENABLED = false`:
    - Tab is disabled or shows “AI is disabled” message.

## Configuration

- `AI_ENABLED` (boolean)
  - Source of truth in backend (environment variable).
  - Exposed to frontend via config endpoint or embedded config.
- Demo toggles:
  - “Clean vs errorful CSV” selection:
    - CSV A (clean) – full pipeline, no errors.
    - CSV B (errorful) – designed to trigger agentic behavior in selected steps.

## Extension Points

- **Archia client module (`archiaClient.ts`, planned)**

  - Single place where backend talks to Archia.
  - Easy to swap for another agent runtime in future.

- **Terminology client module (`terminologyClient.ts`, planned)**

  - Encapsulates all normalization lookups.

- **Audit log model**
  - Records:
    - dataset ID + version
    - what changed (diff)
    - reason (e.g., “Archia patch applied”)
    - who approved (user)
    - when it was applied.
