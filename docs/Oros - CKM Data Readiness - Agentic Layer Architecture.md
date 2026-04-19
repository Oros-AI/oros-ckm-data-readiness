# Oros - CKM Data Readiness - Agentic Layer Architecture

**Project:** Oros CKM Data Readiness Infrastructure  
**Status:** Design specification — POC implementation pending  
**Last updated:** 2026-04-08 (updated to reflect ADR Decision 1 and Decision 2 — peer sidecar placement, triggerRescore function)  
**Audience:** Technical collaborators, agentic infrastructure partners

---

## Purpose

This document specifies the architecture, governing principles, and activation model for the optional agentic layer in the Oros CKM Data Readiness Infrastructure. It covers the agentic layer for the CKM build specifically. Patient consent and the broader governance project for trusted open source assets are separate workstreams addressed in separate documents.

For a plain language explanation of the security concepts underlying this architecture (runtime, sandboxing, prompt injection), see `Oros - CKM Data Readiness - Agentic Security Explainer.md`.

---

## Governing Principles

### Principle 1 — Optionality is Non-Negotiable

The deterministic pipeline must function completely and correctly without the agentic layer.

**Why:**
- Regulatory risk: ONC or CMS may restrict AI use with healthcare data. The Oros stack must keep working under any regulatory scenario.
- Cost at scale: Daily processing at regional nodes cannot be economically powered by frontier AI models.
- Trust: Clinical partners and regulators must understand and audit what the system does without AI involvement.

**Implementation:** The toggle is a first-class architectural feature. ON and OFF are both fully tested. Toggling OFF never degrades pipeline output.

### Principle 2 — Scoped Activation

| Context | AI State | Trigger | Purpose |
|---------|----------|---------|---------|
| Site Onboarding | ON | New site ingests first dataset | Learn institutional quirks, propose deterministic rule updates |
| Novel Issue Triage | ON (selective) | Check engine surfaces FAIL with no existing rule | Diagnose root cause, suggest patch |
| Routine Daily Processing | OFF | Scheduled scoring run | Scale without token cost |
| Compliance Lockdown | OFF (enforced) | Regulatory event | Full functionality under restrictions |

### Principle 3 — Harness-Agnostic Model Layer

The model layer is pluggable. No hard dependency on any single AI vendor.

| Model Type | Examples | Use Case | Cost |
|-----------|---------|---------|------|
| Frontier (ZDR) | Anthropic Claude, OpenAI | Complex remediation, root cause | Higher — onboarding/triage only |
| Local fine-tuned | Chime Ogbuji's Qwen 3 (SNOMED CT, ICD-10, RxNorm, LOINC) | Terminology validation, code mapping | Lower — site-level deployment |

**ZDR requirement:** All frontier models must operate under Zero Data Retention contracts.

### Principle 4 — Endo as Runtime Foundation

Kris Kowal's Endo technology (hardened JavaScript compartments) provides the governance enforcement foundation. Endo is not a supervisor layer sitting above the orchestration layer — it is the runtime environment that the orchestration layer runs inside.

**The distinction matters:** Conventional software rules say "don't do this." Endo makes unauthorized actions physically unexecutable at the language runtime level. Code running inside an Endo compartment has exactly the capabilities it was granted — nothing more, regardless of what the AI generates or what an attacker attempts to inject.

**Endo's role:**
- Capability enforcement — AI agents can only call functions they were explicitly granted
- Prompt injection resistance — injected instructions cannot grant new capabilities at runtime
- Codified governance rules — approval requirements and workflow boundaries expressed as Endo contracts
- Audit foundation — every capability grant and action is traceable

**Technology note:** Endo is built on hardened JavaScript (Compartments). Archia uses a Rust-based sandboxed runtime. These are complementary and operate at different levels — Archia restricts external actions (network, filesystem); Endo enforces internal capability boundaries within the execution environment. They may compose in a production deployment.

**Status:** Endo integration is post-POC. The POC validates the use case; Endo integration scoped after successful demo.

---

## Architecture — Peer Sidecar Placement (ADR Decision 1, Option C)

The agentic backend is an **independent peer sidecar service** — not embedded in or spanning the data pipeline tiers. It has two explicit connections to the primary stack: it reads check result records from Tier 3, and it reads from and writes to the SQL layer to trigger re-scoring after approved patches. NL queries operate on clean remediated data only.

This placement was chosen over Options A (spanning side panel) and B (gap zone component) because Option C is the only placement that makes all three agentic functions explicit and separable, and provides the cleanest boundary for eventual Endo integration. See Architecture Decision Record (April 8, 2026) Decision 1 for full rationale.

```
┌──────────────────────────────────────────┐     ┌──────────────────────────────────────┐
│         DETERMINISTIC PIPELINE           │     │       AGENTIC SIDECAR (optional)     │
│              [always on]                 │     │        [toggle on/off]               │
│                                          │     │                                      │
│  UI LAYER                                │     │  ORCHESTRATION LAYER (harness)       │
│  ┌──────────────────────────────────┐    │     │  Defines agents, rules, workflows    │
│  │  Deterministic Pipeline UI       │    │     │  Runs inside Endo compartment        │
│  │  + AI Drawer (connected to       │◄───┼─────┤  (post-POC)                          │
│  │    sidecar when toggle ON)       │    │     │  POC: Claude API direct              │
│  └──────────────────────────────────┘    │     ├──────────────────────────────────────┤
│                                          │     │  ENDO RUNTIME FOUNDATION (post-POC)  │
│  Tier 1  Raw Input                       │     │  Hardened JS compartments            │
│  Tier 2  Normalized                      │     │  Capability boundaries enforced      │
│  Tier 3  Check Results + Patches  ───────┼────►│  (1) suggestPatch reads from here    │
│  Tier 4  Use-Case Ready           ◄──────┼─────┤  (2) triggerRescore writes here      │
│                                          │     ├──────────────────────────────────────┤
│  SQL PRIMARY DATA MODEL (Neon)    ◄──────┼─────┤  MODEL LAYER                         │
│  patch_records                    ───────┼────►│  Frontier ZDR: Claude, OpenAI        │
│  remediation_work_items                  │     │  Local: Chime Ogbuji Qwen 3          │
│  check_results                           │     │  Routing: task type, cost,           │
│  use_case_readiness                      │     │  sensitivity                         │
│                                          │     ├──────────────────────────────────────┤
└──────────────────────────────────────────┘     │  ARCHIA RUST SANDBOX (post-POC)      │
                                                 │  Restricts external actions          │
                                                 │  Network, filesystem, syscall        │
                                                 └──────────────────────────────────────┘
                                                               │
                                                 ┌──────────────────────────────────────┐
                                                 │  NL QUERY OUTPUT                     │
                                                 │  (3) queryData — clean remediated    │
                                                 │  data only, never raw Tier 1         │
                                                 └──────────────────────────────────────┘
```

**Constraint from ADR Decision 1:** The agentic infrastructure never receives raw Tier 1 data. It reads only check result records (~200 bytes each) and approved SQL records. Token cost scales with the number of checks, not raw data volume.

---

## Human-in-the-Loop — Non-Negotiable

All AI-suggested patches require human approval before application. This is the third layer of protection — neither Archia nor Endo governs the content of AI suggestions before a human reviews them.

```
patch_status = 'proposed'   ← AI generates
        ↓
Human reviews in UI drawer
        ↓
patch_status = 'approved'   ← approved_by + approved_at set
    OR
patch_status = 'rejected'   ← rejection_reason set
        ↓
Re-score triggered (if approved)
```

This workflow enforces the governance principle before Endo integration — the database schema makes it structurally impossible to apply a patch without human approval.

---

## Abstraction Interface

Three functions corresponding to the three agentic backend roles defined in ADR Decision 1. The facade is swappable — backend implementation can change without touching callers.

```javascript
// Single facade — backend is swappable
const aiFacade = {

  // Function 1 — Patch suggestion
  // Reads check result records from Tier 3 (never raw Tier 1 data)
  // Triggered when: check engine surfaces FAIL with no existing deterministic rule
  suggestPatch: async (checkResult) => {
    // Returns: { patch_value, confidence_score, root_cause, expected_outcome }
    // Routes to: Claude API (POC) | Archia (post-terms) | Qwen (terminology)
  },

  // Function 2 — Re-scoring trigger (ADR Decision 1)
  // Reads from and writes to the SQL primary data model
  // Triggered when: a patch is approved (patch_status = 'approved')
  // Kicks off re-evaluation of check_results and variable_readiness_scores
  // for the affected patient(s) and use case(s)
  triggerRescore: async (approvedPatchId, patientId, sessionId) => {
    // Returns: { updated_check_results, updated_readiness_scores, use_cases_unlocked }
    // Writes to: check_results, variable_readiness_scores, use_case_readiness
  },

  // Function 3 — Natural language queries on clean remediated data
  // Operates on Tier 4 use-case ready data only — never raw Tier 1
  // Audience: non-technical care team and program coordinator users
  queryData: async (question, schema) => {
    // Natural language → SQL → formatted clinical answer (Step 9 — agentic layer)
    // Returns: { answer, supporting_data, confidence, source_tables }
  }

};
```

---

## Related Workstreams (Out of Scope for This Document)

**Patient consent delegation**
A planned future workstream. Covers consent capture, revocability, and reciprocity. Kris Kowal's Endo is a candidate for technical implementation. Timeline: post-POC.

**Governance project for trusted open source assets**
A separate workstream developing a governance framework for trusted open source health data assets. Shares principles with the CKM build but is a distinct effort.

---

## POC Implementation Plan

| Phase | Description | Status |
|-------|-------------|--------|
| 1 — Deterministic | Scoring engine, check_results, patch_records schema | ✅ Complete |
| 2 — Agentic POC | Claude API direct, abstraction interface, drawer connected | ⬜ Next |
| 3 — Harness evaluation | Archia assessment pending pricing terms | ⬜ Post-POC |
| 4 — Endo integration | Governance contracts, Kris Kowal engagement | ⬜ Post-demo |

---

## Vendor Summary

| Vendor | Contact | Role | Status |
|--------|---------|------|--------|
| Anthropic | — | Model (ZDR), POC implementation | Active |
| Archia | Gharib Gharibi, Andrew Rademacher | Execution sandbox + orchestration candidate | Terms TBD |
| Endo / Agoric | Kris Kowal | Runtime governance foundation | In discussion |
| Independent | Chime Ogbuji | Local model (Qwen 3, terminology) | In discussion |
