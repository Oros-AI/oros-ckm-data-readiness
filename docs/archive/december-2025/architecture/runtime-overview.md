# Runtime Overview (Draft)

## 1. Purpose

This document explains how the Oros Data Quality Demo (v3) runs across three execution layers:

1. **Frontend Runtime (React/Vite)**
2. **Future Oros Backend Runtime (Node/Express)**
3. **Archia Runtime (Agentic AI Engine)**

It also describes how configuration flags (`AI_ENABLED`, `OROS_DATA_ENV`) shape runtime behavior in **demo mode**, **deterministic MVP mode**, and **future PHI-enabled AI mode**.

---

## 2. Frontend Runtime (Current State)

### 2.1 Technology
- **React + TypeScript**  
- **Vite** for development + bundling  
- **TailwindCSS** for UI  
- Browser executes the entire pipeline **client-side** today:
  - ingestion  
  - translation  
  - normalization  
  - scoring  
  - enrichment  
  - analytics  
  - optional agentic UI components (drawer, insights)

No backend is required for the demo.

---

## 3. Configuration Flags (Cross-Cutting)

### 3.1 `AI_ENABLED`
Controls **all agentic behavior**.

- `false` → deterministic-only pipeline  
- `true` → agentic UI shell active (drawer), Archia calls allowed

### 3.2 `OROS_DATA_ENV`
Controls **data sensitivity mode**.

- `demo` → synthetic-only data, permissive logging  
- `prod` → real HIE data, deterministic-only (AI disabled)  
- `phi_ai` (future) → real data with backend-mediated Archia calls

### 3.3 `.env.local` (frontend only)
Used during development:

```
VITE_AI_ENABLED=true
VITE_OROS_DATA_ENV=demo
```

---

## 4. Future Oros Backend Runtime (MVP → PHI Mode)

The backend will be a **Node/Express** service that sits between:

- **Frontend** (React)
- **Database** (Postgres / Neon)
- **Archia Runtime**

### Responsibilities (MVP)
- Accept pipeline events from frontend  
- Persist records into Postgres  
- Enforce deterministic-only flow  
- Handle authentication + API keys  

### Additional Responsibilities (PHI AI Mode)
- Filter/de-identify requests before calling Archia  
- Mediate *all* AI-related calls  
- Log:
  - request payload summaries  
  - Archia responses  
  - user decisions (accept/reject patches)  
- Produce full audit logs  

This separation ensures PHI is handled correctly and keeps Archia optional.

---

## 5. Archia Runtime Overview

The Archia Runtime is an **AI agent orchestration layer** that:

- Interprets tasks  
- Uses MCP tools  
- Makes LLM calls  
- Returns structured results or messages  

### Demo Mode Behavior
- All data synthetic  
- Responses can be fully logged to the database  
- Direct frontend → Archia calls are acceptable

### PHI MVP Behavior
- **No PHI sent to Archia**  
- Agentic features disabled via:
  - `AI_ENABLED=false`
  - `OROS_ARCHIA_MODE=synthetic_only`

### PHI AI Future Behavior
- Backend mediates all PHI exposure  
- Strict schemas enforced  
- Audit logs required  

---

## 6. Full Runtime Flow (By Mode)

### 6.1 Demo Mode (Now)
**Browser → Vite → Pipeline → Neon Postgres**  
Optional: **Browser → Archia Runtime**

Everything stays in demo/synthetic space.

### 6.2 Deterministic MVP Mode (HIE Data)
**Browser → Backend → Postgres**

- Archia is off
- Backend enforces PHI protections
- Deterministic-only pipeline is used

### 6.3 PHI AI Mode (Future)
**Browser → Backend → Postgres → Backend → Archia Runtime**  

Backend filters PHI before sending portions to Archia.

---

## 7. Summary Table

| Mode | AI | Backend Required | DB | PHI Allowed to Archia | Notes |
|------|----|------------------|----|-------------------------|-------|
| Demo (Now) | ✔️ | ❌ | Neon | ✔️ synthetic only | Direct calls OK |
| MVP | ❌ | ✔️ | Postgres | ❌ | Deterministic only |
| PHI AI | ✔️ | ✔️ | Postgres | Limited, backend-filtered | Audit required |

---

## 8. Placement in Docs

This file belongs under:

```
docs/
  architecture/
    runtime-overview.md   ← this file
```

This ensures consistency with:

- `persistence-strategy.md`
- `02-v3-architecture.md`
- `archia-integration.md`

