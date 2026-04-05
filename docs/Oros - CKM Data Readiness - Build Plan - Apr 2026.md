# Oros - CKM Data Readiness - Build Plan - Apr 2026

**Project:** Oros CKM Data Readiness Infrastructure  
**Status:** Active build — persistence layer complete, scoring engine next  
**Last updated:** 2026-04-05

---

## Core Objective

Build a data readiness infrastructure POC that demonstrates:

```
Load Data → Normalize → Score → Surface Blockers → 
Remediate → Re-score → Unlock Analytics
```

---

## Strategic Context

### Initial Deployment — Rural Colorado CKM Pilot
The POC supports a CKM Data Readiness Infrastructure pilot in rural Colorado as part of the CMS rural health initiative. Target partners include regional HIEs, ACOs, IDNs, FQHCs, and academic collaborators including the University of Colorado Anschutz School of Medicine.

### Designed for Global Reuse
The infrastructure is architected for reuse across clinical settings, regions, and health systems — nationally and internationally. Rural Colorado is the first deployment context. The same infrastructure is applicable wherever CKM data readiness gaps exist, including other rural health initiatives across the United States and eventually internationally. The goal is trusted open source assets optimized for reuse, with fair value attribution and governance controls.

### Oros IP and Stewardship Model
Oros develops and maintains the core CKM Data Readiness Infrastructure as shared open infrastructure. The following principles govern all collaborations and deployments:

- **Oros stewardship:** Oros owns and maintains the core infrastructure. No single collaborating institution owns or controls the core assets.
- **Open licensing:** Core infrastructure is released under MIT license. Reuse is unrestricted.
- **Attribution:** Contributors receive attribution in proportion to their contribution. See `Oros_ATTRIBUTION.md`.
- **No exclusivity:** No institution may claim exclusive rights over generalized infrastructure components, regardless of funding contribution.
- **Boundary clarity:** Local adaptations belong to those institutions. Generalized components developed in the course of those adaptations are contributed back to the core under the same open license.

These conditions apply to all institutional collaborators. Oros will not contribute its IP to arrangements that violate these principles.

---

## Current Build State (April 2026)

### Completed
- ✅ GitHub repo: `Oros-AI/oros-ckm-data-readiness`, branch `ckm-poc-build`
- ✅ Neon database: `ckm_readiness` — 18 tables, 34 FK constraints, all indexes
- ✅ Four-tier schema: Raw → Normalized → Check Results/Patches → Use-Case Ready
- ✅ Data loading scripts built and verified
- ✅ All three datasets loaded: A (clean), B (buggy), C (remediated)
- ✅ Core documentation updated and committed

### Next Steps
1. **Step 7:** Scoring engine — `scoring/` folder, config-driven thresholds
2. **Step 8:** UI/UX revamp — preserve drawer pattern, remap to CKM architecture
3. **Step 9:** Agentic layer — Claude API POC, pluggable harness interface
4. **Step 10:** Vercel deployment

---

## Scoring Engine Design

Config-driven architecture separates engine logic from clinical thresholds:

```
scoring/
├── engine.js           ← runs checks, writes to Neon
├── checks.config.json  ← thresholds and weights (editable by clinical collaborators)
└── README.md
```

Clinical collaborators (e.g. Hanieh Razzaghi, CHOP) update `checks.config.json` without touching engine code.

---

## Agentic Layer

Optional — deterministic pipeline works without it. See `Oros - CKM Data Readiness - Agentic Layer Architecture.md`.

---

## Design Principles

- Progressive disclosure, actionable outputs, clear capability unlock
- Deterministic first — AI augments, never replaces
- Human approval required for all AI-suggested changes
- Full audit trail: raw record → patch → re-scored output
- Reuse-optimized — not locked to a single deployment context

---

## Collaborators

| Person | Organization | Role |
|--------|-------------|------|
| Dominique Pahud | Oros | Lead architect, product, fundraising |
| Hanieh Razzaghi | CHOP / UPenn | Clinical domain expert, scoring validation |
| Michelle Knopp | Primary Care / Clinical Informatics | Clinical workflow (in discussion) |
| Lisa Schilling | University of Colorado Anschutz | Population health, regional implementation (in discussion) |
| Kris Kowal | Endo / Agoric | Safe AI execution, governance (in discussion) |
| Chime Ogbuji | Independent | Local LLM — Qwen 3 terminology-trained (in discussion) |
| Gharib Gharibi / Andrew Rademacher | Archia | Agentic orchestration (terms TBD) |

See `Oros_ATTRIBUTION.md` for the living attribution record.
