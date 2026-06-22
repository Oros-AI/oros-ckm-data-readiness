# Oros - CKM Data Readiness - Demo UI/UX Specification

**Status:** Locked (reviewed and approved June 2026). The build proceeds per the §17 increments, foundations first.
**Date:** June 2026
**Scope:** The user-facing demo (`src/`) — the Step 8 UI/UX revamp. This document is the architectural contract a later build session executes against.
**Relationship to other docs:**
- Implements the **June 25 POC Scope Lock** (Diabetes-first, CKM infrastructure visible, six-bug arc, three-state vocabulary) and the **June Build Plan** Step 8.
- Is governed by the **Durable Demo Rules** in `CLAUDE.md` §1.6 and the **Strategic Decisions Extract** (identity, partner treatment, license framing).
- Implements the **Agentic Drawer Spec Decision** for the drawer.
- Treats the engine output tables in `CLAUDE.md` §9 and the **Condition Module Schema** as the source-of-truth data contract the UI renders.
- The deferred visual-finish layer is governed by the external **Visual Direction brief** (not in this repo's `docs/`); see §14. Where this spec and a June demo doc disagree about demo-facing behavior, the June doc wins and the difference is a gap to escalate, not to silently resolve.

---

## 0. How to read this document (and who it is for)

This spec is written to be **legible to a non-technical founder-bridge** — the person who owns the product intent and is the bridge between the strategy docs and the engineering team that will do the full build. So it explains the **why** behind each architectural choice, not only the **what**. If you read it start to finish, it should *teach you the architecture* well enough that you can defend each decision to an engineer and catch it if a later build drifts.

Two reading paths:

- **If you are the founder-bridge:** read §1–§5 (intent and the two views), §6 (the arc), §7 (the one idea everything depends on — the data-driven contract), then the rationale boxes (marked **Why this matters**) throughout. Skim the TypeScript blocks; you don't need to read code, but the field names are the vocabulary the engineering team will use, so the surrounding prose names them in plain language.
- **If you are an engineer:** §7–§16 are the contract. §17 is the build order. The TypeScript interfaces are normative — they mirror the engine output tables in `CLAUDE.md` §9, and the UI must not invent shapes the engine doesn't emit.

**A note on vocabulary discipline.** This is a demo, not a product. Three rules from `CLAUDE.md` §1.6 recur so often they are worth stating once here and not repeating at every turn: (1) the deterministic pipeline is the source of truth and the UI **renders** its output, it does not compute outcomes; (2) every capability on screen is honestly labeled **Implemented / Demonstrated-stub / Architectural**; (3) reset **re-points** to a clean pre-computed session, it does not recompute on stage. If anything below ever seems to contradict these, the rules win.

---

## 1. What the demo must accomplish (the spine)

The demo answers one question, for one population, across three data states:

> **Can the available data for this population support a specific operational capability — and if not, what specifically must change, who fixes it, and what unlocks when they do?**

The specific use case (Diabetes Risk Stratification) is the **lens**; the **operational unlock** is the point. The platform determines whether a population's data can support a capability **under criteria a local team owns**, identifies what blocks it, routes each blocker to the responsible role, and shows what becomes possible once the data is ready.

Concretely, the demo:

- **Leads with the use-case / remediation view** as the default front door — capabilities, each with a readiness state and its blockers — with the **data-pipeline / under-the-hood view demoted to an optional toggle** that proves the front door is not a black box.
- Runs the **A→B→C readiness arc** with the **six-bug remediation-and-routing story** (three device, three EHR). Each blocker shows **four facts**: what failed / which capability is blocked / who is responsible / what unlocks after remediation.
- Carries the **agentic drawer** per the Agentic Drawer Spec Decision (scripted-first, real approve/reject, conditional on the deterministic path, no Archia attribution).
- Is **presentable with zero additional stakeholder feedback** — where the docs are silent, this spec makes and states a best assumption rather than blocking.

### Why this matters
The old demo (the current `src/`) leads with the *plumbing* — a seven-step data-quality pipeline. A funder watching it sees machinery, not an unlock. Inverting the lead view is the single most important change in this spec: the audience should first see **"here are the operational capabilities, here is what each needs, here is the gap and who closes it,"** and only *then*, if they want proof, open the pipeline that produced those judgments. The pipeline is the receipt, not the headline.

---

## 2. The two views and the audience-driven lead-view toggle

The demo is built around **two views over the same engine output**, not two apps.

### 2.1 Use-Case / Remediation view — the default front door (for everyone)

The lead view for **every audience** (Funder, NCQA, ACO, Clinician, Admin). It shows the operational capabilities as cards, each carrying:

- a **readiness state** (READY / PARTIALLY_READY / NOT_READY) rendered in the functional readiness colors (§14);
- an honest **implementation-state label** (Implemented / Demonstrated-stub / Architectural, §12);
- its **blockers** when not ready — each blocker expandable to the four-facts panel (§6.3);
- what **unlocks** when the blockers clear (visible by comparing the B and C states).

### 2.2 Pipeline / under-the-hood view — the demoted toggle (proof, not headline)

A **curated readiness arc** — not the old generic platform-step list — reframed from the wizard. It exists to **prove the front door isn't a black box**: a skeptical informatics viewer can open it and see the same engine output expressed as readiness stages, check results, and **record-level detail**. It is reached by a toggle from the front door; it is **not** the default for any general audience.

**The steps (plain-language named, following the `assess → report → respond` structure now canonical in the Methodology Architecture — reference it; this spec does not restate the methodology):**

| Step | Activity | AI-assist |
|---|---|---|
| **Ingest** | Receive the feed from the source/adapter as-is (immutable raw tier). | no |
| **Parse** | Convert the raw feed into a workable structured representation **and** assess structural/conformance readiness (HL7v2 / USCDI v3, parseability). Emits **Foundational**-readiness structural blockers routed to the source feed owner. | no (deterministic; specialized parsing is a future consideration only) |
| **Normalize** | Standardize terminology (codes → ICD-10 / RxNorm / LOINC / SNOMED-CT) and format / units / dates to normalized-reference fields. | **yes** (terminology mapping; ambiguous-case normalization) |
| **Score** | Run the checks; evaluate fit-for-purpose per use case (completeness, validity, plausibility, recency, sufficiency, device checks, eligibility), producing the readiness verdict and blockers. The deterministic source of truth. | **no — the deterministic core** |
| **Readiness Report** | Deliver the verdict and blockers in audience-tailored, actionable form (the four-facts treatment per blocker). This is the step where scoring results become usable insight for the person who must act, parameterized by the `audience_type` mechanism. June shows the **default delivery** (one view for all audiences); full per-audience tailoring is deferred but strategically central, not minor polish. Both **Foundational** and **Fit-for-purpose** blockers appear here together. | no |
| **Remediate** | AI-suggested fixes for AI-fixable blockers (the agentic drawer, §10) and routing for the rest. | **yes** (the recommendation drawer) |
| **Re-score → Unlock** | Re-score after remediation (B→C) and show what unlocks. | no |

**Omitted on purpose:** Persistence (automated by the database; not a readiness concept), Enrichment (downstream, not a readiness concern), and standalone Analytics (it is the **Unlock** outcome, not a step).

**AI-assist appears at exactly two steps — Normalize and Remediate.** Parse is noted as a future specialized-model candidate but is **not** AI-assisted now. The deterministic **Score** step is the clearly-labeled, unshakeable source of truth. Credibility comes from AI appearing **only where it genuinely assists** — do not over-mark AI.

**Record-level drill-down (Change 1).** The pipeline view drills from the population summary to **record-level detail**: for a selected failing check it renders the specific failing records using the per-record types the §7 contract already defines (`CheckResultView`: `patientId`, `checkName`, `variableName`, `status`, `observedValue`, `threshold`; optionally `PatientUseCaseRow`). This is the granular sufficiency evidence a technical/informatics audience (e.g. LACIE) opens the pipeline view to see. **The front-door view stays population-level; record-level detail lives only under the hood.** No contract change is needed — the per-record types already exist and are optional in the fixture; this section specifies that the **pipeline view consumes them**, and that the **Dataset B fixture must include per-record `CheckResultView` rows for failing checks** (it may omit them for passing checks to stay lean).

*Optional richness — fast-follow, not required for first build.* For bugs that remediate in session C, the record-level detail may show **before/after**: the untouched raw value, the remediated value (a separate field already in the C fixture, never overwriting raw), and provenance (remediated via human-in-the-loop approval; source). Because A/B/C are pre-computed, this displays the remediated state the C fixture already represents — no live write — preserving raw-untouched and reset-re-points.

### 2.3 Lead-view configuration (audience exception)

- **Default:** use-case view leads, for all audiences.
- **Configurable exception:** a **technical / informatics audience** (e.g. an HIE such as LACIE) may lead with the pipeline view. This is a **single configurable lead-view flag**, not a separately built audience app.
- **Full per-audience differentiation is explicit fast-follow** — out of initial build scope. The `demo_sessions.audience_type` field already exists in the data model and supports NCQA / ACO / Clinician / Admin / Funder; the spec reserves it for that later differentiation and does not build it now.

### 2.4 The two-phase readiness framing

Readiness is assessed in **two phases** (the Methodology Architecture owns this framing; reference it, do not restate the methodology here):

- **Foundational readiness — use-case-independent.** Structural conformance (**Parse**) and terminology / format standardization (**Normalize**). It must hold *regardless of which use case is asked*. The **pipeline view** reports Foundational readiness, per stage.
- **Fit-for-purpose readiness — use-case-dependent.** **Score**, assessed *per use case*. The **front door** reports Fit-for-purpose readiness, per capability.

Refer to the phases primarily **by name** (Foundational / Fit-for-purpose), using "(Phase 1)/(Phase 2)" only as a secondary parenthetical.

**Bug 4 is the bridge case:** a Foundational terminology-validity failure that **cascades into Fit-for-purpose consequences** — visible at **Normalize** (the standardization failed) *and* at the use case it blocks (Care Coordination). It is the clearest illustration of why the two phases are one continuous readiness story, not two separate checks.

### Why this matters
"Two views over one engine output" is a discipline, not a convenience. If the two views were two codebases each with their own data, they would drift, and the pipeline view would stop being honest proof of the front-door numbers. Because both render the **same fixture** (§8), the under-the-hood view is *necessarily* consistent with the headline — it is literally the same data shown at a different altitude. The two-phase framing makes that altitude difference meaningful: the front door answers *"is the data fit for this purpose?"* and the pipeline view answers *"is the data foundationally sound, and where exactly does it break?"* That consistency, across two altitudes, is the credibility.

---

## 3. The overriding architectural principle: data-driven, not assumption-driven

Everything in this spec serves one principle: **the UI renders whatever the engine emits, with no hard-coded assumptions about outcomes.** This is the property that lets methodology and data revisions land as a **re-score**, not a **rebuild**.

Three consequences, each load-bearing:

1. **Readiness states and pathway results come from engine output, not from baked-in display rules.** The UI does not decide that "patient X is NOT_READY because CGM is missing." The engine decides; the UI reads `overall_status` and `pathway_result` and renders them. The UI computes **no** readiness outcomes.
2. **The blocker/phenotype display is list-driven.** The UI renders whatever blockers and phenotypes appear in the loaded data — six today, more tomorrow — with no per-bug code. Add a seventh bug to a future dataset and the UI shows it with zero change.
3. **Fit-for-purpose criteria and value sets are configured, versioned, and surfaced as configuration** — never embedded in front-end logic. The demo shows one defensible baseline criterion now, labeled as a *configured, revisable choice a local team owns*, not a universal truth.

### Why this matters (this is the heart of the spec)
The current code violates all three: it **computes** quality scores and diabetes-risk in the browser, it has **hard-coded** ICD/RxNorm/LOINC maps and severity thresholds in TypeScript, and its agent insights are **step-keyed placeholders**. That means every time the methodology changes — a new phenotype, a revised threshold, a new EHR bug class — someone edits React components. That is the opposite of what infrastructure should be. The whole value proposition is *"methodology revisions are a re-score, not a rebuild."* The UI has to embody that, or the demo undercuts its own pitch. Concretely: when a future synthetic dataset adds, say, a new EHR phenotype, the **only** thing that should change is the fixture JSON (re-exported from the engine, §8.3) — not a single line of view code.

---

## 4. The two switchable abstractions (the architectural backbone)

Two things in this demo must be swappable without touching the UI. They follow the **same pattern**, deliberately, so learning one teaches the other:

| Abstraction | One function the UI calls | Mode flag | Built now (reliable default) | Deferred mode (upgrade) |
|---|---|---|---|---|
| **Data source** | `getReadinessData(session)` | `DATA_SOURCE: "fixtures" \| "neon"` | `fixtures` — pre-baked JSON exported from the real engine | `neon` — live read API |
| **Recommendation source** | `getRecommendation(blocker)` | `AGENT_MODE: "live" \| "scripted"` | `scripted` — pre-written recs for the six bugs | `live` — Claude API call, silent fallback to scripted |

### Why this matters
This is the most important idea to internalize as the founder-bridge, because it recurs. In both cases: **the UI calls one function and renders whatever shape comes back, agnostic to where it came from.** The reliable mode is built first and is also the *fallback*; the impressive mode is added later *on top*, behind the flag, falling back silently when it fails. You get the credibility of "it's real" without ever depending on "it's real" working on stage. The data-source abstraction and the drawer abstraction are the same move applied to two different problems — once you see the pattern, both are obvious.

---

## 5. Clean view architecture and pattern reuse

Per the Q2 decision: **stand up a clean view structure**, do not bend the old single-page wizard in place. The priority is inverted (use-case view as front door), and the old orchestration in `App.tsx` is wired around the seven-step linear pipeline being the entire UI; reframing it in place would fight the inversion at every turn.

**Reuse the scaffold and patterns, rebuild views/state/types:**

- **Reuse:** the React/Vite/TypeScript/Tailwind setup; the right-side **drawer shell** (`AgentInsightsDrawer.tsx` — the slide-in panel, header/body/footer layout); the **top step-bar** pattern (`TopPipelineBar.tsx`) for the pipeline toggle; the **approve/reject button UX** (the real apply/reject interaction already in the drawer).
- **Rebuild:** all views, the state layer, and all types — because the data contract the new views render does not exist in the old code.

### Proposed structure

```
src/
├── main.tsx, App.tsx                  # shell: lead-view routing, drawer mount
├── config/
│   └── DemoConfig.ts                  # DATA_SOURCE, AGENT_MODE, LEAD_VIEW, audience
├── data/                              # the data-provider abstraction (§8)
│   ├── provider.ts                    # getReadinessData(session) — mode dispatch
│   ├── fixtures/
│   │   ├── index.ts                   # fixtures implementation
│   │   ├── session-a.json             # exported from engine (clean)
│   │   ├── session-b.json             # exported from engine (six bugs)
│   │   └── session-c.json             # exported from engine (remediated)
│   └── neon.ts                        # deferred live-read implementation (designed, not built)
├── domain/
│   └── types.ts                       # the data-driven contract (§7) — mirrors engine output
├── recommendations/                   # the drawer's switchable source (§10)
│   ├── getRecommendation.ts           # mode dispatch + silent fallback
│   ├── scripted.ts                    # pre-written recs for the six bugs
│   └── live.ts                        # deferred Claude API implementation
├── state/
│   └── demoState.ts                   # session selection, reset, selected blocker
├── views/
│   ├── UseCaseView/                   # the front door (§2.1)
│   ├── PipelineView/                  # the under-the-hood toggle (§2.2)
│   └── shared/                        # status chips, four-facts panel, criteria card
├── components/
│   └── RemediationDrawer/             # rebuilt from the drawer shell (§10)
└── theme/
    └── tokens.ts                      # semantic + functional readiness tokens (§14)
```

### Why this matters
A clean structure makes the **build increments** in §17 line up with **folders**: foundations (`domain/`, `data/`) first, then `views/UseCaseView`, then `recommendations/` + the drawer, then `views/PipelineView`, then `theme/` finish. Each increment is a comprehensible unit you can review before the next begins. Bending the old wizard would tangle these together and make the increments un-reviewable.

---

## 6. The A→B→C arc and the six-bug walkthrough

### 6.1 The three sessions

The demo runs across three pre-loaded dataset states, each a `demo_session` (IDs are the real ones already loaded):

| Session | State | Session ID | What the audience sees |
|---|---|---|---|
| **A** | Clean | `929ce033-41e7-4516-b70c-240e07257f8d` | Capabilities READY — the target state |
| **B** | Buggy | `a40afd78-0ded-4481-8a7d-04811f4f28ed` | Six blockers surface; capabilities NOT_READY / PARTIALLY_READY |
| **C** | Remediated | `44ce72be-0629-47ba-bde0-dc52c854536d` | Capabilities unlock; some blockers persist by design |

The narrative arc: **B (problems surfaced) → remediate → C (re-scored, unlocked).** A is the reference "what good looks like." Per the Dataset B Bug Reconciliation, **C is partial remediation**: Bugs 4 and 6 fully resolve, Bug 5 partially resolves, Bugs 1/2/3 remain unresolved by design (they require external stakeholder action). The UI must render that partial outcome faithfully — it is the honest story that remediation is multi-party and ongoing, not a magic "fix all."

### 6.2 The six bugs (rendered list-driven, never hard-coded)

The canonical mapping (from the Build Plan demo narrative and `CLAUDE.md` §10). **This table is the engine's output, not the UI's logic** — the UI renders whatever blockers the fixture carries:

| Bug | Check (full name) | Capability blocked | Phenotype | Responsible role |
|---|---|---|---|---|
| 1 — Device identity linkage | `device_patient_linkage_cgm` | Diabetes Risk Stratification | Identity Linkage Failure | Technology Vendor |
| 2 — CGM temporal density | `device_temporal_density_cgm_14d` | Diabetes Risk Stratification | Device Temporal Density Gap | Primary Care Site (adherence) / Technology Vendor (transmission) |
| 3 — Missing smoking status | `layer1_notnull_fields_smoking` | Hypertension Risk Stratification | Missing Required Variable | Primary Care Site |
| 4 — Invalid terminology codes | `layer3_mapped_values` + `layer2_value_standards` | Care Coordination | Invalid Terminology Code | Technology Vendor |
| 5 — Date format errors | `layer5_date_concordance` | Clinical Quality + VBC Reporting | Date Format Non-Conformance | Technology Vendor |
| 6 — TIR derived metric mismatch | `device_derived_metric_consistency_cgm` | Diabetes Risk Stratification | Derived Metric Concordance Failure | Policy/Regulatory |

The split is meaningful, not arbitrary (per `CLAUDE.md` §1.6, two data paths): **device bugs (1, 2, 6)** block the stratification front (Diabetes RS, the capability sites can act on *now*); **EHR bugs (3, 4, 5)** block the downstream (Hypertension RS, Care Coordination, Clinical Quality + VBC Reporting — the coordination-and-reporting half). The UI should make this two-sided structure legible without asserting it as logic: it falls out of which capability each blocker is attached to.

> **Frozen string discipline.** "Clinical Quality + VBC Reporting" is a **display label only**. The underlying enum `vbc_reporting`, the `use_case_name` string, and config filenames are frozen (Scope Lock §10). The UI maps `use_case_name → display_name` from the fixture; it never changes the enum to achieve the rename. The fixture carries both the frozen `use_case_name` and the `display_name` the UI shows.

### 6.3 The four-facts blocker panel (the canonical unit)

Every blocker, when expanded, shows exactly four facts plus its phenotype, in a consistent panel:

```
┌─ BLOCKER ─────────────────────────────────────────────┐
│  ⬤ Device identity linkage failure        NOT_READY   │
│  Phenotype: Identity Linkage Failure                  │
│                                                        │
│  1. WHAT FAILED                                        │
│     CGM device records could not be linked to         │
│     patients (device user_id does not match any        │
│     patient). Check: device_patient_linkage_cgm        │
│                                                        │
│  2. CAPABILITY BLOCKED                                  │
│     Diabetes Risk Stratification                       │
│                                                        │
│  3. RESPONSIBLE ROLE                                    │
│     Technology Vendor                                  │
│                                                        │
│  4. WHAT UNLOCKS AFTER REMEDIATION                     │
│     The instrumented population becomes linkable and   │
│     the weekly stratification review can run on it.    │
│                                                        │
│  [ Open remediation recommendation → ]   (drawer §10)  │
└────────────────────────────────────────────────────────┘
```

The panel is **rendered from the blocker record** (§7), one component, no per-bug branching. The "Open remediation recommendation" affordance is what triggers the agentic drawer (§10) — the drawer fires **on a use-case blocker, in service of remediation**, never at a pipeline step.

---

## 7. The data-driven rendering contract (the linchpin)

This is the contract the whole UI depends on. These types **mirror the engine output tables** in `CLAUDE.md` §9 and the Condition Module Schema. The UI renders these and **invents no shapes the engine does not emit.**

### 7.1 Why a contract at all
The current frontend has *no* readiness types — it models a generic quality wizard. Defining this contract first (build increment 1, §17) means every later piece — the use-case view, the drawer, the pipeline toggle — renders against a stable shape. It also pins down exactly what the **fixture-export step** (§8.3) must dump out of the engine. Define the contract once; everything downstream conforms to it.

### 7.2 The engine emits per-patient × use-case × session rows; the front door shows a population rollup
The engine writes one row per **patient × use case × session** (`use_case_readiness`, `use_case_pathway_results`). The front door, though, is a **population view**: "for this cohort, is Diabetes RS ready?" So the contract has two levels:

- **Per-patient / per-record rows** — exactly as the engine emits them. The **pipeline view's record-level drill-down (§2.2) consumes these**: for a selected failing check it renders the specific failing records via `CheckResultView` (and optionally `PatientUseCaseRow`). The **front door never uses them** — it stays population-level. These rows are **optional in the fixture**, with one requirement: the **Dataset B fixture must include per-record `CheckResultView` rows for failing checks** (it may omit them for passing checks to stay lean).
- **A use-case population summary** — the rollup the front door renders.

**The rollup is produced by the fixture-export step, not by the UI** (§8.3). This preserves the rule that the UI computes no outcomes: counting how many patients landed in each engine-assigned status is done at export time and shipped in the fixture. The UI renders the summary it is handed.

### 7.3 The types (normative)

```typescript
// ---- enums: exactly the engine's value lists (CLAUDE.md §6, §7, §9) ----
type ReadinessStatus   = 'READY' | 'PARTIALLY_READY' | 'NOT_READY';
type CheckStatus       = 'PASS' | 'FAIL' | 'PARTIAL' | 'NOT_APPLICABLE';
type PathwayResult     = 'primary_pass' | 'fallback_pass' | 'no_valid_pathway';
type CheckScope        = 'ehr' | 'device' | 'use_case';
type Priority          = 'High' | 'Medium' | 'Low';
type ImplementationState = 'implemented' | 'demonstrated_stub' | 'architectural';
type ResponsibleRole =                       // the 7 canonical strings (CLAUDE.md §7)
  | 'Primary Care Site' | 'Specialty Partner' | 'Regional Data Node'
  | 'Technology Vendor' | 'Program Coordinator' | 'Network/Payer' | 'Policy/Regulatory';

// ---- the top-level shape getReadinessData(session) returns ----
interface ReadinessData {
  session: SessionMeta;
  useCases: UseCaseSummary[];      // front-door cards
  blockers: Blocker[];             // list-driven; the four-facts units (six in B)
  criteria: ConfiguredCriterion[]; // surfaced as configuration (§9)
  pipeline: PipelineStageView[];   // under-the-hood toggle (§2.2)
  // per-patient detail is optional in the fixture; front door does not require it
  patientRows?: PatientUseCaseRow[];
}

interface SessionMeta {
  demoSessionId: string;           // the real UUID
  label: 'A' | 'B' | 'C';
  datasetState: 'clean' | 'buggy' | 'remediated';
  audienceType?: string;           // reserved for fast-follow per-audience views
}

interface UseCaseSummary {
  useCaseName: string;             // FROZEN enum value, e.g. 'vbc_reporting'
  displayName: string;             // e.g. 'Clinical Quality + VBC Reporting'
  category: 'risk_stratification' | 'care_coordination_delivery' | 'vbc_reporting';
  implementationState: ImplementationState;   // drives the honesty label (§12)
  overallStatus: ReadinessStatus;             // engine-assigned, rolled up
  fitnessScore: number | null;                // 0–1; null for boolean stubs
  pathwayResult: PathwayResult | null;        // null for stubs (no pathway logic)
  activePathwayId: string | null;             // mechanical id, never shown raw (§13)
  requiredVariables: string[];
  blockingVariables: string[];
  partialVariables: string[];
  patientCounts: { ready: number; partiallyReady: number; notReady: number };
  blockerIds: string[];            // links to Blocker[] for this capability
}

interface Blocker {                // one per surfaced data-quality blocker
  blockerId: string;
  checkName: string;               // full name, e.g. 'device_patient_linkage_cgm'
  checkScope: CheckScope;
  priority: Priority;
  phenotype: string;               // e.g. 'Identity Linkage Failure'
  blockedUseCaseName: string;      // frozen enum; UI maps to displayName
  responsibleRole: ResponsibleRole;
  // the four facts, as plain-language strings produced at export time:
  whatFailed: string;
  capabilityBlocked: string;       // the displayName of the blocked capability
  whatUnlocks: string;
  status: CheckStatus;
  observedValue?: string | number | null;
  threshold?: number | null;
  recommendationId: string;        // links to the scripted recommendation (§10)
}

interface ConfiguredCriterion {    // surfaced as owned, versioned config (§9)
  criterionId: string;
  label: string;                   // e.g. 'CGM temporal density ≥ 14 days in window'
  appliesToUseCase: string;        // frozen enum
  tier: 'foundational' | 'customizable';
  configVersion: string;           // e.g. 'diabetes.config.json@0.1'
  ownedBy: string;                 // e.g. 'Local clinical team' — never 'the platform'
  value: string;                   // the configured threshold/value, shown as configured
}

interface PipelineStageView {      // the under-the-hood toggle stages
  stageId: string;                 // 'load' | 'normalize' | 'score' | 'surface' | ...
  label: string;
  status: 'complete' | 'attention' | 'pending';
  checkResults?: CheckResultView[];// the receipts behind the headline
}

interface CheckResultView {
  checkName: string; variableName: string; status: CheckStatus;
  score: number | null; threshold: number | null; observedValue: string | number | null;
  priority: Priority; patientId: string;
}

interface PatientUseCaseRow {      // engine's native grain (optional in fixture)
  patientId: string; useCaseName: string;
  overallStatus: ReadinessStatus; fitnessScore: number | null;
  pathwayResult: PathwayResult; activePathwayId: string | null;
}
```

### Why this matters
Every field above has a home in an engine output table — nothing is UI invention. `overallStatus` comes from `use_case_readiness.overall_status`; `pathwayResult` from `use_case_pathway_results.pathway_result`; `responsibleRole` from `remediation_work_items.responsible_role` (one of the seven canonical strings, enforced at two layers in the engine per `CLAUDE.md` §13). The plain-language four-facts strings (`whatFailed`, `whatUnlocks`) are composed **at export time** from the work-item's `action_required` and the bug reconciliation, not hard-coded in components — so a new bug in a future dataset arrives with its own strings and renders with zero UI change.

---

## 8. The data-provider abstraction (Q1 decision)

### 8.1 One function, two modes
The UI gets all readiness data from a **single function** behind a mode flag:

```typescript
// config/DemoConfig.ts
export const DATA_SOURCE: 'fixtures' | 'neon' = 'fixtures';

// data/provider.ts
export async function getReadinessData(session: 'A' | 'B' | 'C'): Promise<ReadinessData> {
  return DATA_SOURCE === 'neon' ? fromNeon(session) : fromFixtures(session);
}
```

The UI calls `getReadinessData(session)` and renders the `ReadinessData` it gets back, **agnostic to the source.** This is the same switchable pattern as the drawer (§4).

### 8.2 Fixtures mode — built now (the demo-safe default)
- Three committed JSON files (`session-a/b/c.json`), each a serialized `ReadinessData`, **exported from the real scoring engine** (§8.3).
- This is the reliable mode and the one the demo runs on. It honors **"reset re-points, does not recompute"** natively: switching sessions loads a different pre-baked file; nothing computes on stage.

### 8.3 The fixture-export step (a documented part of the pipeline)
This is the mechanism that keeps the UI data-driven across future data revisions, so it is **part of the documented pipeline**, not a one-off:

```
run scoring engine against session  →  query engine output tables
   (check_results, variable_readiness_scores, use_case_pathway_results,
    use_case_readiness, remediation_work_items)
   →  roll up to UseCaseSummary + compose four-facts strings
   →  serialize to src/data/fixtures/session-<x>.json
```

A small **export script** (e.g. `scripts/export-fixtures.js`, engine-side, reusing `CKM_DIRECT`) does this. **The rollup and the four-facts composition happen here, not in the UI** (§7.2). When a future synthetic dataset adds a new phenotype or bug, the workflow is: load data → run engine → re-export fixtures → the UI shows it. **No view code changes.** That is the whole point of §3 made operational.

### 8.4 Neon mode — designed for, not built now (the upgrade door)
- `data/neon.ts` implements `fromNeon(session)` against a thin read-only API over the engine output tables, returning the **identical `ReadinessData` shape**.
- It is **not built now**, but the abstraction is designed so it can be added **behind the same flag with zero UI rework**. Fixtures is what you fall to for reliability; Neon-live is the optional upgrade on top — exactly the live/scripted relationship the drawer has.

### Why this matters
A non-technical reader's instinct is "shouldn't a real demo read the real database live?" The answer this spec encodes: **a live read buys you nothing the audience can see, and costs you reliability.** The numbers are identical either way because the fixtures *come from* the real engine. So we ship fixtures (never fails, identical every run, re-pointable instantly) and keep the live-read door open for when a genuinely live, user-driven mode is worth it (a real post-POC product direction). Building the abstraction now means that upgrade is additive, never a rewrite.

---

## 9. Surfacing configured criteria (owned, versioned, revisable)

Fit-for-purpose criteria are **shown as configured and owned by the local team, never asserted by the platform as universal truth** (`CLAUDE.md` §1.6).

- The UI renders `ConfiguredCriterion[]` from the fixture. Each criterion shows: its **value**, that it is **configured** (not computed in the UI), its **version** (`diabetes.config.json@0.1`), its **owner** ("Local clinical team"), and its **tier** (**foundational** = anchored to national standards, stable; **customizable** = local, evolves as guidelines shift).
- Show **one defensible baseline criterion** now, labeled configured and revisable. For example, the CGM temporal-density window shown as *"Configured by the local team · foundational · v0.1 · revisable."*
- **Do not imply the engine computes profile-conditioned criteria** (e.g. "device required if on insulin"). That is a forward-looking capability the configurable architecture *supports*, not a v0.1 implementation. Conditional variable requirements are a v0.1 non-goal — describe honestly per the three-state vocabulary if mentioned at all.

### Why this matters
The trap is a UI that says "this data is not fit for purpose" as if the platform owns truth. The platform owns **the determination under agreed criteria**; the *criteria* belong to the local team. Surfacing criteria as visible, versioned, owned configuration is what makes that real on screen — and it is what lets a clinical collaborator say "change that threshold" and have it land as a config edit and re-score, not a UI ticket. The criteria live in the fixture (exported from `conditions/*/*.config.json`), never in component logic.

---

## 10. The agentic drawer (per the Agentic Drawer Spec Decision)

### 10.1 Trigger — on a use-case blocker, in service of remediation
The drawer surfaces a **remediation recommendation** when the user opens a **real engine-detected use-case blocker** (the "Open remediation recommendation" affordance on the four-facts panel, §6.3). It fires **on a blocker, never at a pipeline step.** This is the explicit correction of the current code's behavior (conflict C2).

**Two recommendation types, honestly distinguished.** Not every blocker is auto-fixable, and the demo must not pretend otherwise. Each recommendation carries a `recommendationType` (engine classification, carried in the fixture, **not** UI logic — consistent with the Remediation Roles "AI-Assisted?" column):

- **`ai_suggested_fix`** — the blocker is auto-fixable. The drawer shows the **proposed corrected value** and a **real approve/reject affordance** (approve advances toward C).
- **`route_to_stakeholder`** — the blocker is **not** auto-fixable. The drawer shows that fact, **names the responsible role and the action required as a work item**, and offers **no fix to approve**.

**The six bugs map to type (carried in the fixture):**

| Bug | `recommendationType` |
|---|---|
| 4 — Invalid terminology codes | `ai_suggested_fix` |
| 5 — Date format errors | **mixed** — auto-normalizable records `ai_suggested_fix`; ambiguous records `route_to_stakeholder` |
| 1 — Device identity linkage | `route_to_stakeholder` |
| 2 — CGM temporal density | `route_to_stakeholder` |
| 3 — Missing smoking status | `route_to_stakeholder` |
| 6 — TIR derived metric mismatch | `route_to_stakeholder` (recompute is available, but the authoritative-method decision routes to Policy/Regulatory governance) |

`confidence` is **`null` for all `route_to_stakeholder` recommendations regardless of mode** (there is no fix to be confident about). The **on-screen visual treatment** of the two types is a build-time detail to review live; locked here is only the **principle that the two types are honestly distinguished** and that the `recommendationType` field carries the distinction.

### 10.2 Switchable source with silent fallback
Identical pattern to the data provider (§4):

```typescript
export const AGENT_MODE: 'live' | 'scripted' = 'scripted';

export async function getRecommendation(blocker: Blocker): Promise<Recommendation> {
  if (AGENT_MODE === 'live') {
    try {
      const rec = await withTimeout(liveRecommendation(blocker), 3500);
      if (isWellFormed(rec)) return rec;
    } catch { /* fall through */ }
  }
  return scriptedRecommendation(blocker);   // the foundation and the net
}
```

- **Scripted mode — built first.** Pre-written, high-quality recs for **exactly the six demo bugs**, returned instantly. This is both the minimum agentic story and the fallback, so it must exist regardless.
- **Live mode — added later.** Calls the Claude API; on slow (≈3–4s+), error, timeout, or malformed/off response, **silently falls back to scripted.** A hidden keyboard shortcut can force scripted mid-session. The audience never sees a failure.
- The drawer UI, the displayed recommendation, and the approve/reject interaction are **identical in both modes** because both return the same shape.

### 10.3 The recommendation data shape (net-new — define before building either mode)
The current field-patch shape (`PatchSuggestion`) is **wrong** and is not reused. This is the new contract:

```typescript
interface Recommendation {
  recommendationId: string;
  blockerId: string;               // the blocker it responds to
  checkName: string;               // the check/blocker, e.g. 'layer5_date_concordance'
  recommendationType:              // engine classification, from the fixture (§10.1)
    | 'ai_suggested_fix'           //   auto-fixable: show corrected value + approve/reject
    | 'route_to_stakeholder';      //   not auto-fixable: name role + action, no fix to approve
  blockedCapability: string;       // displayName of the blocked use case
  responsibleRole: ResponsibleRole;// who must act (one of the seven)
  remediationPlainLanguage: string;// the proposed remediation, in plain English
  rationale: string;               // why this remediation
  confidence: number | null;       // 0–1 only for ai_suggested_fix in live mode;
                                   // null in scripted mode AND null for all route_to_stakeholder
  source: 'live' | 'scripted';     // honest provenance for the three-state label
  // fields the approve/reject UI acts on (ai_suggested_fix only):
  proposedAction: {
    summary: string;               // what "approve" means in words
    targetCheckName: string;
    proposedValue?: string;        // the corrected value shown for ai_suggested_fix
    expectedOutcome: string;       // e.g. 'Re-score lifts Care Coordination to READY'
  };
}
```

Two fields carry the mode/type distinction, and only those: `recommendationType` decides whether there is a fix to approve at all, and `confidence` is a real number **only** for an `ai_suggested_fix` in live mode — `null` in scripted mode and `null` for every `route_to_stakeholder` regardless of mode. Everything else is identical, which is exactly why the drawer can render any recommendation without knowing its source.

### 10.4 Human approve / reject — always real
The approve/reject UI is **always real** (reused from the existing drawer's apply/reject UX). It sells the human-in-the-loop point and is cheap to build. In the POC, "approve" advances the demo narrative (and, in the A→B→C arc, corresponds to the move toward session C); it does **not** mutate raw data — raw data is never modified (`CLAUDE.md` §2), and reset re-points rather than recomputes.

### 10.5 Three-state labeling of the drawer itself
- Running **scripted** → label the agentic layer **Demonstrated (stub)**.
- Running **live** → label it **Implemented**.
- Honest either way (§12).

### 10.6 Remove Archia attribution and vocabulary
Per Strategic Decisions Extract §9 and Build Plan Step 8 demo hygiene, and resolving conflict C3:
- Remove **"Powered by Archia AI"** (currently `AgentInsightsDrawer.tsx:193`) and the green "Connected" pulse vendor cue.
- Remove the `Archia*` vocabulary throughout (`agents/types.ts`, `ArchiaMockClient.ts`, `AgentHooks.ts`, `AskAnythingPanel.tsx`, `AppConfig.enableMockArchia`).
- Replace with a **neutral, function-based label** — e.g. "Agentic remediation recommendation" or simply "Remediation recommendation." Archia, Kris Kowal, and Chime Ogbuji are not current collaborators and must not appear in demo-facing copy.

### Why this matters
The drawer is where the demo makes its most delicate claim — that AI helps. The switchable design lets that claim be *as real as it can safely be*: live when it works, scripted when it doesn't, and the audience can't tell the difference because the shape is identical. Defining the recommendation shape **before** building either mode is what makes the swap clean — live is forced to conform to what scripted establishes. Build it the other way around and live's shape leaks into the UI and scripted can never match it.

---

## 11. Reset behavior

- Reset **re-points to a clean pre-computed session / reloads a dataset state (A, B, or C)**. It does **not** re-run the engine. Results are pre-computed and served from the fixture (or Neon, later).
- Mechanically: reset calls `getReadinessData(targetSession)` and replaces the rendered state. Between run-throughs it returns the demo cleanly to a known state.
- **On-screen copy must never imply live computation** ("watch it score" is banned). The pipeline view animates *stage transitions over pre-computed results*, not a live computation.

### Why this matters
This is a reliability and honesty rule at once. Reliability: a re-point can't fail or vary the way a recompute can, so the demo runs the same every time and resets instantly between meetings. Honesty: claiming "watch it score live" when results are pre-baked would be the kind of over-reading the three-state vocabulary exists to prevent.

---

## 12. The three-state vocabulary as an on-screen primitive

Every capability and the agentic layer carry an honest label, rendered from `implementationState`:

| Label | Meaning | In this demo |
|---|---|---|
| **Implemented** | Full use-case execution logic exists and runs | Diabetes Risk Stratification; the agentic drawer when **live** |
| **Demonstrated (stub)** | Real checks, bugs, routing, outputs run; limited (boolean) logic | Care Coordination, Clinical Quality + VBC Reporting, Hypertension RS; the agentic drawer when **scripted** |
| **Architectural** | Architecture and data exist; no executing use case | Hypertension / Heart Failure as conditions; any capability-enforcement runtime (Endo) |

- This is a **first-class display component** (a status chip / badge), not ad-hoc text — `views/shared/ImplementationBadge`.
- It is **distinct from readiness state** (§14): a capability can be *Implemented* and *NOT_READY* (it runs, but this dataset isn't ready), or *Demonstrated-stub* and *NOT_READY* (Bug 3 on the Hypertension stub). Keep the two axes visually separate so neither is misread as the other.

### Why this matters
The audience is evaluating whether this is fundable infrastructure. Over-reading scope ("they claim Hypertension is built!") or under-reading breadth ("it's just a diabetes tool") both kill the pitch. The honesty labels are the antidote — and making them a consistent on-screen primitive, not scattered prose, is what makes the honesty legible at a glance.

---

## 13. Copy and framing disciplines

These hold everywhere a demo audience sees text. Drawn from `CLAUDE.md` §1.6; restated as UI rules.

- **A1C / CGM framing.** User-facing copy uses the reconciled narrative: CGM is the practical way to establish current glycemic control (GMI as an A1C proxy, plus TIR and trajectory); the pipeline checks the CGM pathway first because that is where current, sufficient data usually exists, and falls back to A1C when CGM is unavailable. **Never show "CGM primary / A1C fallback" on screen** — to a clinician that reads as a backwards clinical claim. The mechanical pathway names (`cgm_primary`, `a1c_fallback`, `activePathwayId`) stay in code and config and are **never rendered raw.**
- **Ordered pathway, not composite.** Render the pathway as device-pathway-first, EHR/A1C-fallback-second — an **ordered** evaluation. Do not show a composite/blended indicator (the Architecture Spec §5.2 "composite" language is a stale outlier).
- **Human always in the loop.** The platform **surfaces, orders, and remediates**; it does **not enroll, identify, or act autonomously.** Never imply the platform decides who to monitor or acts without a clinician. The demo sits in the data-readiness substrate of the weekly stratification review (Care Model Moment 2).
- **EHR remediation is the prerequisite for downstream coordination and reporting**, not secondary cleanup.
- **Capabilities are condition-agnostic functions shown for diabetes** ("risk stratification, shown here for diabetes"), never collapsed into a diabetes-only product.
- **No autonomous-action claims anywhere.** Full automation of the loop is roadmap-only (IRB-bound, safe-use-of-AI); it does not appear in demo copy.
- **Identity / partners.** Oros is the neutral steward of shared open infrastructure (Apache 2.0; the Collaboration Framework owns license/IP — reference, never restate). No Archia / Kowal / Ogbuji as current collaborators; RTA / KUMC off the funding-facing demo.

### Why this matters
Each of these is a place where a small wording slip makes a clinical or strategic audience distrust the whole thing. The A1C/CGM one is the sharpest: get it backwards and a clinician in the room stops believing the methodology is real. Keeping mechanical names out of the UI entirely (they live only in code) removes the chance of the slip.

---

## 14. Design: semantic tokens now, visual finish deferred

Distinguish two things people lump together as "design."

### 14.1 Semantic + functional tokens — part of the build from the start (they carry meaning)
These are **logic, not decoration**, and ship with the initial build (`theme/tokens.ts`):

- **Brand / structural tokens:**
  - **INK `#1A2420`** — primary text / structure.
  - **GREEN `#117757`** — structure / infrastructure.
  - **GOLD `#CB983F`** — north-star / possibility (the "what unlocks" / future-state accent).
- **Functional readiness colors — reserved strictly for readiness status, never for decoration:**
  - **READY → green**, **PARTIALLY_READY → amber**, **NOT_READY → red.**
  - A NOT_READY state **must read as red because that is logic.** These functional colors are not interchangeable with the brand GREEN/GOLD; keep them in a separate token group so no one "reuses" brand green for a READY chip and breaks the semantic.

> **Token separation rule.** `tokens.brand.*` (INK/GREEN/GOLD) and `tokens.readiness.*` (red/amber/green) are **different groups with different jobs.** The implementation-state badges (§12) use brand/neutral tokens; the readiness states use functional tokens. Never cross them.

### 14.2 Visual finish / aliveness — explicit deferred final layer
The logo treatment, the soft gold/green glow, depth-through-softness, big confident typography, and the serif-vs-sans question are an **explicit deferred final layer**, applied once the plumbing and logic are correct — governed by the external **Visual Direction brief** (treat as last, not now; do not restate it here).

### Why this matters
The reason to get tokens right *now* even though finish comes later: build with correct tokens and the finish layer is **additive** ("make the existing GOLD element glow") rather than **corrective** ("recolor everything"). If readiness colors were arbitrary at first, the finish pass would have to untangle meaning from styling — exactly the kind of rework that introduces bugs. Tokens are cheap insurance that the beautiful version is a coat of paint, not a teardown.

---

## 15. Component and state inventory

| Area | Disposition | Notes |
|---|---|---|
| React/Vite/TS/Tailwind scaffold | **Reuse** | Keep the toolchain and build setup |
| Drawer shell (`AgentInsightsDrawer.tsx` layout) | **Reuse → rebuild as `RemediationDrawer`** | Keep slide-in panel + approve/reject UX; replace contents, shape, trigger, label |
| Top step-bar (`TopPipelineBar.tsx`) | **Reuse pattern** | For the pipeline toggle view |
| Step visuals (`steps/*.tsx`) | **Reframe** | Source material for the under-the-hood pipeline stages; re-label to CKM pipeline |
| `App.tsx` orchestration | **Replace** | New lead-view routing + drawer mount |
| `state/wizardState.ts` | **Replace** with `state/demoState.ts` | Session selection, reset, selected blocker — no seven-step linear model |
| `types/wizard.ts`, `engine/*`, `services/pipelineService.ts` | **Remove from the demo path** | In-browser mock pipeline; replaced by the data provider + fixtures |
| `agents/*` (Archia) | **Remove** | Replaced by `recommendations/*` (§10) |
| `domain/types.ts`, `data/*`, `recommendations/*`, `views/*`, `theme/tokens.ts` | **Net-new** | The contract, provider, recommendation source, views, tokens |

---

## 16. Open questions, assumptions, and resolved conflicts

### 16.1 Conflicts — resolved by the build (carried from the assessment)
- **C1 (in-browser computation vs. source-of-truth):** resolved — UI renders fixtures exported from the engine; computes no outcomes (§3, §8).
- **C2 (drawer trigger at pipeline step):** resolved — drawer triggers on a use-case blocker (§10.1).
- **C3 (Archia attribution):** resolved — removed; neutral function-based label (§10.6).
- **C4 (recommendation shape):** resolved — net-new `Recommendation` shape, defined before either mode (§10.3).
- **C5 (criteria hard-coded in TS):** resolved — criteria are versioned config surfaced from the fixture (§9).
- **C6 (composite vs ordered pathway):** resolved — ordered pathway only; never render a composite (§13).

### 16.2 Best assumptions (so the spec is buildable with zero further input)
- **A1:** The data-driven contract (§7) is mirrored from the engine output tables and is identical for fixtures or Neon.
- **A2:** Scripted is the foundation; the recommendation shape is defined before either mode.
- **A3:** Clean view architecture; reuse scaffold + drawer + step-bar + approve/reject UX.
- **A4:** Three-state vocabulary is a first-class on-screen badge, separate from readiness color.
- **A5:** The four-facts blocker panel is the canonical, list-driven blocker unit.
- **A6:** The fixture-export script and its rollup/four-facts composition are the integration point with the backend; they belong in `scripts/`, run after the engine, and are the mechanism for absorbing future dataset revisions.
- **A7:** "Approve" in the drawer advances the narrative toward session C; it never mutates raw data.

### 16.3 Open questions for the engineering build (not blocking this spec)
- **Q-a:** Exact fixture-export ownership — engine-side script vs. a thin export module in the scoring repo. (Recommendation: a `scripts/export-fixtures.js` reusing `CKM_DIRECT`.)
- **Q-b — resolved (§2.2):** The pipeline-view stages are **recut to the curated readiness arc** (Ingest → Parse → Normalize → Score → Readiness Report → Remediate → Re-score → Unlock), reusing the existing step visuals; Persistence / Enrichment / standalone Analytics are omitted.
- **Q-c:** Where the live-read API (Neon mode) would live when built (same repo vs. a small read service). Deferred; the abstraction keeps it open (built in Increment 6, §17).

---

## 17. Build increments and checkpoints (foundations first)

The build proceeds as **comprehensible increments**, each understandable and reviewable before the next. No artificial deadline; the order is foundations-first so each layer rests on a settled one. (Build sound and upgradable, not a rushed minimum — do not bake in "cut if short on time" shortcuts.)

| # | Increment | Delivers | Checkpoint (how you know it's right) |
|---|---|---|---|
| **1** | **Data contract + provider abstraction** | `domain/types.ts`, `data/provider.ts`, the three fixtures exported from the real engine, the export script | `getReadinessData('B')` returns a `ReadinessData` with six blockers and the right routing — verified against the Dataset B Bug Reconciliation. No view yet. |
| **2** | **Use-case view (the front door)** | Capability cards, readiness states, implementation badges, the four-facts blocker panel, criteria surfacing | A/B/C render the correct capabilities, statuses, six blockers, and configured criteria — all from the fixture, no hard-coded outcomes. |
| **3** | **Recommendation source + drawer** | `recommendations/getRecommendation.ts`, scripted recs for six bugs, `RemediationDrawer`, real approve/reject, three-state label, Archia removed | Opening any blocker shows the right scripted recommendation; approve/reject works; no Archia anywhere; drawer fires on blockers, not steps. |
| **4** | **Pipeline / under-the-hood toggle** | The demoted pipeline view as the **curated readiness arc** (§2.2) over the same fixture; record-level drill-down for failing checks; lead-view flag | Toggle shows the same engine output as readiness stages, AI-assist marked only at Normalize + Remediate, Score the labeled deterministic core; drilling a failing check shows its per-record `CheckResultView` rows; technical-audience lead-view exception works. |
| **5** | **Reset + session arc polish** | Session re-point, clean reset, A→B→C narration | Reset re-points instantly, never recomputes; arc runs the same every time. |
| **6** | **Live upgrades (optional, on top)** | **Both** live optionalities, each behind its flag: the live Neon read (`DATA_SOURCE='neon'`, implementing `data/neon.ts`) and the live Claude API recommendation (`AGENT_MODE='live'`, implementing `recommendations/live.ts`) | Each works when it works and **falls back silently** to its reliable default (fixtures / scripted) on slow/error/malformed; **UI unchanged**. The abstraction seams already exist from Increments 1 and 3 — this increment only fills in the deferred implementations behind the flags. |
| **7** | **Visual finish layer** | Per the external Visual Direction brief, applied last | Additive glow/typography/depth on correct tokens — no recolor, no logic change. |

### Why this order
Increment 1 is the foundation everything renders against, so it comes first and is validated **before any pixels exist** — if the contract and fixtures are right, the views are "just rendering." Each subsequent increment adds one comprehensible layer on a settled one. The two "live" upgrades in Increment 6 (Neon read and live recommendations) and the visual finish (7) are deliberately **last and additive**: because the switchable seams (§4, §8, §10) are built in Increments 1 and 3, filling in `data/neon.ts` and `recommendations/live.ts` later changes nothing beneath them — which is what makes them safe to add whenever they're worth adding, or to skip with zero loss to everything below.

---

## 18. Appendix — front-door layout sketch (illustrative, not final visual)

```
┌──────────────────────────────────────────────────────────────────────┐
│  Oros · CKM Data Readiness            Session: [ A ][▣ B ][ C ]  ⟳Reset│
├──────────────────────────────────────────────────────────────────────┤
│  Can this population's data support each capability?                   │
│                                                                        │
│  ┌── Diabetes Risk Stratification ──────────── Implemented ───────┐    │
│  │  ⬤ NOT_READY   fitness 0.42   pathway: device-first → A1C       │    │
│  │  Blockers (3):  Identity Linkage · Temporal Density · TIR        │    │
│  │  [ expand → four-facts ]                                         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│  ┌── Care Coordination ───────────────── Demonstrated (stub) ─────┐    │
│  │  ⬤ NOT_READY    Blocker (1): Invalid Terminology Code            │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│  ┌── Clinical Quality + VBC Reporting ── Demonstrated (stub) ─────┐    │
│  │  ◐ PARTIALLY_READY   Blocker (1): Date Format Non-Conformance    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│  ┌── Hypertension Risk Stratification ── Demonstrated (stub) ─────┐    │
│  │  ⬤ NOT_READY    Blocker (1): Missing Required Variable           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                        │
│  [ ▸ Show the pipeline under the hood ]      (proof, not headline)     │
└──────────────────────────────────────────────────────────────────────┘
        readiness colors = functional (red/amber/green) · badges = brand/neutral
```

*Illustrative only — exact composition and the visual-finish layer are governed later by the Visual Direction brief (§14.2). Statuses/counts shown are for Session B and must render from the fixture, never hard-coded.*

---

*End of specification. Locked June 2026. Subsequent changes are revisions to a locked contract — note them in the revision history and flag any that affect the §7 data contract or §10 recommendation shape, since the build depends on those being stable.*
