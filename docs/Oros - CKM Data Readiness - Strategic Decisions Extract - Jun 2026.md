# Oros — Strategic Decisions Extract

**Purpose:** The connective source-of-truth for strategic positions that must stay consistent
across the deck, the Collaboration Framework (governance), the Build Plan, and the state-specific
pilot annexes. Extracted from the CKM Demo UX work so the deck and the canonical docs say the
same thing. This is a *reference*, not a place to restate facts that other docs own — see the
Facts Ownership Map (§8).

**Status:** Source-of-truth reference for cross-project strategic consistency. Reflects the
June 2026 multi-state reframing (supersedes April Colorado-first framing). The document-cleanup
this extract specified was completed 2026-06-15 (see §9).

---

## 1. What Oros is (identity — durable)

- Oros is the **neutral steward of shared infrastructure**, *earning* trust over time. Neutral
  is structural (by design, doesn't compete with any layer); trusted is earned through practice.
  Never claim "trusted" as a given.
- Oros **clears the bottlenecks that block better care, with open infrastructure anyone can
  use.** Data readiness is the **first** bottleneck/project — NOT the definition of Oros.
  Breadth lives in the identity ("shared infrastructure"); don't define narrowly. Do NOT name
  future bottlenecks (e.g., consent) publicly yet.
- Oros sits **upstream and parallel**, serving all parties (rural health programs, HIEs,
  payers, health systems) and competing with none. It makes their work more tenable via shared
  technical assets, know-how, and the plumbing to push/receive data.
- Oros does **not** build care delivery (RPM, care models) and does **not** do the operational
  clinical work. It makes data ready so others' tools and care models can run on trustworthy data.

## 2. Deployment strategy (OWNER: Build Plan Strategic Context)

- **Multi-state is the truth, regardless of any single state.** First implementation state is
  **TBD — Kansas more likely**, Colorado uncertain (delayed state RFA; CU Anschutz has not yet
  designated rural clinics). Be flexible and opportunistic; deploy where motivated sites,
  funding, and partners emerge.
- Colorado is **one candidate deployment context**, not "the pilot." The Colorado pilot doc is a
  state-specific annex under the multi-state umbrella, not the master strategy.
- Bridge model: temporary Oros-operated environment lets orgs start before permanent state/HIE/
  research hosts exist; eventual handoff of selected modules/workflows. ~3-yr, SOC 2 (possibly
  HITRUST), state-funding-extensible. (Deck + budget; not June 25 demo scope.)

## 3. License / IP / stewardship (OWNER: Collaboration Framework)

- **Apache License 2.0.** (Per Dan Connolly; the Collaboration Framework is correct and thorough
  on this.) Build Plan and pilot docs must REFERENCE the framework, not restate — kills the
  MIT/Apache drift permanently.
- Independent origin: CKM infrastructure developed independently (~2 years) prior to any funded
  institutional engagement. Funding a consulting engagement or pilot does NOT transfer ownership.
- Stewardship: Oros stewards the core; no institutional exclusivity; attribution runs to the
  individual; local adaptations belong to local institutions; generalizable components
  contributed back under Apache 2.0; CLA on contributions.

## 4. The two boundaries (this is what stops the "tripping")

The firewall is really **two distinct boundaries** doing two jobs. Separating them resolves the
recurring confusion.

- **Boundary 1 — IP / ownership (ABSOLUTE).** CKM software is independent, unpaid by RTA, owned
  by the open-source commons under Oros stewardship. **Backed in writing by the KUMC SOW**,
  which scopes the paid engagement as advisory/strategy only and explicitly excludes (§3)
  "software development, deployment, or maintenance," and names scoring engines, remediation
  tooling, dashboards, ingestion systems as out of scope; no PHI access; no BAA. This boundary
  never blurs.
- **Boundary 2 — public association / messaging (FLEXIBLE, governed by Boundary 1).** Being
  publicly known as RTA-supporting AND CKM-leading is fine, *as long as CKM never becomes
  RTA-owned or RTA-funded in fact or framing.* Association ≠ ownership. The neutral-steward
  identity actively *requires* serving RTA-type orgs.

**The anchor (write this down):** Oros is the neutral steward that sits upstream and parallel,
serving all parties including RTA. The firewall protects IP ownership (CKM independent + unpaid;
KUMC SOW excludes software), NOT public association. Known as RTA-supporting AND CKM-leading is
fine, provided CKM stays independent in fact and framing.

## 5. RTA treatment by context (resolves the partner-slide question)

- **Funding deck:** RTA stays OFF. Not because association is forbidden, but because (a) naming a
  specific downstream user undercuts the neutral-steward posture, and (b) until IP arrangements
  are formalized, public partner-billing risks blurring Boundary 1.
- **Kansas state-officials intro call (this week):** Introduce as RTA's data strategy &
  sustainability lead (true — the KUMC role), and *separately* mention the independent
  open-source CKM data readiness work. "Separately" is the firewall in the phrasing. Let CKM
  surface as "an unfunded gap that independent open infrastructure addresses," NOT as RTA's
  solution or an RTA deliverable. (Dan Tilden, RTA Co-PI / Kansas rural health lead, approved
  mentioning it "if it comes up in the right way," 2026-06-15.)
- **Watch:** don't let CKM get absorbed into "RTA's AI/data deliverable" (same trap as the AI
  assessment-vendor call). Re-separate gently: "RTA's work is RTA's; this is independent open
  infrastructure any rural health effort, including RTA's, could use." The KUMC SOW exclusion is
  the clean answer if anyone probes the relationship.
- **Colorado pilot doc:** RTA / Rising Tide Alliance / D-Data Dock should come OUT of the Colorado
  doc (RTA is a Kansas relationship; listing it in a Colorado plan is strategically odd and
  association-blurring). Use Tidepool / Glooko as the generic vendor-neutral aggregator examples
  there.

## 6. Positioning consistency (deck ↔ docs)

- Capabilities are **condition-agnostic functions** shown for diabetes ("risk stratification,
  shown here for diabetes"), never collapsed into fixed diabetes products. CKM is multi-condition;
  diabetes is the beachhead; whole-patient prioritization across comorbidities is the destination.
- Trust ordering: **deterministic pipeline = source of truth; AI = accelerant on top; human
  approves every change; capability enforcement is a requirement (Endo = leading candidate,
  shown as architectural not running).**
- Iterations are the product: biweekly co-design with local teams (technical + clinical workflows
  together); small passes compound; friction comes down over time. Care model belongs to the
  local team; Oros owns the data-readiness + data-flow requirements.

## 7. KUMC engagement facts (for accuracy; not for the deck)

- Oros AI LLC (Colorado entity). Contract: advisory/strategy for KUMC KRHTP Rural Diabetes
  Initiative; PI = Daniel Tilden, MD. $260/hr, $250k cap over 5 yrs (Apr 2026–Mar 2031),
  ~192 hrs/yr, front-loaded. Four KRHTP pilot sites named in SOW (internal only).
- Four workstreams: site data infrastructure assessment; data strategy & knowledge engineering
  advisory; sustainability planning; coordination/alignment. **All advisory; software excluded.**
- Draft under KUMC Contracts Office review (not yet executed).

## 8. Facts Ownership Map (one owner per fact; others reference)

| Fact | Owner document | Home / project |
|------|----------------|----------------|
| Deployment strategy (multi-state, which states) | Build Plan — Strategic Context | Core CKM project |
| License / IP / stewardship / attribution / contribution | Collaboration Framework | **Governance folder** (cross-project) |
| Neutral-steward identity / positioning | Collaboration Framework ("What Oros Is") | Governance folder |
| State-specific operational plan (Colorado partners, HCPF/Helmsley, sites, IRB) | Colorado pilot annex | Core CKM project (Collaboration & Partners subfolder) |
| KUMC engagement scope / IP exclusion | KUMC SOW | (contract) |
| Demo design (screens, narrative, UX) | CKM Demo UX Decisions Log | Demo project |
| Requirements / gap to production | Demo-to-Production Bridge | Core CKM project (feeds budget project) |

**Collaboration Framework placement:** move to the **Governance folder above CKM** — its
licensing/attribution/stewardship/anti-capture principles are cross-project commons governance;
CKM is the first project governed by it. Scrub CKM/Colorado-specific content from it (see §9).

## 9. Cleanup sequence — COMPLETED 2026-06-15

All edits below were executed in the core/governance projects on 2026-06-15. Recorded here as
a change history, not a to-do list.

**Governance folder — DONE:**
1. ✅ Collaboration Framework moved to the Governance folder (cross-project governance). Identity
   ("What Oros Is") reframed to neutral-steward/multi-state; "Scope & Evolution" de-Colorado-ized;
   "Colorado Pilot — Current Status" section removed and relocated into the Colorado pilot doc;
   subtitle changed to "Governance, Licensing & Partnership Principles for Oros Shared
   Infrastructure"; dated June 15, 2026. Framework still owns license/IP/attribution/stewardship.

**Core CKM project — DONE:**
2. ✅ Build Plan: MIT line replaced with Apache 2.0 + reference to the Collaboration Framework;
   the full IP/stewardship bullet list collapsed to a summary that points to the Framework as
   authority (resolved the attribution drift). Collaborator roster cleaned: removed Archia,
   Kris Kowal, Chime Ogbuji, Michelle Knopp; added Dan Connolly (governance + capability
   enforcement; the Endo connection); Sngular added as secure infrastructure and DevOps partner;
   no RTA/KUMC names present. Strategic Context owns multi-state deployment strategy.
3. ✅ Colorado pilot doc: reframed to "one candidate deployment context under the multi-state
   strategy"; all five MIT references → Apache 2.0 + Framework reference; RTA / Rising Tide
   Alliance / D-Data Dock removed (Tidepool/Glooko kept); relocated status content merged into
   §16 and reframed bridge-first (Oros-operated temporary bridge as the starting point, permanent
   regional node as a possible later transition); Framework citation dates updated to June 15, 2026.
4. ✅ Demo-to-Production Bridge and this Strategic Decisions Extract brought into the core CKM
   project.

**Maintenance discipline (ongoing):** one owner per fact; others reference. Update the owner, not
copies. Consider a one-page Document Index at the top of the core project mapping each doc to what
it owns and what it references.

## 10. Open follow-ups (not blocking)

- Tighten the bridge sequencing in §2 above to emphasize "bridge first, permanent host as later
  transition" (sharpened during the Colorado doc edit; §2 is directionally correct but could state
  the sequence more explicitly).
- Create the one-page Document Index for the core project.
- Reconcile any remaining "April 17, 2026" Framework-version citations elsewhere if found.
