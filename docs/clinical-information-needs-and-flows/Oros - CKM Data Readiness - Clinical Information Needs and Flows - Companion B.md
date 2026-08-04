# Companion B: Discovery Template

*Companion to Clinical Information Needs and Flows*

*Oros CKM Data Readiness Infrastructure*

*Version 1.0 \| August 4, 2026*

*© 2026 Oros. Released under the Apache License 2.0.*

## B.1 Purpose and Status

This companion is the working instrument for onboarding a site. It sets out the sequence of conversations that produce a Site Information Flow Specification in the format defined by Companion C.

It is a template, not a form. The sequence matters more than the wording, and the wording is expected to change at every engagement. A site adapting the questions to its own vocabulary is using this document correctly.

**This is the least canonical document in the set.** Companion A is uncertain about facts; this document is uncertain about practice. It was written before the first engagement, and the first engagement is expected to revise it substantially. Anyone using it should assume some questions land poorly, some are missing, and some produce answers nobody knows what to do with.

**Template and instance are different artifacts.** This template is Oros-authored and open under the Apache License 2.0. A completed discovery record for a specific site is a distinct artifact containing that site’s own information, produced under whatever engagement governs the work, and is not part of this document or of the framework.

## B.2 Posture

Five things govern how this instrument is used. They matter more than any individual question.

**Discovery is cyclical, not a session.** A site’s information picture is assembled across many conversations. Expect reporting requirements to be nearly complete after early passes, risk stratification substantially complete, and care coordination to remain a sketch until the workflows have been operating for some months. That asymmetry is accurate, not a failure of discovery.

**Record provenance, not just answers.** Every entry carries who said it, when, and its status: asserted, verified, or unknown. This is the single most important discipline in the instrument. People speak with more confidence on a call than they would in writing, and an answer inherits that confidence unless the status field forces the question. An interface described as sending vital signs is asserted. Vital signs observed in a sample of actual traffic are verified. The two look identical in a specification that does not distinguish them.

**Unknown is an answer.** Recording that a site does not yet know something, with a note on what would resolve it, is more useful than a guess. Blank fields are ambiguous between unknown and overlooked.

**Distinguish two kinds of not knowing.** A site may not know an answer, or nobody at the site may own the answer. These look identical on the page and mean entirely different things. The first is a data-gathering task. The second is a governance finding, and it is often more valuable than the answer would have been.

**The lens is operational.** Every question here exists to establish whether a clinical workflow can be made to work and sustained. Questions that do not serve that end should be cut, however interesting the answers.

## B.3 The Discovery Sequence

Seven steps, run in order, revisited as needed. The order matters: it derives requirements from clinical intent rather than from what happens to be available, which is what keeps the resulting specification anchored to care rather than to infrastructure.

Steps two, three, and four correspond to the three requirement origins in the canonical body, and they are separated because they are discovered differently. Externally authored requirements are enumerated. Therapeutically authored requirements start from published criteria and are refined locally. Locally authored requirements are designed by the clinical team and gain resolution through operation. Running one undifferentiated set of questions across all three loses that distinction and reliably under-discovers risk stratification, which is the category least likely to be raised unprompted.

### B.3.1 Step One: Scope the Use Cases

Establish which categories are in play before working any of them in depth. This step is short and determines which of the next three steps run, and how deep each goes.

- Which conditions and which patient populations are in scope for this engagement?

- Are you doing, or intending to do, risk stratification for this population? Meaning any systematic way of deciding which patients need attention first.

- Are you doing, or intending to do, care coordination and delivery workflows: outreach, follow-up, referral management, medication management?

- Are you reporting to any external quality, value-based care, or reimbursement program for this population?

- Of these, which is the priority for this engagement, and which are further out?

**Watch for.** Risk stratification being performed informally without being named as such. A clinician who reviews a list and decides who to call first is stratifying risk, whether or not the site uses that language. Ask how patients are currently prioritized rather than whether stratification exists.

**Note.** A site may have only one or two of the three in play, and that is a complete answer. Record which categories are out of scope and why, so a later pass knows the omission was deliberate.

### B.3.2 Step Two: Externally Authored Requirements

Establish the requirements the site inherits by participating in programs. These are written elsewhere, so discovery here is enumeration rather than analysis. This feeds Companion C section C.3.2 and is the input to sustainability planning.

- Which clinical quality, value-based care, or reimbursement programs do you participate in today? Who administers each, and what is your current status in it?

- Which are you targeting but have not entered? For each, are the operational requirements settled or still emerging?

- Do you have an active remote patient monitoring program under fee-for-service? For which conditions or populations?

- For each program, is it fee-for-service, value-based, or a defined combination?

- For each program, what does your organization require to be documented and captured for the activity to be billable or reportable?

**Boundary.** The last question asks what must be captured, not why your billing department reads the rule that way. Capture the operational requirement. The reasoning belongs to the site’s compliance function and should not be recorded here.

**Watch for.** Answers that vary depending on who is in the room. Interpretation of the same rule differs between institutions and sometimes within them, and where that surfaces it should be recorded as an open item rather than resolved on the call. Also record the date of this conversation prominently: this section ages faster than anything else in the specification.

### B.3.3 Step Three: Therapeutically Authored Requirements

Establish how the site does or intends to stratify risk for the conditions in scope. Requirements here come from the condition itself: from clinical evidence and from what the available measurements can see. No external program dictates them and no local preference invents them.

The pattern is published baseline with local refinement. A site does not design criteria from scratch, and it does not adopt published criteria unchanged. It starts from published, peer-reviewed criteria for the condition and refines them to fit its own population, capacity, and review cadence.

- How are patients currently prioritized for attention? By whom, how often, and looking at what?

- Are you working from published criteria or consensus guidelines? Which ones?

- How does your population differ from the population those criteria were developed in? Age, condition type, comorbidity, access?

- What review capacity do you actually have? How many patients can be reviewed, by whom, how often?

- What device or monitoring data exists for this population, for what share of patients, and reaching you how?

- Where a criterion could be computed from device data or from a documented clinical measure, which is primary today and which is the fallback?

**On capacity.** Review capacity is a requirement, not a constraint discovered afterward. Criteria that flag more patients than the team can review produce a list nobody works. Asking about capacity before criteria are settled is what keeps stratification operationally real.

**Illustration.** Published diabetes work provides a worked example of this pattern: criteria drawn from the literature, then adapted to local consensus and local review cadence. The canonical body treats that literature in more detail. It is cited as a pattern, not as criteria to be lifted, and a site working with a different population will arrive at different thresholds.

**Watch for.** Two failure modes. Adopting published thresholds unchanged because they are published, which ignores population differences. And designing criteria with no published anchor at all, which makes them hard to defend and hard to compare. Record the baseline source and the local refinement separately.

### B.3.4 Step Four: Locally Authored Workflows

Establish the care coordination and delivery workflows the clinical team has designed or intends to design. There is no external specification and no published baseline here. Requirements follow from whatever the team decides to do. Workflow definitions belong to the Operational Care Model; this step captures which are in scope and how the site describes them.

- What care coordination workflows are you running today for this population?

- What are you trying to start doing that you cannot do now?

- For each: who performs it, how often does it run, and what decision does it produce?

- What triggers it? A schedule, an event, a threshold, a request?

- Where does the person performing it currently look to do it?

- What happens when the intended action does not succeed? An unreached patient, a referral with no response, a task nobody picks up?

**Expect a sketch.** This is the category that gains resolution through operation. A first pass captures intended design; what the design actually requires becomes visible once people are doing it. A thin answer here is accurate rather than incomplete, and should be recorded as such rather than pressed into false detail.

**Watch for.** Workflows described in aspiration rather than practice. A useful follow-up is asking what happened the last time it ran, and when that was. Also watch for workflows nobody named because they are informal, particularly outreach and follow-up, which frequently carry substantial information requirements. Referral management deserves a direct question, because it is the workflow that most often exposes missing return paths.

### B.3.5 Step Five: Derive Information Needs

For each workflow and requirement captured in steps two through four, work the derivation chain: what decision, what information, which data elements. Elements resolve to Variable Library references; this step does not define variables.

- To make this decision well, what does the person performing the workflow need to know?

- How recent does that information need to be for the decision to be sound?

- How complete does it need to be? Would a partial picture change the decision or merely narrow it?

- Is any of this a computed measure rather than a recorded value? If so, what density of underlying data does the computation require?

- Consolidating across programs and workflows: which elements must be captured consistently, at what cadence?

**Watch for.** This is the step where clinical teams are most often stuck, because the question is unfamiliar. People know what they do and know what they look at; they have rarely articulated what they need to know. Working backward from a recent real case is usually more productive than asking in the abstract. Expect this step to be the one that most needs a second pass.

### B.3.6 Step Six: Map Elements to Candidate Sources

Establish where each element lives today and which pathways could deliver it. Companion A supplies the pathway class vocabulary. This is the step where the framework meets the site’s actual infrastructure.

- For each element: where does this data live in your systems today?

- What can you send outbound today, without new interface work? Which message types, which document types, which APIs?

- Who operates your interface engine, and who can authorize a change to what it sends?

- For device-sourced data: what access exists today, through what mechanism, and covering what share of the relevant population?

- Is any of this currently moving by fax, telephone, portal download, or spreadsheet? Including for information coming back from outside the organization?

- Where more than one source could carry an element, what would make one preferable: cost, an interface already in place, vendor capability, available effort?

**Verify rather than ask, where possible.** Several claims at this step are worth confirming against actual traffic or actual documents rather than against recollection. Companion A section A.12 lists the assumptions most worth testing, and the highest-value one is whether vital signs actually appear in outbound observation result traffic. Asking produces an answer; inspecting produces a fact. Record which one you got.

**Watch for.** Return paths going unmentioned. Information moving outbound is usually described readily; information coming back is frequently carried by a mechanism nobody thinks of as a data flow. Ask about it directly rather than waiting for it to surface.

### B.3.7 Step Seven: Establish Configurations and Record Decisions

Convert what has been learned into flow records: current configuration, target configuration, and the decisions taken where the two cannot be reconciled.

- For each flow, how does the information move today, and on what basis do you have access: operational contract, research protocol, grant-funded pilot, informal arrangement?

- How would you want it to move, and what would that make possible clinically that is not possible now?

- What sits between source and destination? Who operates it, what does it do to the data in passing, and has that role been agreed by the participating organizations or is it proposed?

- What are the consequences of the current configuration in each of the five terms: cadence, granularity, cost, dependency, reimbursability?

- Where the information cannot support the workflow as designed: do you adapt the workflow, bridge the gap, or accept the limitation?

- Who is accepting that decision, by name and role?

**The naming question is not optional.** A concession accepted by an identified clinical or operational leader is a decision that can be revisited. A concession absorbed by nobody becomes permanent by default and invisible to everyone who later wonders why the program underperforms. If no one will accept a concession, that is itself the finding.

**Watch for.** Target configurations chosen because they sound more advanced rather than because they unlock something. The follow-up is what this would let you do that you cannot do now, and if the answer is unclear, the current configuration may already be the target.

## B.4 Recording Conventions

Discovery output accumulates across conversations. Four conventions keep it usable.

**One working specification per site**, in the Companion C structure, updated after each conversation rather than assembled at the end.

**Every entry carries provenance**: who said it, on what date, and its status as asserted, verified, or unknown. Where a call transcript is the source, the entry points to the call date rather than reproducing what was said.

**Program enumeration is dated separately** from the specification as a whole, per Companion C section C.3.2, because it ages on an external clock.

**Synthesis is reviewed before it is recorded.** Where conversation records are used to populate the specification, entries are proposed for review rather than written directly. Confidence expressed on a call should not silently become a verified entry in a specification.

## B.5 The Gap Report

At any point, the working specification can be read mechanically for what it does not yet contain. This produces the agenda for the next conversation and is the most useful artifact discovery generates before it is complete.

- Attributes recorded as unknown, with what would resolve each.

- Entries recorded as asserted but not verified, particularly those on the Companion A validation list.

- Derived capture requirements from the program enumeration with no supporting flow.

- Workflows with no associated flows, and flows serving no identified workflow.

- Flows missing any required attribute.

- Questions where nobody at the site owns the answer.

The last category is a governance finding and should be reported as such rather than folded in with the data gaps.

Reading incompleteness as an agenda rather than as a report card matters for how the work is received. A site seeing many unknowns in an early specification is seeing normal early-stage discovery, and saying so plainly is part of using this instrument well.

## B.6 What This Template Does Not Do

**It does not evaluate readiness.** Whether the data can support the workflow is determined by the readiness infrastructure per the Methodology Architecture, using what discovery produces as input.

**It does not define workflows.** Operational Care Model.

**It does not define variables.** Architecture Specification.

**It does not plan sustainability.** Discovery captures the inputs. The analysis and the recommendations are engagement work and are not part of this open format.

**It does not manage change.** The rate at which a site can absorb workflow change paces everything here, and that work belongs to clinical transformation, not to this instrument.
