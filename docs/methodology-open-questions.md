# Methodology — Open Questions

Status: living document. These are deliberate methodology decisions awaiting
resolution, most requiring Hanieh's input. They are NOT build tasks — they
concern how the method is framed and defended, not how the engine is coded.
Tracked here so they survive across work sessions and are revisited in a
dedicated methodology-triage pass, separate from the POC build.

Last updated: 2026-07-06

---

## 1. Weight basis — operational relevance vs. clinical construct

**Question:** Should variable/check weights be grounded in *operational
relevance* (how much a variable's data quality affects the decision a use case
drives) or in *clinical construct importance* (how important the variable is to
the clinical concept in the abstract)?

**Why it matters:** The platform's fit-for-purpose framing implies weights
should track operational relevance — the same variable may warrant different
weights across use cases because it matters differently to each decision. If
weights were set purely by abstract clinical importance, they would not vary by
use case, and the use-case structure would be decorative. Academically-principled
but operationally-disconnected weights would undercut the method's core claim.

**Direction (not final):** Operational grounding, with clinical expertise as the
means of assessing operational relevance — i.e. frame the weight question to
Hanieh as "how much does this variable's data quality affect THIS use case's
decision," not "how clinically important is this variable in general."

**Open sub-question:** In the absence of outcome data linking data-completeness
to decision outcomes, are clinically-principled weights a defensible interim
proxy? Decide whether to use construct-based weights now and validate
operationally later, or commit to operational grounding from the outset.

**Owner:** Hanieh + Dominique. **Status:** unresolved.

---

## 2. Device identity linkage — foundational vs. fit-for-purpose

**Question:** Is device identity linkage a *foundational* data-quality property
(Phase 1, general validity) or a *fit-for-purpose* one (Phase 2, use-case-specific)?

**Context:** Hanieh flagged that device identity linkage is arguably foundational
rather than fit-for-purpose. This is a genuine classification question that
affects how the method is structured and framed. Flagged as arguable; hold for
the methodology-triage pass — do not reclassify reflexively.

**Owner:** Hanieh + Dominique. **Status:** unresolved, hold for triage.

---

## 3. Terminology refinements

Deferred terminology adjustments for a later methodology-doc pass (not the build):

- Prefer **"conformant"** over **"validity"** where appropriate.
- Terminology checking spans **Phase 1** (general validity) and **Phase 2**
  (use-case-specific code presence) — reflect this distinction.
- Reframe derived-metric concordance as **"representational error."**

**Owner:** Dominique (doc pass). **Status:** queued.

---

## 4. Add-4 — DKA event validation (deferred, recorded for completeness)

Fully specified (coded DKA E08.1x/E09.10/E10.1x/E13.1x corroborated by labs
within 24h: glucose >200 with bicarb <15, or CO2 <15, or pH <7.35; ~10% with
insufficient labs flagged/excluded, not auto-remediable). Classified Phase 2
(fit-for-purpose), confirmed by Hanieh.

**Hanieh's input (2026-06-21 email exchange) — direction CONFIRMED:** the check
is *event validation* — verify a coded DKA event against corroborating clinical
markers — not encounter completeness.

**Confirmatory markers (per Hanieh):**
- **Primary:** ketones + pH.
- **Secondary** (because the primary markers resolve early in DKA treatment):
  a sharp upward deviation in glucose, insulin drip, and decreased bicarbonate.

**Temporal implication:** validation needs *early-treatment* values — the
primary markers (ketones, pH) normalize during treatment, so late-window labs
cannot confirm the event.

**Decision:** NOT built for the June 25 demo. Demoted to a roadmap/voiceover
credibility beat. Revisit as a built bug only on a real clinical-partner pull,
given disproportionate synthetic-data complexity (multi-table, time-aligned
diagnosis-to-labs join) vs. marginal demo value for a breadth-focused audience.

**Feasibility screen (2026-07-06):** confirms deferral. The marker set requires
new seeded lab and medication-administration data elements — ketones/pH/
bicarbonate observation rows, plus an insulin-drip *administration* signal that
the current prescription-oriented medications table doesn't carry. New machinery,
out of POC scope.

**Owner:** Dominique. **Status:** decided (deferred to funded phase); Hanieh's
input captured and ready if pulled post-funding.

---

## 5. Module scoping and the CKM scaling trajectory

**The observation (class mismatch):** The top-level config object is currently
modeled as a *condition* (diabetes, hypertension) that *has* use cases. But two
of the 7c stubs are not conditions — `care_coordination` and `vbc_reporting` are
*use cases* (purposes), not clinical conditions, and they span conditions ("DM
or HTN"). The one-file-one-condition build decision forces them into the
condition slot, so their `condition_id` equals their `use_case_name`. This is
acceptable for the demo (the stubs exist to prove loader genericity, not to model
clinical reality), but it hides a real modeling question: is the unit of the
system a *condition* (with use cases), a *(condition, use case) pair*, or a
*use-case module* that can exist independent of any single condition?

**The scaling dimension:** Today the platform evaluates one condition (diabetes)
for one use case. The trajectory is the full CKM scope — cardio-kidney-metabolic
— where fit-for-purpose evaluation "packages" grow from (1 condition × 1 use
case) toward (N conditions × M use cases), evaluated *together* and *across* use
cases. As that happens, the number of required inputs increases and the
combinatorial complexity rises. The data model will need to express
multi-condition packages and cross-condition use cases explicitly, rather than
collapsing everything into a single `condition_id`.

**The countervailing principle (a design value, not just a note):** As internal
sophistication and input complexity increase with CKM scope, we deliberately
push *against* that complexity. The purpose of the platform is to inform the
"now what" — the actionable next step in the workflow — for the people actually
doing the work. Sophistication and perfection must not get in the way of action
and the realities on the ground. A more expressive data model, a more refined
weighting scheme, a more complete check set are each worth pursuing only when
they make the next action clearer or more correct for someone on the ground —
not for their own sake. When precision and action conflict, action on the
realities on the ground wins; sophistication is deferred to a roadmap, not
allowed to block the workflow. This principle governs the modeling question
above and the methodology questions throughout this document.

**Owner:** Hanieh + Dominique. **Status:** open — revisit during the methodology-
triage pass and as CKM scope expands beyond single-condition diabetes.

---

## 6. Denominator / study-population validity

*Raised by Hanieh, 2026-06-21.*

**Question:** If a site shows many high-risk patients, is that real or an
artifact of the wrong base cohort/denominator — and what changes if the base
cohort is altered?

**Context:** This is a *cohort-definition validity* question, not a seedable
row-level defect — no synthetic bug can represent it. It is adjacent to
`layer6_denom_riskstrat` (the denominator eligibility check being built in 7d),
which enforces a *given* denominator rule but cannot say whether that rule is
the right one. It also resonates with the module-scoping open question (§5):
both are unit-of-evaluation questions — what population, defined how, evaluated
against what.

**Owner:** Hanieh + Dominique. **Status:** open — funded-phase methodology work,
not a POC bug.

---

## 7. Granular plausibility taxonomy

*Raised by Hanieh, 2026-06-21; flagged by her as "in the weeds," to be developed
as the system matures.*

**Question:** Should plausibility checking be decomposed into three distinct
kinds, each with its own evaluation logic?

- **Value plausibility** — the value is implausible regardless of use case.
  Nuance from Hanieh (transform-vs-evaluate): value plausibility *becomes*
  fit-for-purpose when evaluated against a use-case-specific range.
- **Terminology plausibility** — are the specific codes needed to express an
  event present?
- **Event plausibility** — could this event have happened to this patient given
  their history (e.g., DKA in a patient with a normal-A1C history)?

**Owner:** Hanieh + Dominique. **Status:** roadmap-tier, funded-phase.
