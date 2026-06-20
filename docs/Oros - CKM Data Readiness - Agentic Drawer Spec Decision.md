# Oros - CKM Data Readiness - Agentic Drawer Spec Decision

**Date:** June 20, 2026
**Status:** Decided. Architect to this.
**Purpose:** Locked decision on how the agentic side drawer behaves in the June 25 POC demo. This is the operative governing document for the demo drawer's behavior. It is narrower and more recent than the broader Agentic Layer Architecture and Agentic Security Explainer documents; where the demo drawer is concerned, this note takes precedence.
**Relationship:** Carries into the Demo UI/UX Specification. Implements the June 25 POC Scope Lock (agentic layer is conditional, first thing cut if time is short) and Build Plan Step 9.

---

## Context

The agentic side drawer surfaces an AI-generated remediation recommendation when a data-quality blocker is detected. Per the June 25 POC Scope Lock, the agentic layer is conditional (shown only if the deterministic path completes end-to-end) and is the first thing cut if time is short. The question was whether the recommendation should be real (live Claude API call) or mock (pre-scripted), and whether both modes can coexist and be switched.

## Decision: switchable source with automatic fallback

The recommendation comes from a single abstracted function (e.g. `getRecommendation(blocker)`) with two interchangeable implementations behind a mode flag:

- **Live mode:** calls the Claude API, generates the recommendation in real time.
- **Scripted mode:** returns a pre-written recommendation for that specific demo bug, instantly.

A single config flag (`AGENT_MODE: "live" | "scripted"`) selects the mode. The drawer UI, the displayed recommendation, and the human approve/reject interaction are identical in both modes, because both return the same data shape. The drawer does not know or care which mode produced the result.

### Automatic fallback (the safety net)

In live mode, if the API call is slow (e.g. exceeds roughly 3 to 4 seconds), errors, times out, or returns a malformed or off response, it silently falls back to the scripted recommendation for that blocker. The audience never sees a failure; worst case they see the correct scripted answer. A hidden manual toggle (keyboard shortcut) to force scripted mid-session is also desirable.

## What is real vs. mock in the drawer

| Drawer element | POC behavior | Notes |
|---|---|---|
| Trigger (drawer appears) | Real | Fires on a real blocker detected by the real deterministic engine, in service of the remediation story (not at a pipeline step, as in the old demo). |
| Recommendation content | Real with scripted fallback (switchable) | Default live; auto-falls-back to pre-scripted recs for the six known demo bugs. |
| Human approve / reject | Real UI | Always real. Cheap to build, sells the human-in-the-loop point. |

This maps cleanly to the three-state vocabulary: label the agentic layer **Demonstrated (stub)** when running scripted; point to live mode as the **Implemented** capability it is reaching toward. Honest either way.

## Recommendation data shape (the contract)

The switchable design depends on both modes returning the same shape. This shape is the linchpin and must be specified before either mode is built, so live conforms to what scripted establishes. The Demo UI/UX Specification should define it explicitly. At minimum it carries: the blocker/check it responds to, the proposed remediation in plain language, the responsible role, a confidence value (live) or null (scripted), and the fields the approve/reject UI needs to act. The drawer renders this shape identically regardless of source.

## Tradeoffs (for the record)

- **Live:** real credibility and "wow" (especially funders and technical audiences); but can be slow, vary run-to-run, or fail on stage, the worst moment for a credibility ding. Scope Lock flags it as cuttable.
- **Scripted:** instant, identical every run, never fails, fully rehearsable; but limited if someone probes beyond the pre-scripted bugs, and lacks live "wow."
- **Switchable plus auto-fallback (chosen):** live "wow" when it works (most of the time, for six known well-formed blockers), guaranteed reliability when it doesn't. Best of both for a high-stakes demo.

## Build order (important sequencing)

1. **Scripted mode first.** Build the drawer UI plus `getRecommendation()` with pre-written recs for the six demo bugs plus real approve/reject. This is the minimum-presentable agentic story (reliable for LACIE Wed / ICS Fri), AND it is the fallback, so it must exist regardless. Building it first also forces a clean recommendation data shape that live mode then conforms to.
2. **Get the entire demo solid with scripted mode.**
3. **Add live mode last,** behind the flag, with automatic fallback to scripted. This is the "first thing cut if time is short" item, but cutting it now just means leaving the flag on scripted, with zero loss to the rest of the demo.

So scripted is not an alternative to live, it is the foundation live sits on and the net it falls back to. We are building toward live without ever being dependent on it; the demo is presentable at any point in the build.

## Instruction for the UI/UX spec / Build

Architect the recommendation source as a single abstracted function with a mode flag and automatic scripted fallback, so live and scripted are interchangeable without UI changes. Pre-script recommendations for exactly the six demo bugs (known in advance) so the fallback is always high-quality and specific, not generic. Human approve/reject is always real.

## Data reset (related)

Reset uses the existing `demo_sessions` mechanism from the Data Model (is_active flag plus DELETE in reverse dependency order; raw CSVs persist for reload). For the demo, "reset" means re-point to a clean session / reload the dataset state (A, B, or C). Because results are pre-computed and persisted, reset does not re-run the engine. The persistence layer makes this clean between run-throughs and between the LACIE and ICS meetings.

## Out of scope (future)

Live user-driven exploration (letting users load data and run the real engine live in their own isolated session) is a genuine post-POC product direction the architecture already supports (per-session isolation). It is deliberately NOT in the POC: live user computation is the opposite of the reliable scripted walkthrough the meetings require. Nothing built now blocks it.
