# V2 Baseline – Deterministic CSV Wizard

## Purpose

V2 is a single-page React/Vite wizard that walks a synthetic patient CSV file through a 7-step **deterministic** pipeline:

1. Ingestion – upload CSV and preview rows
2. Translation – convert CSV rows into structured JSON
3. Normalization – basic standardization of demographics and medical data
4. Scoring – PIQI-like data quality scores per domain (mock logic)
5. Persistence – simulate writing normalized data to a DuckDB-like store
6. Enrichment – compute BMI and simple risk scores
7. Analytics – show domain scores and enriched data summary

The V2 wizard is the **system of record** for the demo – all AI/agentic behavior in V3 will be layered on top of this deterministic flow, not replacing it.

## Data Flow (High Level)

- **Input:** synthetic CSV with columns for ID, demographics, diagnoses, medications, labs, procedures.
- **Internal state:**
  - `rawRecords` – parsed CSV rows
  - `translatedRecords` – JSON objects derived from CSV
  - `normalizedRecords` – standardized values (codes, units)
  - `qualityScores` – PIQI-like scores (0–100, per domain)
  - `enrichedData` – BMI and risk scores
  - `ndjson` – final NDJSON string generated from normalized records
- **Output:** downloadable NDJSON file (`pipeline-output.ndjson`).

## UX Summary

- Top rail: 7 step “train-track” indicator with current step highlighted.
- Middle: step content (forms, previews, results).
- Bottom bar: status + action buttons:
  - **Run Step**
  - **Run All Steps** (currently basic; not a fully robust orchestrator).

Each step shows a preview of the relevant data (e.g., ingested rows, translated JSON, normalized table) to keep the pipeline transparent.

## Mock Quality Scoring (V2)

- Scores are **completeness-based** (percentage of non-missing values) for domains:
  - Demographics, Vitals, Labs, Medications, Conditions, Procedures, Allergies, Immunizations.
- Scores are 0–100 and mapped to labels:
  - 90–100 – *Excellent*
  - 75–89 – *Good*
  - 50–74 – *Fair*
  - < 50 – *Poor*
- These are PIQI-like and for demo purposes only.

## NDJSON Export (V2)

- The **Persistence** step generates NDJSON from `normalizedRecords`:
  - `ndjson = normalizedRecords.map(JSON.stringify).join('\n')`
- A **Download NDJSON** button lets the user save the file (`pipeline-output.ndjson`).
- If there are no normalized records, the button is disabled and an explanatory message is shown.

## Known Gaps (to be addressed in V3)

- **Run All Steps**:
  - Not yet a fully robust step orchestrator (limited error handling, no clear per-step rollback / state machine).
- **No AI / agentic behavior**:
  - All error handling is deterministic and local to the client.
- **No persistent audit log**:
  - V2 does not yet track changes, overrides, or patches over time.
- **No backend service**:
  - All logic is in the frontend; no separate Node/Express layer yet.