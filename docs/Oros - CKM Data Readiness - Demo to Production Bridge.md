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

---

## Fixture-export window — production ledger (2026-07-12)

Seven items parked during the fixture-export build (fx-1/fx-2). Each is a real production design surface deliberately NOT built into the POC; the demo ships the simplest defensible version and this ledger records what the funded phase owes.

**1. Site-scoped remediation routing configuration.** The POC routes each phenotype to one responsible role from the condition-module config — a single baseline. In production, routing encodes *local alignment*: who does what, and who is paid to do it, varies by site, program, and contract. Routing becomes a site-scoped configuration layer over the condition baseline, owned by the local team the way criteria already are.

**2. `recommendationType` as local configuration.** The demo carries a fixed taxonomy (which blockers are AI-assistable) in the authored content map. Whether a phenotype is AI-assistable is itself part of the local alignment — a site with a terminology service under contract may auto-fix codes a smaller site routes to its vendor. Production moves the taxonomy from authored constant to site-scoped configuration, subject to the same human-approval discipline.

**3. Evidence/context presentation iteration.** The opt-in `{evidenceExample}` interpolation is v0.1 "color" — one rendered example per blocker. What context a report reviewer or a routed actor actually needs (how many examples, which fields, what drill-down) is a post-POC design surface, driven by field feedback from the people who receive the reports and the work items, not by engineering preference.

**4. Phenotype catalog as standardized shared vocabulary.** Ratified principle: phenotype strings are a standardized catalog at the same governance tier as the seven canonical responsible-role strings. Routing varies locally; vocabulary does not. A shared catalog is the prerequisite for cross-site benchmarking — "Identity Linkage Failure" must mean the same thing at every deployment or the aggregate view is noise. (First cleanup already parked: the two date-concordance phenotype strings differ and should converge to one catalog entry.)

**5. Site-level readiness bands per reporting program.** The demo's uniform display band (READY 1.0 / PARTIALLY_READY ≥ 0.85 of population READY) is a display convention. In production, site-level readiness for reporting use cases is a *program-defined criterion* — each program and contract states what fraction of the population must be reportable, per measure. Bands become per-program configuration with provenance, replacing the uniform display constant.

**6. Multi-program mechanism.** Generalize on the rule of two: a program registry (site → participating programs), shared element definitions with program-referenced thresholds, and threshold provenance (which program demanded which value). This includes check execution cadence as configuration — always-on vs sampled vs event-triggered — e.g. TIR recomputation runs as an audit-cadence control under a reporting program rather than a continuous operational criterion.

**7. Program-spec intake and incorporation process.** Onboarding a real program (HEDIS measurement year, a state VBC contract) needs a repeatable process: an intake document per program, a mapping exercise against the condition-module config schema, and findings routed to their owners — Bridge items, vocabulary catalog entries, or parked threshold questions. The first real program in the funded phase is the ideal stress-test of the config schema's claimed generality.
