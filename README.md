# Oros CKM Data Readiness Infrastructure

A deterministic data quality scoring and remediation engine for clinical data readiness, built for Cardio-Kidney-Metabolic (CKM) conditions. The engine evaluates whether a patient population's data is fit for purpose for each clinical use case (risk stratification, care coordination, value-based care reporting), surfaces the specific checks that block readiness, and routes remediation work items to the roles that can act on them. It is a multi-state proof of concept targeting Kansas, Montana, and Colorado.

## Architecture

**Four-tier data model.** Raw data is never modified after load.

```
Tier 1  Raw Input          Original data, append-only after load
Tier 2  Normalized         Companion normalized fields, audit-safe
Tier 3  Check Results      Scores, patches, remediation work items
Tier 4  Use-Case Ready     Fitness scores and readiness statuses
```

**The arc.**

```
Load -> Normalize -> Score -> Surface Blockers -> Remediate -> Re-score -> Unlock Analytics
```

**Condition-blind engine, condition modules as configuration.** All thresholds, weights, variables, pathways, and remediation defaults live in condition module configuration files under `conditions/`. The engine contains no condition-specific logic; conditions are defined as configuration modules. The diabetes module is the first full implementation of this contract. The scoring engine is fully deterministic and runs without any AI.

## What is real today

This is a demo, not a product. The labels below follow the project's three-state vocabulary.

**Implemented**

- Deterministic scoring engine: five stages (checks, variable aggregation, pathway evaluation, use-case readiness, work-item generation) across 13 checks
- Three synthetic demo sessions: A (clean baseline), B (seeded data defects), C (after one remediation pass)
- Demo UI: use-case readiness front door, under-the-hood pipeline view, remediation drawer with real human approve/reject
- Diabetes condition module (full configuration)

**Demonstrated as stub**

- Scripted remediation recommendations, pre-authored and keyed to the seeded defects
- Hypertension risk stratification, care coordination, and VBC reporting use cases (boolean aggregation stubs)

**Architectural**

- Live AI-generated recommendations behind the `AGENT_MODE` flag
- Live database reads behind the `DATA_SOURCE` flag
- Additional condition modules

All data in this repository is synthetic. It contains no PHI. It is not a medical device and not production software.

## Running it

```bash
npm install
npm run dev        # fixtures mode is the default; the demo runs entirely from fixtures checked into the repo
npm run test:run   # test suite
```

Engine scripts exist under `scoring/` but require a database; they are not needed to run the demo.

## Documentation

| Document (in `docs/`) | Purpose |
|-----------------------|---------|
| `Oros - CKM Data Readiness - Data Model.md` | Full schema for the 21-table database |
| `Oros - CKM Data Readiness - Condition Module Schema.md` | Condition module configuration contract and engine behavior |
| `Oros - CKM Data Readiness - Technical Specification.docx` | Check registry, scoring formulas, priority weights |
| `Oros - CKM Data Readiness - Synthetic Dataset Specification.docx` | CSV schemas and patient cohort mapping |
| `Oros - CKM Data Readiness - Dataset B Bug Reconciliation.md` | Seeded defect targets and remediation outcomes |
| `Oros - CKM Data Readiness - Device Data Model and Readiness Extension.docx` | Device check registry and field definitions for CGM, BP, and scale data |
| `Oros - CKM Data Readiness - Signal and Data Elements Table.docx` | Clinical signals the clean dataset should produce |
| `Oros - CKM Data Readiness - V010 Migration Spec.md` | Migration specification for the condition module tables |
| `Oros - CKM Data Readiness - Agentic Drawer Spec Decision.md` | Remediation drawer behavior: scripted-first with a switchable source |

## License

Apache 2.0. See [LICENSE](LICENSE).

Copyright 2025-2026 Oros AI LLC

This repository was previously licensed under the MIT License and was relicensed to Apache 2.0 by its owner in July 2026.

Contribution process and CLA are being finalized; please open an issue before submitting substantial pull requests.
