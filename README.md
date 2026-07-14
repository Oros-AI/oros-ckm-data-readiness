# Oros CKM Data Readiness Infrastructure

A data readiness infrastructure for Cardio-Kidney-Metabolic (CKM) conditions — evaluating clinical and device data quality against use-case requirements, surfacing gaps, routing remediation to responsible actors, and gating analytics on validated data.

Built for a rural Colorado CKM pilot as part of the CMS rural health initiative. Designed as a governance-aligned open source asset.

---

## What This Does

Clinical sites contributing data to regional nodes (ACOs, HIEs, IDNs) often have data quality issues that block care coordination, risk stratification, and VBC reporting. This infrastructure:

1. **Scores** incoming data against a check registry (completeness, terminology, temporal coverage, patient linkage, derived metric concordance)
2. **Surfaces blockers** — which variables are failing, why, and which use cases are blocked
3. **Routes remediation** — AI-suggested patches for system-fixable issues, stakeholder work items for issues requiring external action
4. **Re-scores** after approved remediation — showing the iterative improvement arc
5. **Unlocks analytics** — HEDIS measures, VBC quality metrics, care coordination outputs — gated on validated data readiness

---

## Use Cases Supported

| Use Case | Status |
|----------|--------|
| Diabetes Risk Stratification | ✅ Active |
| Hypertension Risk Stratification | ✅ Active |
| Heart Failure Monitoring | ✅ Active |
| Care Coordination — Diabetes | ✅ Active |
| Care Coordination — HTN | ✅ Active |
| VBC Reporting — ACCESS CKM | ✅ Active |
| HEDIS CDC — Diabetes | ✅ Active |

---

## Architecture

### Four-Tier Data Model

```
Tier 1 — Raw Input         Original data, never modified
Tier 2 — Normalized        Companion NR fields, audit-safe
Tier 3 — Check Results     Scores, patches, work items
Tier 4 — Use-Case Ready    Fitness scores, OMOP CDM, FHIR R4
```

### Pipeline

```
Data Ingestion → Normalization → Scoring → Remediation → Analytics
```

### Agentic Layer (optional)

An AI-augmented remediation layer that can be toggled on/off without affecting the deterministic pipeline. Activated during site onboarding and novel issue triage. Off by default for routine processing. See `docs/Oros - CKM Data Readiness - Agentic Layer Architecture.md`.

---

## Repository Structure

```
oros-ckm-data-readiness/
├── docs/                          ← Architecture and specification documents
│   ├── archive/december-2025/     ← Original December 2025 design (preserved)
│   ├── Oros - CKM Data Readiness - Data Model.docx
│   ├── Oros - CKM Data Readiness - Technical Specification.docx
│   ├── Oros - CKM Data Readiness - Methodology Architecture.docx
│   ├── Oros - CKM Data Readiness - Synthetic Dataset Specification.docx
│   ├── Oros - CKM Data Readiness - Remediation Roles and Accountability.docx
│   ├── Oros - CKM Data Readiness - Baseline Methodology.docx
│   ├── Oros - CKM Data Readiness - Pilot Concept.docx
│   ├── Oros - CKM Data Readiness - Agentic Layer Architecture.md
│   └── Oros - CKM Data Readiness - Build Plan - Apr 2026.md
├── scripts/                       ← Data loading and session management
│   ├── load_dataset.js            ← Load Dataset A/B/C into Neon
│   ├── reset_session.js           ← Reset demo sessions
│   ├── sessions.md                ← Active session IDs
│   └── README.md
├── scoring/                       ← Scoring engine (Step 7 — in progress)
├── src/                           ← React UI (Step 8 — revision in progress)
└── LICENSE                        ← MIT License
```

---

## Synthetic Datasets

Three dataset states for the demo arc:

| Dataset | Description | Use Cases |
|---------|-------------|-----------|
| A — Clean | All checks pass | All READY — "what good looks like" |
| B — Buggy | 6 seeded bugs across EHR + device data | Multiple blocked — "where most sites are" |
| C — Remediated | Partial fix — some bugs resolved, some require external action | Iterative story — one pass doesn't fix everything |

Datasets live on OrosFast at `/Volumes/OrosFast/workspace/data/ckm-readiness/synthetic/`.

---

## Getting Started

### Prerequisites
- Node.js v18+
- psql (PostgreSQL client)
- Neon account with `ckm_readiness` database

### Database setup
```bash
# Run migrations V001–V009 against ckm_readiness
cd migrations/
for f in V001 V002 V003 V004 V005 V006 V007 V008 V009; do
  psql "$CKM_DIRECT" -f ${f}__*.sql
done
```

### Load data
```bash
cd scripts/
npm install
cp .env.example .env   # Add your Neon connection strings
npm run load:a         # Load Dataset A
```

### Run the UI
```bash
npm install
npm run dev
```

---

## Governance and Collaboration

This infrastructure is being developed as a governance-aligned open source asset. Key collaborators:

- **Hanieh Razzaghi (CHOP)** — clinical domain expert, scoring engine validation
- **Dan Connolly (Agoric/W3C)** — governance framework for trusted open source assets

The Colorado rural health pilot is intended as the first deployment under this governance framework, with a potential IRB through the University of Colorado Anschutz.

---

## License

Apache 2.0 — see `LICENSE` file.

Intended to become fully open source following initial funding and pilot deployment. See `docs/Oros - CKM Data Readiness - Pilot Concept.docx` for the open source strategy.

---

## Contact

Dominique Pahud — dom@oros.ai — Oros-AI
