# Companion C: Site Information Flow Specification Format

*Companion to Clinical Information Needs and Flows*

*Oros CKM Data Readiness Infrastructure*

*Version 1.0 | August 3, 2026*

*© 2026 Oros. Released under the Apache License 2.0.*

# C.1 Purpose and Status

This companion defines the structure of a Site Information Flow Specification, the artifact produced when the framework is instantiated at a site.

The format is open. The content is not. A site’s programs, pathways, vendors, configurations, and concessions belong to the site. The structure used to describe them is released under Apache 2.0 and propagates freely. This separation is deliberate: it allows sites to compare notes, allows the framework to improve from what is learned, and allows a site to change partners without losing the record of how its own information moves.

The format specifies what must be recorded, not what the answers should be. Where an attribute calls for a site determination, the framework supplies no default. A specification with honest gaps is more useful than one with invented completeness.

# C.2 Conventions

**Pointer discipline.** Data elements are recorded as references to the shared Variable Library defined in the Architecture Specification. A specification never defines a variable, its code sets, or its extraction logic. If a workflow appears to require an element with no Variable Library entry, that is recorded as an open item and routed to variable authoring, not resolved locally.

**Role vocabulary.** Source, transport, and destination are roles. The same organization may occupy different roles in different flows. Record the role as filled in the specific flow, not the organization’s general character.

**Resolution asymmetry is expected.** Sections of a specification will be complete to different depths at any given time, and this is a property of the work rather than a defect in the document. Reporting requirements are usually capturable in full at first pass. Risk stratification is usually capturable substantially. Care coordination is usually a sketch that gains resolution through operation. Completeness claims are made per section, not for the specification as a whole.

**Unknown is a valid entry.** Any attribute may be recorded as not yet determined, with a note on what would resolve it. An attribute left blank is ambiguous between unknown and overlooked. Attributes are not left blank.

**Presentation by workflow.** Flow records are stored as a flat set, each with a stable identifier, and are presented grouped by the workflow they serve. A specification carrying several dozen flows is not readable as a list. Grouping by workflow lets a clinical or operational reader see, for one workflow, which elements it depends on, where each comes from, how it travels, and how often. The same flow may appear under more than one workflow, and it remains one record.

# C.3 Site-Level Sections

## C.3.1 Specification Identity

Site name, engagement identifier, specification version, date of current version, and the person or role accountable for maintaining the specification.

## C.3.2 Program Enumeration

This section records the externally authored requirements the site operates under. It is the origin of a substantial share of the site’s information needs, and it is the section most subject to change from outside the site.

**This section carries its own as-of date and its own revision history, independent of the specification as a whole.** Programs, payment rules, and billing interpretations move on a clock unrelated to the site’s operational learning. A site may leave its flows unchanged for eighteen months while its reimbursement picture changes twice. Dating this section separately makes the shelf life of its contents visible, so a reader can tell whether the sustainability picture has been confirmed recently or has quietly aged.

Recorded for the site:

- **Programs participated in.** Each clinical quality, value-based care, or reimbursement program the site currently participates in. Record the program name, the administering entity, and the site’s current status in it.

- **Programs targeted.** Programs the site intends to join but has not yet entered. Where a program has been identified but its operational requirements are not yet stable, record it in that state explicitly. Capturing what is known and marking the rest as pending is correct. Encoding a guess as a requirement produces flows built to the wrong specification.

- **Active remote patient monitoring program under fee-for-service.** Recorded as a distinct fact, present or absent, because it carries different operational and documentation obligations than value-based arrangements and often coexists with them. Where present, record the conditions or populations it covers.

- **Payment schema per program.** Fee-for-service, value-based, or a defined combination. The same flow can carry different reimbursement consequences depending on which schema the patient sits under, so this is recorded at the program level rather than assumed site-wide.

- **Documentation requirements as the site understands them.** For each program, what the site determines must be documented and captured for the associated activity to be billable or reportable. This is recorded as an operational statement of what must be captured, not as an account of how the site’s billing department reads the underlying rule. The operational statement is what translates into data requirements. The reasoning behind it belongs to the site’s compliance function and is out of scope for this specification.

These entries are site determinations. Institutions interpret the same rules differently, and their documentation capture capabilities differ, so the framework supplies no thresholds, minimums, or figures. Landscape reference material and program-level citations live in Companion A.

**Derived capture requirements.** The consolidated set of elements that must be captured on a consistent basis for the enumerated programs to remain satisfied, expressed as Variable Library references with the required cadence and completeness. This is the bridge from the program enumeration to the flow records: each derived requirement should be traceable to at least one flow, and a requirement with no supporting flow is an open gap.

## C.3.3 Workflow Inventory

The clinical workflows in scope for the specification, named as the site names them, each with a pointer to the flows that serve it. Workflow definitions belong to the Operational Care Model and are referenced here, not restated.

# C.4 The Flow Record

One record per flow. A flow missing any attribute is not yet specified.

| **Attribute**         | **Content**                                                                                                                                                                                                                                                                                                                                                                                                                                                |
|-----------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Flow identifier       | Stable identifier for reference across revisions.                                                                                                                                                                                                                                                                                                                                                                                                          |
| Workflow served       | The workflow or workflows this flow supports, and the decision it enables. A flow serving no identified decision is a candidate for retirement.                                                                                                                                                                                                                                                                                                            |
| Elements              | Variable Library references. No local definitions.                                                                                                                                                                                                                                                                                                                                                                                                         |
| Source                | The role from which information originates in this flow, and the organization currently filling it.                                                                                                                                                                                                                                                                                                                                                        |
| Transport             | What carries the information between source and destination, the organization currently filling that role, and what it does to the data in passing, such as aggregation, identity resolution, or routing. Where the transport role has been agreed by the participating sites rather than simply assumed, record the basis and date of that agreement. A transport role no one has ratified is recorded as proposed, not as settled.                       |
| Source alternatives   | Other feeds or pathways that could carry these elements, and why the current one was chosen. Selection reasons are frequently non-technical, including cost, an interface already in place, vendor capability, and available integration effort, and those are legitimate entries. Recording the alternatives is what allows the choice to be revisited without re-deriving the analysis when the chosen pathway turns out not to carry what was expected. |
| Destination           | Where the information lands, expressed as the place the decision is actually made: worklist, dashboard, registry, report, inbox. Destinations are site-chosen and first class.                                                                                                                                                                                                                                                                             |
| Direction             | Inbound to the site, outbound from it, or return path back toward a source.                                                                                                                                                                                                                                                                                                                                                                                |
| Trigger               | What causes information to move: schedule, clinical event, threshold breach, manual action, request.                                                                                                                                                                                                                                                                                                                                                       |
| Cadence               | How often information moves in practice, not by design intent. Where actual and intended cadence differ, record both.                                                                                                                                                                                                                                                                                                                                      |
| Consent precondition  | What permission must be in place before this flow may operate, and its current status.                                                                                                                                                                                                                                                                                                                                                                     |
| Current configuration | How the information moves today. Described in terms of pathway class rather than product endorsement.                                                                                                                                                                                                                                                                                                                                                      |
| Target configuration  | The configuration the site has decided it wants, with recorded rationale tied to what it unlocks in care. Where current and target are the same, record that the current configuration is the target and why. There is no canonical summit.                                                                                                                                                                                                                |
| Bridge                | The gap between current and target, and what closing it would require. A bridge the site has decided not to close is recorded as such, with the decision noted.                                                                                                                                                                                                                                                                                            |
| Access basis          | Operational contract, research protocol, grant-funded pilot, or informal arrangement. Records what would have to be renewed, renegotiated, or replaced for the flow to survive.                                                                                                                                                                                                                                                                            |
| Consequence record    | The five consequence terms, recorded for the current configuration: cadence, granularity, cost, dependency, reimbursability. See C.5.                                                                                                                                                                                                                                                                                                                      |
| Concession record     | Where the flow does not support the workflow as designed, which of the three responses was chosen, and by whom. See C.6.                                                                                                                                                                                                                                                                                                                                   |

# C.5 The Consequence Record

Five terms, recorded per configuration, in fixed vocabulary so that consequences are comparable across flows and discussable with non-technical leadership.

- **Cadence.** The tempo this configuration makes achievable. The pathway sets the tempo the workflow can run at.

- **Granularity.** The resolution that survives the journey, and what that resolution does or does not support computationally.

- **Cost.** What the configuration takes to establish and to keep running, including interface fees, staff time, and vendor charges. Ongoing cost is recorded separately from setup cost, because it is the one more often underestimated.

- **Dependency.** What or whom the configuration relies on, including single points of failure such as a manual export performed by one individual.

- **Reimbursability.** Whether this configuration produces what the site’s enumerated programs require, in the form and on the schedule the site has determined those programs require. This is a site determination throughout, resolved against the entries in C.3.2 rather than against any figure supplied by the framework. A reimbursability entry that reads as unresolved is a legitimate finding, usually meaning the governing program requirements are not yet stable, and it should be dated alongside the program enumeration section it depends on.

# C.6 The Concession Record

When information cannot support the workflow as designed, exactly one of three responses is chosen and recorded:

- **Workflow adapted.** What changed in the workflow, and what capability was given up.

- **Gap bridged.** What configuration change was made, at what cost, and what it unlocked.

- **Limitation accepted.** What the workflow now operates without, and what the operational consequence is.

Each concession record carries the **accepting authority**: the named local clinical or operational leader who accepted it. This naming is the point of the record. A concession accepted by an identified person is a decision that can be revisited when circumstances change. A concession absorbed by no one becomes permanent by default and invisible to everyone who later wonders why the program underperforms.

# C.7 Revision History

Two revision logs, kept separately.

**Specification revision history.** Version, date, sections revised, and the trigger for revision. Triggers include initial discovery, operational learning, workflow redesign, environmental change, and scheduled re-discovery.

**Program enumeration revision history.** Maintained inside C.3.2 with its own as-of date, per the reasoning in that section.

Re-discovery revisits two questions at once: what the site now wants, and what the environment now offers. A revision that addresses only one of them is incomplete.

# C.8 What This Format Does Not Carry

**Sustainability planning.** The specification captures the inputs to sustainability analysis: programs, documentation requirements, configurations, costs, dependencies, and access bases. The analysis itself, meaning strategy and recommendations for how a site sustains data-driven care over time, is engagement work and is not part of this open format.

**Thresholds and figures.** Program-specific minimums, billing thresholds, and reimbursement figures are not encoded here. Landscape reference lives in Companion A. Site-specific determinations live in C.3.2 as the site’s own statements.

**Variable definitions.** Architecture Specification, always.

**Workflow definitions.** Operational Care Model, always.

**Readiness evaluation.** The specification states what the workflow needs and how information moves. Whether the data can actually deliver it is evaluated by the readiness infrastructure per the Methodology Architecture.
