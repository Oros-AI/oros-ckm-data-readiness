# June 25 POC Scope Lock — CKM Data Readiness

**Status:** Locked for June 25 demo build
**Supersedes:** None (new scope-control document)
**Relationship:** Scopes the June 25 demo build. Does not alter Architecture Specification v1.2, Condition Module Schema v0.1, or any canonical methodology document. Canonical documents are updated to *reference* this scope, not to absorb new scope language.
**Last updated:** June 2026

---

## 1. Objective

The June 25 demo is a **Diabetes-first demonstration with CKM infrastructure visible.**

The live story is centered on **Diabetes Risk Stratification**: CGM and EHR data, device readiness, and the remediation arc that unlocks operational capability. The surrounding demo makes the full CKM data readiness infrastructure visible through real check results, remediation routing across multiple stakeholder roles, and the clinical quality reporting story.

The objective is **not** to demonstrate the full CKM platform. It is to demonstrate a compelling Diabetes-focused slice while preserving the full CKM architecture (Diabetes, Hypertension, Heart Failure) for future expansion.

The distinction that governs every scope decision in this document: the demo is *Diabetes-first*, not *Diabetes-only*. The half of the demo that makes it a data readiness *infrastructure* rather than a diabetes data-quality tool — multi-stakeholder remediation routing, governance, standards and reporting readiness — is retained.

---

## 2. Audience

The demo is built for a room evaluating whether this is infrastructure worth funding and standing up, not whether diabetes scoring works in isolation.

- **Funders** (e.g., Helmsley) — need to see operational capability unlock, breadth beyond a single condition, and a credible path to scale.
- **Quality / standards bodies** (e.g., NCQA) — need to see the Clinical Quality + VBC reporting readiness story and standards remediation.
- **Clinical collaborators** — need to see clinically coherent readiness logic (CGM primary / A1C fallback) and that the methodology reflects real clinical judgment.

The `demo_sessions.audience_type` field already supports audience-specific views (NCQA, ACO, Clinician, Admin, Funder); no change is required to support this audience set.

---

## 3. Core Question Being Answered

> **Can the available data for this population support a specific operational capability, and if not, what specifically must change?**

The platform identifies blockers, routes remediation to the responsible role, and shows what capability becomes possible after remediation.

Capabilities surfaced in the demo:

- Diabetes Risk Stratification
- Diabetes Care Coordination
- Clinical Quality + VBC Reporting

---

## 4. In Scope

- **Diabetes condition module** — implemented and demonstrated live (CGM-first risk stratification pathway, with A1C-supported fallback logic as defined in the Use Case Specification, real scoring). The fallback pathway and its A1C checks are on the build critical path (Build Plan Step 7f/7h), not yet coded as of this Scope Lock.
- **Diabetes Risk Stratification** — the primary narrated use case, with full pathway logic.
- **Full six-bug remediation narrative** (Option A) — all six bugs surface, each showing what failed, which capability is blocked, who is responsible, and what unlocks after remediation.
- **Stub condition modules** (hypertension, care_coordination, vbc_reporting) — retained to carry Bugs 3, 4, and 5; to demonstrate multi-stakeholder routing; and to prove the config loader is generic (next condition is one config file away).
- **Clinical Quality + VBC Reporting** — demonstrated through the vbc_reporting stub and Bug 5; presented under the widened display name.
- **Datasets A → B → C**, preloaded. No live ingestion.
- **Deterministic scoring pipeline** as the source of truth.
- **Human-in-the-loop agentic recommendation** — demonstrated *if* the deterministic pathway completes end-to-end first (see §7 and §8). Not a guaranteed deliverable.

---

## 5. Out of Scope (June 25)

- **Live data ingestion.** The demo runs entirely on preloaded A/B/C datasets.
- **Hypertension and Heart Failure as implemented conditions.** Cohort data is loaded and a hypertension stub fires Bug 3, but no full use-case execution logic exists for these conditions. They are architectural.
- **Constraint-enforced agentic automation via Endo.** Described as future-state vision only; not built and not committed for June 25.
- **Multi-condition / cross-condition use cases** (e.g., joint DM + HTN stratification).
- **Any new Use Case Category.** The enum value `vbc_reporting` is frozen. Only its display name and description change to "Clinical Quality + VBC Reporting."
- **Agentic recommendation as a committed deliverable.** It is conditional on the deterministic path finishing first.

---

## 6. Demo Narrative

The demo answers the core question across three dataset states for a Diabetes-first population, with the full infrastructure visible through the six-bug arc.

**Arc:** Dataset A (clean) → Dataset B (issues surfaced) → Dataset C (remediated) → capability unlocked.

**Operating model shown:**
1. Deterministic scoring pipeline produces readiness results (source of truth).
2. Agentic layer proposes remediation recommendations (if demonstrated).
3. Human approves before any change is applied.

**Six-bug narrative (retained in full).** The canonical bug-to-capability-to-role mapping lives in the Build Plan demo narrative table and is not duplicated here. In summary, three bugs block Diabetes Risk Stratification directly (device identity linkage, CGM temporal density, TIR derived-metric concordance), and three exercise the broader infrastructure: missing smoking status (hypertension stub), invalid terminology codes (care coordination), and date-format non-conformance (clinical quality + VBC reporting). Each bug routes to a different responsible role, which is the multi-stakeholder governance story that distinguishes the platform from a single-condition scoring tool.

The Diabetes/CGM worked example in the Methodology Architecture is the lead methodological illustration for the demo. (The existing Blood Pressure / Hypertension worked example in that document remains valid and is not rewritten; it is simply not the demo's lead example.)

---

## 7. Implemented vs. Demonstrated (stub) vs. Architectural

This table is the single reference for what June 25 actually delivers at each level. It exists to prevent any reader from over-reading the demo's scope or under-reading its breadth.

**Vocabulary:**
- **Implemented** — full use-case execution logic exists and runs.
- **Demonstrated (stub)** — real checks, bugs, routing, and outputs exist and run; only limited (boolean) execution logic is implemented.
- **Architectural** — architecture and data exist, but no executing use case is demonstrated.

| Area | June 25 State | What this means |
|------|---------------|-----------------|
| Diabetes Risk Stratification | **Implemented** | CGM-first pathway with A1C-supported fallback as defined in the Use Case Specification; real continuous scoring and threshold bands. Fallback checks are on the build critical path (Step 7f/7h). |
| Diabetes Care Coordination | **Demonstrated (stub)** | Stub module, boolean aggregation; Bug 4 fires, real remediation routing. |
| Clinical Quality + VBC Reporting | **Demonstrated (stub)** | Stub module, boolean aggregation; Bug 5 fires, real remediation routing. |
| Hypertension Risk Stratification (use case) | **Demonstrated (stub)** | Stub module, boolean aggregation; Bug 3 fires; proves the loader is generic across conditions. |
| Hypertension (as a clinical condition) | **Architectural** | Cohort data loaded; no implemented condition module beyond the RS stub. |
| Heart Failure (as a clinical condition) | **Architectural** | Cohort data loaded; no implemented or stubbed use case. |
| Agentic Recommendation | **Demonstrated — conditional** | Step 9. Demonstrated **only if** the deterministic pathway completes end-to-end first. Not a guaranteed deliverable. |
| Constraint-Enforced Automation (Endo) | **Future-state** | Described as vision only. Not built, not committed for June 25. |

Note on Hypertension: the *use case* (Hypertension RS, via Bug 3) is Demonstrated (stub) because the stub runs and produces real check results and routing. The *condition* (Hypertension as a clinical domain) is Architectural because no full condition module exists. Both statements are true and they refer to different things; the split rows above keep that distinction explicit.

**In plain terms (for non-technical readers):** Hypertension is included to demonstrate extensibility and remediation routing, not as a fully implemented condition.

---

## 8. Success Criteria

- [ ] Diabetes Risk Stratification pipeline runs end-to-end across Datasets A, B, and C with no manual intervention.
- [ ] All six bugs surface against Dataset B with correct use-case blocking, phenotypes, and stakeholder routing (Build Plan Step 7k).
- [ ] Dataset C re-scores correctly: blocked use cases unlock and pathway results update (Build Plan Step 7l).
- [ ] Each demonstrated bug shows, on screen: what failed, which capability is blocked, who is responsible, and what unlocks after remediation.
- [ ] "Clinical Quality + VBC Reporting" display language is consistent across every surface a human sees; no underlying enum or string was changed to achieve it.
- [ ] CKM architecture is visibly intact: stubs and the generic loader make "next condition = one config file" legible to the audience.
- [ ] Session reset returns cleanly between demo runs.
- [ ] **If and only if** the deterministic path passes end-to-end: agentic recommendation is demonstrated with human approval in the loop. If the deterministic path is not complete, the agentic layer is not shown, and this is not counted as a missed deliverable.

---

## 9. Implementation Priorities (ranked)

1. **Diabetes Risk Stratification critical path** — Build Plan Step 7a–7j (Neon migration, config loader, diabetes.config.json, the five checks on the critical path, aggregation, pathway evaluation, use-case readiness writer, work-item generator).
2. **Six-bug end-to-end verification** — Build Plan Step 7k/7l against Datasets B and C.
3. **Clinical Quality + VBC Reporting rename** — applied to display/description layer only. No schema, config, loader, database, or code change.
4. **Stub modules (hypertension, care_coordination, vbc_reporting)** — retained and validated so Bugs 3/4/5 route correctly and the loader proves generic.
5. **Agentic recommendation layer (Step 9)** — only after priority 1 passes end-to-end. Conditional, not committed.

The ranking encodes the central risk discipline: nothing about the broader infrastructure story (priorities 3–4) or the agentic layer (priority 5) is allowed to displace the Diabetes RS critical path (priorities 1–2). If time is short, the agentic layer is the first thing cut, and the scope lock already accounts for that.

---

## 10. Frozen Strings / Do Not Change

The following are frozen at the data layer. Display renames never touch them.

- **Use case category / `use_case_name` enum values:** `risk_stratification`, `care_coordination_delivery`, `vbc_reporting`.
- **Stub config identifiers / filenames:** `vbc_reporting.config.json`, `care_coordination.config.json`, `hypertension.config.json`, and the `conditions/diabetes/diabetes.config.json` contract.
- **Check names** referenced in configs (e.g., `layer5_date_concordance`, `layer3_mapped_values`, `layer6_denom_riskstrat`).

"Clinical Quality + VBC Reporting" is a presentation-layer label applied to display names, descriptions, document prose, and demo screens. If the rename appears to require touching a schema, config, loader, database value, or check name, that is the signal to stop: the change has exceeded its scope.

---

## 11. Relationship to Canonical Documents

This document is the operational source of truth for June 25 demo decisions. Canonical documents reference it; they do not absorb its scope language. The companion Document Impact Matrix records which canonical documents require updates after this Scope Lock is approved, and which were reviewed and deliberately left unchanged. Documents confirmed as requiring no change (Data Model, ADR, Governance Framework, Synthetic Dataset Specification) are recorded as such so the absence of an edit is understood as a deliberate decision, not an oversight.
