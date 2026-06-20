# CKM Data Readiness — Demo-to-Production Bridge / Gap Analysis

**Purpose:** Connective tissue between the June 25 demo (a working *slice*) and the production
system described in the locked CKM docs (the *target*). For every capability and component it
answers three questions: what the demo shows, what production requires, and what the gap costs.
The cost/gap columns feed SOWs and grant scopes in the dedicated budget project.

**Status:** SKELETON — structure locked, body to be filled after the Hanieh methodology
session (Thursday) and as reactions come in from the 24th/26th sessions.

**Companion documents:** CKM Demo UX Decisions Log (demo design); locked CKM canonical docs
(Architecture Spec v1.2, Condition Module Schema v0.1, Data Model, Synthetic Dataset Spec,
Remediation Roles & Accountability, June 25 POC Scope Lock).

**Reality-check framing:** This document is a reality check, not a sales doc. Its job is to
surface what production actually requires — including blind spots — so the budget is complete
and credible rather than guessed. The demo's reaction-gathering (HIE, payer, NCQA, state,
clinical) is a primary input: reactions become requirements become line items.

---

## 1. Framing & method

- The demo proves a slice; this maps the slice to the whole and sizes the rest.
- Organizing lens: the three-state vocabulary —
  **Implemented** (runs for real now) /
  **Demonstrated** (shown working on a slice; lighter logic) /
  **Architectural** (designed, not yet executing).
- Each row below moves something from its demo state toward production-grade.

*(To fill: 1 paragraph stating scope of this analysis and how to read the tables.)*

---

## 2. Capability & component gap table (CORE)

For each row: **Demo state** (June 25) · **Production requirement** (from locked docs) ·
**Gap** (the delta) · **Effort / cost driver** (roles, infra, time to close).

| Area | Demo state (June 25) | Production requirement | Gap | Effort / cost driver |
|------|----------------------|------------------------|-----|----------------------|
| Diabetes risk stratification | _Implemented (slice; coverage-based readiness)_ | _TBD_ | _TBD_ | _TBD_ |
| Care coordination | _Demonstrated (stub)_ | _TBD_ | _TBD_ | _TBD_ |
| Clinical quality + VBC reporting | _Demonstrated (stub)_ | _TBD_ | _TBD_ | _TBD_ |
| Hypertension / heart failure / other CKM conditions | _Architectural (one config away)_ | _TBD_ | _TBD_ | _TBD_ |
| Multi-condition / whole-patient prioritization | _Vision (overlap cohort hook in data)_ | _TBD_ | _TBD_ | _TBD_ |
| Scoring engine | _Implemented (Step 7; precomputed or live re-score)_ | _TBD_ | _TBD_ | _TBD_ |
| Data ingestion | _Synthetic, preloaded; no live ingestion_ | _Real HL7 v2 feeds; consent; identity_ | _TBD_ | _TBD_ |
| Agentic remediation layer | _Conditional; real Claude call or canned (Step 9)_ | _TBD_ | _TBD_ | _TBD_ |
| Remediation routing / work items | _Demonstrated (real routing data)_ | _TBD_ | _TBD_ | _TBD_ |
| Benchmarking / peer ranking | _Vision (can't fake off 3 synthetic orgs)_ | _TBD_ | _TBD_ | _TBD_ |

*(Add rows as needed. Keep "Demo state" honest to the three-state vocabulary.)*

---

## 3. Infrastructure gap (the big-dollar item)

- **Demo:** Neon + Vercel, synthetic data, no security posture.
- **Production:** multi-tenant secure **bridge infrastructure** — ingests data (HL7 v2),
  runs readiness, lets HIEs / state-designated orgs use modules and push patient data under
  consent to a designated permanent host. ~3-year time-boxed deployment, **SOC 2 (possibly
  HITRUST)**, extensible via state funding. Temporary scaffold → eventual handoff of selected
  modules/workflows to permanent state/HIE/research hosts.
- **This is where Sngular's ~$1M+/site estimate lives** and where the cost-appreciation
  argument gets its receipts.

*(To fill: itemize infra components, security/compliance work, consent + identity handling,
multi-tenancy, the bridge→permanent-host handoff, hosting/ops. Each becomes a cost driver.)*

---

## 4. Methodology gap (fill after Hanieh — Thursday)

What must be locked before production. Populated by the Hanieh session:
1. Coverage-based readiness threshold(s) per use case (working floor ~60%).
2. "Fit for purpose" definition per use case (patient-level variable set + quality bar).
3. Risk stratification: enrollment and identification are the upstream human clinical decision (Moment 1); the platform's contribution (Moment 2) is making data fit to feed the established stratification review (e.g., a TIDE-style dashboard used by population-health and data-aggregation vendors). Resolved: a human is always in the loop, and stratification criteria are out of scope and already established (the platform makes data fit, it does not invent or perform stratification de novo). No open stratification-threshold question to defer. [Note: Hanieh Razzaghi's expertise is data-quality frameworks and knowledge engineering, not clinical practice; frame methodology questions to her as DQ scoring and remediation-workflow questions, not clinical-threshold questions.]
4. Sequencing: risk stratification before care coordination (confirm).
5. Threshold/weight placeholders → production values.
6. Bug 6 / derived-metric governance framing (NCQA).
7. Blast-radius weighting (systemic vs. isolated issue prioritization).
8. Benchmark comparison basis (institution size / population / region / condition mix).

*(To fill: Hanieh's answers → each becomes a methodology requirement and possibly a work item.)*

---

## 5. Governance gap

- **Endo across the whole stack** (deterministic + agentic) as safety/governance substrate —
  capability enforcement is a *requirement*, Endo the leading candidate; named as principle/vision
  now (Scope Lock: future-state, not built, not committed for June 25); built later. Endo
  relationship runs through Dan Connolly.
- **Trusted open-source software governance project** (Dan Connolly-led, parallel to CKM; CKM
  is its first manifestation). Its own boundary — name + plant the flag in the demo, do not
  present the project itself.
- **Apache 2.0 stewardship in practice:** Oros owns/maintains core; no institutional
  exclusivity; attribution runs to the individual (institutional affiliation for context);
  local adaptations belong to institutions, generalized components contributed back. Licensing/
  IP terms are owned by the Collaboration Framework (canonical docs reconciled to Apache 2.0 on
  2026-06-15).

*(To fill: what governance artifacts/processes production requires; what Endo integration
entails; how the governance project and CKM scopes relate for funding.)*

---

## 6. Sequencing & dependencies

- Deterministic foundation exists first; everything builds on it (AI augments, never the basis).
- Map what unlocks what, so SOWs can be **phased**, not one monolithic ask.

*(To fill: dependency ordering; which phase each gap belongs to; what a minimum first
deployment needs vs. what's later.)*

---

## 7. Cost / scope summary (feeds the budget project)

- Roll-up of cost drivers from §§2–5, organized so a phase can be presented to a specific
  funder (Helmsley / NCQA-aligned / state rural health / payer).
- Phased so each ask is credible and self-contained.

*(To fill in the dedicated budget project; this section is the handoff point. Keep this doc as
the requirements spine; the budget project does the costing.)*

---

## Open inputs needed before full draft

- Hanieh methodology answers (Thursday) → §4, parts of §2.
- Reactions from the 24th (HIE) and 26th (payer) → requirements across §§2–3.
- Sngular infra detail → §3 cost drivers.
- Confirmation of collaborator engagements (Dan Connolly — governance + capability enforcement,
  the Endo connection; Sngular — secure infra/DevOps partner; both currently "in discussion")
  → §5 framing as intent vs. committed.
