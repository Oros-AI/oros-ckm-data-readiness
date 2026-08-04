# Clinical Information Needs and Flows

*Oros CKM Data Readiness Infrastructure*

*Version 1.1 \| August 4, 2026*

*© 2026 Oros. Released under the Apache License 2.0.*

## 1. Purpose and Positioning

This document answers one question: what information is required to make each clinical workflow operationally possible and sustainable, and how must that information move?

Every clinical program depends on information arriving in the right place, at the right time, in usable form. A care team cannot review patients it cannot see. A quality report cannot be submitted without the measures it requires. A risk review cannot run on data that never arrives. Yet the information a program needs is rarely written down in one place. It lives in the heads of the people who run the program, in vendor contracts, in interface specifications, and in habits that formed years ago for reasons no one remembers. This document exists to make those needs explicit, so that a site can see what its programs require, where that information comes from today, and what would have to change for the programs to work better.

This document is a compass, not a map. It gives you the reasoning pattern for deriving information needs from clinical work and a shared vocabulary for describing how information moves. It does not chart every feed, interface, and program a site might encounter. That level of detail belongs in the companion references and, above all, in each site’s own specification. The document is intentionally minimal. Sophistication accrues in the companions and in the site-specific work, not here.

This work was developed independently by Oros, and is offered to the Rising T1DE Alliance and to any organization committed to helping patients live better lives.

**Scope boundary.** The generic framework in this document is open under Apache 2.0 and is complete as it stands. It does not depend on contributed content to be useful. Site adaptations, meaning the specific flows, configurations, and program lists for a given organization, are produced per engagement and belong to the sites that shape them.

**Neutrality.** This framework has opinions about information: what a workflow needs, how a flow should be described, and what makes a configuration sustainable. It has no opinions about vendors. Where products or platforms are mentioned anywhere in this document set, they are described as members of a class, not endorsed. Configuration choices belong to sites. Licensing, attribution, and stewardship terms are governed by the Oros Collaboration Framework and are not restated here. This framework was authored by Oros as independent work; attribution and stewardship terms are governed by the Oros Collaboration Framework.

**Two principles carried throughout.** First, information needs are stable while acquisition pathways are fluid. What a diabetes care program needs to know about a patient changes slowly, on the timescale of clinical evidence. How that information reaches the care team changes quickly, with contracts, products, and regulation. This document therefore anchors on needs and treats pathways as configurations that evolve. Second, pathway maturation is justified by what it unlocks in care. A site upgrades a feed, adds an interface, or changes a data pathway because doing so makes a clinical workflow possible, faster, or more sustainable. Interoperability is never pursued as self-improvement.

**Institutional home.** This document is the methodology artifact for Capability 1, Ecosystem Stewardship, in the Oros Capability, Expertise and Stewardship Model. That capability is oriented around a recurring set of questions: what data is required, who needs it, when, and why, and how does it integrate into care delivery? This document is where those questions are answered in a form a site can work with.

## 2. The Derivation Chain

Information needs are never invented. They are derived, and the derivation always follows the same chain:

**Workflow → decision supported → information needed → data elements → flow**

Start with a clinical workflow: something a care team actually does. Ask what decision that workflow supports. Ask what information is needed to make that decision well. Translate that information into specific data elements. Then specify the flow: how those elements move from where they originate to where the decision is made.

A brief example. A nurse reviews a weekly list of patients whose home readings suggest worsening control. The decision supported is which patients need outreach this week. The information needed is recent home readings, alongside enough clinical context to interpret them. The data elements are the specific measurements and context items involved. The flow is the path those elements travel: from the patient’s device, through whatever carries them, to the screen the nurse is looking at on review day.

Two rules govern the chain.

**Data elements are references, not definitions.** When this document or a site specification names a data element, it points to the shared Variable Library defined in the Architecture Specification. This document never defines a variable, its code sets, or its extraction logic. That discipline is what keeps a site’s information flow specification consistent with the rest of the infrastructure: everyone points at the same definition rather than maintaining private copies.

**A flow is specified completely or not at all.** A flow is described by eight attributes: the elements it carries (as Variable Library references), its source, its transport (what carries the information between source and destination, and what that carrier does to the data in passing), its destination, its direction (inbound to the site, outbound from it, or a return path back to a source), its trigger (what causes information to move), its cadence (how often it moves), and its consent precondition (what permission must be in place before it moves). A flow missing any of these is not yet specified. Most operational surprises trace back to an attribute nobody wrote down.

**Source, transport, and destination are roles, not organizations.** The same organization may be a source in one flow, a transport in another, and a destination in a third. A regional data node might carry lab results inbound in the morning and receive a quality extract outbound in the afternoon. Describing flows in role terms keeps a site’s specification honest when the surrounding ecosystem changes, because the roles persist even when the organizations filling them do not.

**Destinations are first-class.** Where information lands is a decision, not an afterthought. The destination is chosen by the site based on where the decision is actually made: a worklist, a dashboard, a registry, a report, an inbox. A flow that arrives somewhere nobody looks has not arrived.

## 3. Three Requirement Origins, One per Use Case Category

Information requirements do not all come from the same place. Some arrive fully specified from outside the site. Some follow from the clinical condition itself. Some exist only because a local team decided to work a particular way. The three use case categories in the Oros taxonomy correspond to these three origins, and each one is discovered differently.

One clarification before the chapters. Referral management is a workflow, not a category. It sits inside care coordination and delivery, alongside outreach, medication management, and the other things care teams do. The taxonomy has three values, not four.

### 3.1 Externally Authored: Clinical Quality and VBC Reporting

Requirements in this category are written by someone else. A quality program, a value-based care contract, or a reimbursement model specifies what must be measured, over which population, in which period, and to what standard. The site does not derive these requirements. It inherits them by choosing to participate.

Discovery here is therefore enumeration rather than analysis. The question is simply: which programs does this site participate in today, and which is it targeting? Each named program brings a defined measure set, which resolves into required data elements, which resolves into flows. The chain runs the same direction as always, but the first two links are already filled in by the program’s own documentation.

The CMS ACCESS Model illustrates the pattern. Its cardio-kidney-metabolic track covers beneficiaries with diabetes, chronic kidney disease at stage 3a or 3b, or atherosclerotic cardiovascular disease, and payment is contingent on achieving track-specific clinical outcome targets defined relative to each beneficiary’s baseline, focused on improvement or control. A site participating in that track does not get to decide what to measure. It must produce baseline values, periodic updates, and final outcomes on a defined schedule, which means the flows carrying those elements must exist, must run on the required cadence, and must reach a destination from which reporting can be produced. Participants submit baseline measures within 60 days of a beneficiary’s alignment date, provide quarterly updates during the twelve-month care period, and submit final outcome data no later than 425 days after alignment. Cadence requirements of that kind are the most common reason an externally authored program turns out to be infeasible on a site’s current pathways.

One state deserves naming because it is common and often mishandled. A site may have identified a program it intends to join before that program’s requirements are stable. Newer models publish guidance in stages, and operational detail can lag the announcement by months. The correct response is to record the program as identified with requirements not yet stable, capture what is known, and revisit. This is a legitimate entry in a site specification, not a gap in it. Treating an unstable requirement as if it were settled produces flows built to the wrong specification, which is more expensive than waiting.

### 3.2 Therapeutically Authored: Risk Stratification

Requirements in this category come from the condition. What makes a patient with diabetes higher risk than another is a clinical question, answered by evidence and shaped by what the available devices and measurements can actually see. No external program dictates it, and no local preference invents it. It follows from the therapeutic area.

The practical pattern is published baseline with local refinement. A site does not design stratification criteria from scratch. It starts from published, peer-reviewed criteria for the condition, then refines them to fit its own population, capacity, and review cadence.

The Stanford 4T work is the worked example. 4T, meaning Teamwork, Targets, Technology, and Tight Control, is a program developed at Stanford for youth with newly diagnosed type 1 diabetes, combining early continuous glucose monitoring initiation, team-based education, and remote data review. The published pilot results reported lower HbA1c in the 4T cohort than in a historical cohort at 6, 9, and 12 months after diagnosis, with a technology-enabled, team-based approach involving target setting, CGM initiation, and remote data review. The associated prioritization tool, TIDE, gave the care team a way to work the resulting population at scale: an algorithm ranks patients by their number of flags, meaning indicators of glucose outside of targets, and then by ascending time in range, so that a reviewer opens the list already sorted by who most needs attention. In practice, certified diabetes care and education specialists use the dashboard to prioritize patients for review based on adapted consensus guidelines.

Note the scope honestly. The 4T literature addresses pediatric type 1 diabetes, and the population, targets, and review cadence reflect that. It is cited here as a pattern, not as criteria to be lifted. A rural site working with adult type 2 diabetes would follow the same pattern, meaning start from published consensus criteria for its own population, then adapt, and would arrive at different numbers. Note also the phrase “adapted consensus guidelines” in the published description. Even the exemplar refined its baseline locally. That is the pattern, not a deviation from it.

Two implications for information needs follow. First, criteria of this kind are computed from device time series, which means the flow must deliver not just values but sufficient density of values, since a time-in-range calculation on sparse data is not a weaker answer but a different and misleading one. Second, the same clinical intent can often be served by more than one pathway. The Methodology Architecture defines the ordered-pathway model that governs this: the device pathway is evaluated first, with the EHR-derived measure available as fallback, and neither is clinically subordinate to the other. This document does not restate that model, it points to it. What belongs here is the consequence: a site’s risk stratification flows should record which pathway is currently in use and which is available as fallback, because the achievable review cadence differs between them.

Published criteria also change. Consensus guidelines are revised, new evidence lands, and the device landscape shifts underneath both. Requirements in this category are the most stable of the three over a one-year horizon and among the least stable over a five-year one.

### 3.3 Locally Authored: Care Coordination and Delivery

Requirements in this category exist because a local team designed a way of working. There is no external specification and no published baseline. A clinic decides that a nurse reviews a flagged list on Monday mornings, that outreach happens by phone with a portal message as fallback, that a patient not reached in two attempts is escalated, and that a referral to endocrinology carries a specific packet of context with it. Every one of those decisions creates information requirements, and none of them was written down anywhere before the team made them.

The Operational Care Model owns these workflows and the functions within them. This document does not define what care teams do. It derives what their doings require. Given a workflow described by the clinical team, the derivation chain runs normally: what decision does this support, what information is needed to make it well, which data elements carry that information, and how must they move.

Referral management belongs here, and it is the workflow that most often exposes return-path gaps. Information moving outbound to a specialist is usually solved. Information coming back, meaning what the specialist found, what changed, and what the primary team should now do, is frequently carried by fax, phone, or nothing at all. A site specification that records only outbound flows will look complete and will not be.

This is explicitly the chapter that gains resolution through operation. At initial discovery, a site can usually describe its care coordination workflows only in outline, because much of what the workflow actually requires becomes visible when people start doing it. A first pass captures the intended design. The second pass, after some months of operation, captures what the design turned out to need. That is expected, and section 5 treats it as the normal condition rather than as incomplete work.

## 4. Working with Reality: Configurations and Trajectories

The derivation chain tells you what a workflow needs. It does not tell you what a site currently has. That gap is where most of the real work lives.

Every flow has a **current configuration**, meaning the way that information actually moves today, and a **target configuration**, meaning the way the site has decided it should move. The target is chosen by the site and recorded with its rationale. There is no canonical summit and no ranking of configurations from worse to better. A site running a nightly batch extract that reliably feeds a weekly review has a configuration that works, and it is not obliged to want a real-time interface. Another site with the same workflow may want the interface because it intends to move to daily review. Both targets are correct because both are anchored to what the site is trying to do clinically.

The **bridge** is the gap between current and target. Naming it that way keeps attention on the distance to be closed rather than on the deficiency of the present state. A bridge may be closed in one step, in several, or never, and a site that decides not to close a bridge has made a legitimate decision as long as the decision is recorded.

### Consequences, in a fixed vocabulary

Configuration choices have consequences, and describing them in consistent terms is what makes them comparable across flows and discussable with non-technical leadership. Five terms are used throughout:

- **Cadence.** How often information can move. A weekly file transfer cannot support a daily review, no matter how good the data inside it is.

- **Granularity.** How much detail survives the journey. A summary document carrying a single monthly average and a device feed carrying every reading both deliver the same clinical concept at very different resolutions, and only one of them supports a time-in-range calculation.

- **Cost.** What the configuration takes to establish and to keep running, including interface fees, staff time, and vendor charges. Ongoing cost is usually the part underestimated.

- **Dependency.** What or whom the configuration relies on. A flow depending on a single individual’s manual export has a dependency risk that a flow depending on a maintained interface does not.

- **Reimbursability.** Whether the configuration produces what a payment or quality program requires, in the form and on the schedule that program specifies. A pathway can be clinically adequate and still fail a program requirement.

**The cadence constraint, stated plainly: the pathway sets the achievable tempo.** A workflow cannot run faster than the information reaching it. This is the most common source of frustration in program design, because clinical teams design the workflow they want and discover the tempo constraint afterward. Upgrades buy tempo. That is usually the honest justification for a pathway change, and it is a better one than any abstract appeal to interoperability.

### Non-technical factors are legitimate

Configuration decisions are shaped by budget, existing vendor relationships, leadership preference, and available integration capacity, and these are legitimate inputs rather than obstacles to the correct technical answer.

### The environment moves

Pathway viability is not fixed. Products change their export capabilities, contracts expire, vendors are acquired, regulatory requirements shift what must be supported, and payment programs change what they will pay for. A configuration that was unavailable at initial discovery may be available two years later, and one that worked may stop working. Re-discovery therefore revisits two things at once: what the site now wants, and what the environment now offers. Neither alone is sufficient.

### Access basis

Each configuration records the basis on which the site has access to the information, because that basis determines how durable the flow is. Four classes cover most cases: **operational contract**, **research protocol**, **grant-funded pilot**, and **informal arrangement**. All four can carry real clinical value. They differ in what happens when circumstances change. A flow resting on a grant-funded pilot has a known end date. A flow resting on an informal arrangement rests on a relationship. Recording the basis is not a judgment about the flow, it is a statement about what would have to be renewed, renegotiated, or replaced for the workflow to survive.

### The negotiation loop

Sometimes the information a workflow needs cannot be delivered as the workflow was designed. When that happens there are exactly three responses:

- **Adapt the workflow** to what the available information can support. Move the review from daily to weekly. Narrow the population. Change the trigger.

- **Bridge the gap** by changing the configuration so the information becomes available. This costs time and money and should be justified by what it unlocks in care.

- **Accept the limitation** and run the workflow knowing it is operating with less than was intended.

All three are valid. What is not valid is leaving the choice unmade, because an unmade choice becomes a workflow that quietly underperforms with no one accountable for why. The decision is recorded, and where a limitation is accepted, the concession is recorded explicitly with the named local authority who accepted it. That naming matters. Concessions accepted by an identified clinical or operational leader are revisitable decisions. Concessions absorbed by no one become permanent by default.

## 5. From Framework to Site

Instantiation is cyclical, not an event.

The first discovery pass captures what is knowable at the time, and the three requirement origins are knowable to very different degrees. Reporting requirements can be captured nearly in full, because the programs are enumerable and their requirements documented. Risk stratification can be captured substantially, because published criteria and the site’s device landscape are both largely visible up front. Care coordination can usually be captured only as a sketch, because much of what those workflows require becomes apparent only once people are doing them.

A specification that reflects this asymmetry is accurate. One that presents all three at equal resolution is not, and it invites a build against requirements that were guessed.

Resolution accrues through operation. Flows turn out to be missing attributes nobody thought to record. Return paths that were assumed to exist turn out to be phone calls. Cadences that looked adequate turn out to be a day too slow. Each of these becomes a revision, and the specification is designed to be revised.

The engagement produces a **Site Information Flow Specification**, written in the open format defined in Companion C, using the discovery template in Companion B. The format is open even where the content is not. A site’s programs, pathways, vendors, and concessions are its own. The structure used to describe them propagates freely, which is what allows sites to compare notes, allows the framework to improve, and allows a site to change partners without losing the record of how its own information moves.

Change management sets the pace. The rate at which a site can absorb workflow change, not the rate at which pathways can be technically improved, determines how quickly a specification moves from current toward target configurations. This document names that force so it is planned around rather than discovered late. Guidance on managing it belongs to the clinical transformation work, not here.

## 6. Relationships

The division of labor is simple. The Operational Care Model defines what clinical teams do. This document defines what information those doings require and how it moves. The readiness infrastructure evaluates whether the data can actually deliver it.

| **Document**                                | **Relationship**                                                                                                                                                        |
|---------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Operational Care Model                      | Owns clinical workflows, functions, and the role flexibility around them. This document derives information requirements from those workflows and defines none of them. |
| Methodology Architecture                    | Owns readiness evaluation, the two-phase readiness model, and the ordered-pathway model. This document points to that evaluation and performs none of it.               |
| Architecture Specification                  | Owns the canonical three-object model and the Variable Library. All data element references in this document and in site specifications resolve to definitions there.   |
| Oros Collaboration Framework                | Owns licensing, attribution, and stewardship terms. Not restated here.                                                                                                  |
| Capability, Expertise and Stewardship Model | Situates this document as the methodology artifact for Capability 1, Ecosystem Stewardship.                                                                             |

**Handoff point.** Derived information needs become inputs to Use Case Specification authoring. When a site’s specification establishes that a workflow requires certain elements at a certain cadence with certain completeness, those become the requirements that a Use Case Specification encodes as population definitions, variable application rules, and data quality requirements. This document produces the clinical and operational statement of need. The Use Case Specification is where that need becomes executable.

**Boundary.** The flow layer sits outside the three-object model and amends nothing within it. Variables, Condition Modules, and Use Case Specifications are unchanged by anything in this document. What is added is a layer describing how information reaches the point where those objects operate.

## 7. Evolution

This framework improves through use.

Field learnings inform the baseline through a governed mechanism, so that what is learned at one site can strengthen the generic framework without any site’s specifics leaking into it. The mechanism itself is defined by the governance work rather than here.

Knowledge sharing is the engagement norm. Sites that work with this framework are expected to learn from each other’s experience, and the open format exists partly to make that possible.

Contribution of workflow content under Apache 2.0 is a welcomed option, never an expectation. A site may choose to contribute generalized workflow patterns back to the commons under the terms in the Collaboration Framework. A site that contributes nothing is a full participant.

**Humility clause.** The generic content in v1.0 was written before the first instantiation. It is expected to be revised by that instantiation and by the several that follow. The structure is intended to survive. The specifics are not yet earned.
