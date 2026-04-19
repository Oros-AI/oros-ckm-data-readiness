# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CKM Data Readiness — a data quality infrastructure for Cardio-Kidney-Metabolic conditions in a rural Colorado pilot (CMS rural health initiative). Scores clinical/device data against a check registry, surfaces blockers, routes remediation, and gates analytics on validated data.

## Core Constraints
- **Raw data is NEVER modified.** All writes go to Tier 2–4 tables only.
  Tier 1 tables are append-only after load.
- **check_results.check_name must use FULL check name format** — e.g.
  `device_temporal_density_cgm_14d`, `device_patient_linkage_cgm`,
  `layer1_notnull_fields_smoking`. Short names are registry references only.
  Full names are the join key downstream. Never store a short name in the DB.
- **CKM_DIRECT** is exported in ~/.zshrc on Studio. Never hardcode credentials.
  Scripts and scoring engine both read it from the environment.

## Active Demo Sessions
| Dataset | Session ID |
|---------|-----------|
| A (clean)      | 929ce033-41e7-4516-b70c-240e07257f8d |
| B (buggy)      | a40afd78-0ded-4481-8a7d-04811f4f28ed |
| C (remediated) | 44ce72be-0629-47ba-bde0-dc52c854536d |

## Scoring Engine (Step 7 — in progress)
- Location: `scoring/` in repo root (separate Node ESM package, no build step)
- Entry: `node scoring/index.js <session_id>` or `npm run score:a/b/c`
- Each check module exports `runCheck(client, sessionId) → CheckResultRow[]`
- writer.js is idempotent: DELETE + INSERT per check+session on every run
- Add new checks to the CHECKS registry in `scoring/index.js`

## Commands

### Frontend (React + Vite + TypeScript + Tailwind)
```bash
npm install          # install dependencies
npm run dev          # dev server at localhost:5173
npm run build        # tsc && vite build
```

### Data Scripts (scripts/ directory — separate package)
```bash
cd scripts && npm install   # one-time setup
# copy .env.example → .env with Neon connection strings
npm run load:a              # load Dataset A (clean)
npm run load:b              # load Dataset B (buggy — 6 seeded bugs)
npm run load:c              # load Dataset C (partially remediated)
npm run reset -- --session <uuid>   # reset one demo session
npm run reset:all                   # reset all sessions
```

### Database Migrations
```bash
# Run V001–V009 against ckm_readiness via psql
cd migrations/
for f in V001 V002 V003 V004 V005 V006 V007 V008 V009; do
  psql "$CKM_DIRECT" -f ${f}__*.sql
done
```

## Architecture

### Two Codebases in One Repo
- **`src/`** — React UI (Vite, TypeScript, Tailwind). A 7-step pipeline wizard for data readiness.
- **`scripts/`** — Node.js data loading scripts with their own `package.json`. Connect to Neon PostgreSQL. Load synthetic datasets A/B/C and manage demo sessions.

### Pipeline Steps (7-step wizard)
Ingestion → Translation → Normalization → Data Quality Scoring → Persistence → Enrichment → Analytics

Each step is a React component in `src/steps/` and corresponds to a method on the `PipelineEngine` interface (`src/engine/PipelineEngine.ts`). The deterministic implementation is in `src/engine/DeterministicPipelineEngine.ts`.

### Key Patterns
- **Path alias**: `@/` maps to `src/` (configured in both `vite.config.ts` and `tsconfig.json`)
- **AI toggle**: `VITE_AI_ENABLED=true` in `.env.local` enables the agentic layer (AgentInsightsDrawer, AI-suggested patches). Off by default — pipeline runs deterministically.
- **State management**: Plain React state in `App.tsx` via `WizardState` (`src/state/wizardState.ts`). No external state library.
- **Engine abstraction**: `PipelineEngine` interface allows swapping deterministic vs AI-enhanced engines. App uses `DeterministicPipelineEngine` via `useMemo`.

### Four-Tier Data Model (Database)
- Tier 1 — Raw Input (never modified)
- Tier 2 — Normalized (companion NR fields, audit-safe)
- Tier 3 — Check Results (scores, patches, work items)
- Tier 4 — Use-Case Ready (fitness scores, OMOP CDM, FHIR R4)

### Synthetic Datasets
Three dataset states for the demo arc, stored at `/Volumes/OrosFast/workspace/data/ckm-readiness/synthetic/`:
- **A** — Clean (all checks pass)
- **B** — Buggy (6 seeded bugs across EHR + device data)
- **C** — Remediated (partial fix, some bugs require external action)

### FK-Safe Load Order
`patients → providers → encounters → conditions → medications → observations → cgm_readings → cgm_window_metadata → bp_readings → weight_readings`

## Environment Variables
- Frontend: `.env.local` (VITE_-prefixed vars). See `.env.example`.
- Scripts: `scripts/.env` (Postgres/Neon connection strings). See `.env.backend.example`.

## Domain Context
- Medical terminology systems: ICD-10 (diagnoses), RxNorm (medications), LOINC (labs), SNOMED-CT (procedures)
- Use cases: diabetes/HTN risk stratification, heart failure monitoring, care coordination, VBC reporting, HEDIS measures
- Governance collaborators: CHOP (clinical validation), Agoric/W3C (governance framework), Endo (safe AI execution)
