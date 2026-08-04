# Companion A: Source and Transport Reference

*Companion to Clinical Information Needs and Flows*

*Oros CKM Data Readiness Infrastructure*

*Version 1.0 \| August 4, 2026*

*© 2026 Oros. Released under the Apache License 2.0.*

## A.1 Purpose and Status

This companion describes how clinical information moves between organizations, so that the flow records defined in Companion C can be filled in using shared vocabulary rather than locally invented terms.

**This document is an assumptions register, not an authority.** It is the least settled document in the Oros CKM Data Readiness set, and it is meant to be. The framework’s methodology rests on judgments that can be reasoned about. This document rests on facts about standards, products, and regulation that change, that vary by site, and that are frequently different in practice from what the specifications describe. Publishing it as a confident reference would misrepresent what is actually known.

What it therefore records is the set of working assumptions the framework operates under, the basis for each, what would confirm or refute it, and what changes if it turns out to be wrong. Confirming an assumption is a routine update to this document, not a correction of an error.

**Corrections are welcome and expected.** A site interface analyst, an EHR administrator, or a vendor engineer who finds a claim here that does not match their environment is providing exactly the input this document was published to attract. The framework’s first instantiations are expected to revise it substantially.

This companion is descriptive. It expresses no preference among products, platforms, or organizations. See A.9.

## A.2 How to Read This Document

Two kinds of content appear here, and they carry different weight.

**Vocabulary sections** define pathway classes and terms that Companion C’s transport, current configuration, and source alternatives fields point into. These are stable by construction, because they are definitions the framework controls rather than claims about the world.

**Assumption registers** carry the substantive claims. Each entry states an assumption, its basis, what would confirm or refute it, and what changes downstream if it is wrong. Where the basis is described as practitioner experience or working assumption, the claim has not been independently verified and should be treated as a hypothesis to test during discovery, not as a fact to design against.

Where a claim in a vocabulary section carries meaningful uncertainty, it is marked at the sentence rather than deferred to a general disclaimer.

## A.3 Pathway Classes

Five classes cover essentially all information movement relevant to this framework. Companion C records a flow’s current and target configuration in terms of these classes, with the specific implementation recorded as a sub-detail.

- **Message pathway.** Discrete, event-driven messages moving between systems in near real time, conventionally HL7 version 2 in United States provider environments. Characteristically high granularity, high cadence, narrow scope per message type.

- **Document pathway.** Structured clinical documents exchanged as complete artifacts, conventionally C-CDA. Characteristically broad scope per document, lower cadence, summary-level granularity.

- **API pathway.** Query-based or subscription-based access to discrete resources, conventionally FHIR. Characteristically flexible scope and cadence, with availability and cost varying widely by site.

- **Device pathway.** Data originating from patient-used devices, reaching the care team through a manufacturer cloud or an aggregation platform rather than through the site’s clinical systems. Characteristically dense time series, and governed by consent and account linkage rather than by interface configuration.

- **Manual pathway.** Human-mediated movement: fax, telephone, portal download, spreadsheet export, re-keying. Characteristically low cadence, high dependency risk, and frequently the actual mechanism behind a flow that a site describes as automated.

A single workflow commonly depends on more than one class, and the same data element is often available through more than one. Companion C’s source alternatives field exists to record that choice and its reasoning.

## A.4 The Message Pathway

HL7 version 2 remains the working backbone of real-time exchange between clinical systems in United States provider environments. Messages are pipe-delimited, are typically carried over a network connection using minimal lower layer protocol, and are usually orchestrated by an interface engine.

What a site can receive depends entirely on which message types its interface is configured to send. This is the single most consequential fact in this document. The standard describes what a message type can carry. The site’s configuration determines what it actually carries.

**Message types most relevant to this framework:**

| **Type**                              | **Name**                          | **Characteristically carries**                                                                                                                                           |
|---------------------------------------|-----------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| ADT                                   | Admit, Discharge, Transfer        | Patient demographics and identifiers, encounter and visit events, and often diagnoses. The foundation for identity resolution and encounter context.                     |
| ORU                                   | Observation Result, Unsolicited   | Laboratory results and diagnostic reports. Where discrete lab values such as HbA1c are conventionally found. Vital signs may also travel here where the site sends them. |
| ORM, or OML and OMG in later versions | Order messages                    | Clinical orders placed. Establishes that a test was ordered, which is distinct from whether it was resulted.                                                             |
| MDM                                   | Medical Document Management       | Transcribed notes and clinical documents, largely as narrative text rather than discrete values.                                                                         |
| SIU                                   | Schedule Information, Unsolicited | Appointment booking, rescheduling, cancellation, and no-show events. Relevant to outreach and attendance workflows.                                                      |
| DFT                                   | Detailed Financial Transaction    | Charge capture with procedure and often diagnosis coding.                                                                                                                |
| VXU                                   | Vaccination record update         | Immunization events, relevant to certain quality measures.                                                                                                               |

Message type and trigger event together identify a message, so a specification that names only the type is incomplete. Segment and field definitions differ across versions 2.3 through 2.5.1 and later, which means a claim that a given element is available in a given message type is version-dependent and site-dependent.

### A.4.1 Message Pathway Assumptions

| **Assumption**                                                                                                                                                              | **Basis**                                                                                                                                                                                 | **What would confirm or refute it**                                                                                              | **What changes if it is wrong**                                                                                                                                                                |
|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| ADT and ORU together will cover the majority of EHR-derived elements needed for diabetes-focused use cases.                                                                 | Message type definitions are well documented and consistent with published references. The sufficiency claim is a working assumption based on the element set typical of these use cases. | Mapping a completed Companion C element list for one site against that site’s actual message inventory.                          | Additional message types or a document or API pathway must be added, raising integration scope and cost.                                                                                       |
| Vital signs, including blood pressure and weight, are frequently absent from outbound ORU feeds even though the standard accommodates them and the values exist in the EHR. | Practitioner experience and interface configuration practice. Not independently verified and expected to vary widely by site.                                                             | Inspecting a sample of a site’s actual outbound ORU traffic for vitals observations, rather than asking whether vitals are sent. | If vitals are present, an assumed gap disappears. If absent as expected, either the interface must be reconfigured or vitals must come through the document pathway, which lowers granularity. |
| Outpatient medication data is not reliably available through the version 2 message pathway.                                                                                 | The pharmacy message types are oriented to inpatient pharmacy workflow. Working assumption regarding outpatient prescribing.                                                              | Confirming with a site whether outpatient prescribing appears in any outbound message type, and if so which.                     | Medication-dependent workflows depend on the document pathway, an API pathway, or a claims source, each with different cadence and completeness.                                               |
| Diagnosis and problem list data arrive inconsistently, appearing variously in ADT diagnosis segments, in financial transaction messages, in documents, or not at all.       | Practitioner experience. The variability is well recognized; the distribution across sites is not established here.                                                                       | Comparing diagnosis capture across message types at a site against the site’s own EHR problem list.                              | Population definitions that depend on diagnosis require a different or supplementary source, which affects cohort accuracy for every use case built on them.                                   |
| Charge and billing data are sometimes the most consistently coded diagnosis source available, because billing data is subject to audit.                                     | Working assumption from revenue cycle practice. Not verified for the site types in scope.                                                                                                 | Comparing diagnosis completeness between financial transaction messages and clinical sources at a site.                          | If unfounded, a fallback diagnosis source is lost and clinical sources must carry the requirement alone.                                                                                       |

## A.5 The Document Pathway

Consolidated Clinical Document Architecture, C-CDA, is the predominant standard for clinical document exchange in the United States, and generation of C-CDA documents has been a certification expectation for certified electronic health record technology under federal programs since the Meaningful Use era, now Promoting Interoperability. Documents are XML, use standardized terminologies, and can carry a broad range of content including problems, medications, allergies, immunizations, results, vital signs, care plans, and social history.

The pathway’s characteristic strength is breadth: a single document can carry content spanning many domains, including content that no discrete feed at the site is configured to send. Its characteristic limitation is temporal and structural. A document is generated at a moment and represents a summary as of that moment, so density and timing are weaker than a discrete feed even when the same element is nominally present.

Document quality has been a recognized problem in the literature rather than a theoretical risk. Published evaluations of conformance and data quality across certified health information technologies have documented barriers to effective interoperability using this standard, so a site’s ability to produce C-CDA documents should not be assumed to mean the documents will be uniformly parseable or complete.

### A.5.1 Document Pathway Assumptions

| **Assumption**                                                                                                              | **Basis**                                                                                                                                                                        | **What would confirm or refute it**                                                                           | **What changes if it is wrong**                                                                                                              |
|-----------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------|
| Some sites will be able to push C-CDA and little else, making the document pathway the only viable initial option for them. | Certification expectations make C-CDA generation broadly available. The claim that it will be the only option at some sites is a working assumption about rural site capability. | Site discovery: establishing what a site can actually push outbound today without new interface work.         | If more sites can support message feeds than assumed, the document pathway becomes supplementary rather than primary, improving granularity. |
| Document parsing carries higher processing cost per unit of usable data than discrete message parsing.                      | Working assumption based on document size and structure. Not benchmarked.                                                                                                        | Measuring parse cost and yield against real site documents during build.                                      | If cost is lower than assumed, the argument for preferring the message pathway rests on granularity alone, which remains sufficient.         |
| The document pathway is better suited to periodic enrichment and validation than to operational cadence.                    | Follows from generation-time summary structure. Directional rather than measured.                                                                                                | Comparing element density and recency between document and message sources for the same patients at one site. | If documents prove adequate for operational cadence at a site, a simpler single-pathway configuration becomes viable there.                  |
| Element presence in a C-CDA document does not imply the element is usable for time-sensitive or time-series computation.    | Follows from document structure. Consistent with published data quality findings on conformance variability.                                                                     | Testing whether a specific computed measure can be produced from document-sourced data at required recency.   | If usable, the ordered-pathway fallback for that element is stronger than assumed and device dependence decreases.                           |

## A.6 The API Pathway

FHIR defines resource-level access to discrete clinical data over web APIs, and certification requirements have made standardized API capability broadly present in certified electronic health record technology. This is the pathway most likely to be misjudged during discovery, because the distinction that matters is not whether a site’s system supports FHIR but whether the site can operationally use it.

Two facts sit in tension. Standards-based API capability is widely deployed at the vendor level. At the same time, published assessments consistently find that lower-resourced organizations, including small, rural, critical access, and independent providers, show lower rates of routine interoperability in practice. Certification establishes that an interface exists. It does not establish that a site has the contractual access, technical staff, or budget to use it.

The practical implication for discovery is that asking a site whether it supports FHIR will produce a technically accurate answer that carries little information. The useful questions concern contractual access to the API under the site’s existing vendor agreement, whether any fee applies, who at the site can authorize and configure an integration, and whether the specific resources needed are exposed.

### A.6.1 API Pathway Assumptions

| **Assumption**                                                                                                                                             | **Basis**                                                                                                                                                                          | **What would confirm or refute it**                                                                                         | **What changes if it is wrong**                                                                                         |
|------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------|
| FHIR API capability will generally exist at the vendor level for sites in scope, while operational feasibility will be the limiting factor.                | Certification requirements support the capability claim. The feasibility constraint is supported by published findings on interoperability rates at lower-resourced organizations. | Per-site discovery of contractual API access, applicable fees, and available technical capacity.                            | If feasibility is better than assumed, inbound API becomes a realistic near-term option and pathway sequencing changes. |
| API access may carry vendor fees or contract amendments that are material relative to a rural site budget.                                                 | Working assumption. Vendor commercial terms are not public and vary by contract.                                                                                                   | Site-level confirmation of what the existing vendor agreement includes.                                                     | If access is included at no marginal cost, a significant assumed barrier disappears.                                    |
| The API pathway will matter first for return paths rather than for ingestion, because ingestion has workable alternatives and return paths largely do not. | Framework reasoning rather than empirical finding.                                                                                                                                 | Establishing at a site whether any non-API return path can deliver information into clinical workflow at acceptable effort. | If adequate non-API return paths exist, API adoption is less urgent and sequencing changes accordingly.                 |
| Two systems that both support FHIR may still require substantial custom work to exchange the specific elements a workflow depends on.                      | Widely reported in integration practice. Directionally reliable.                                                                                                                   | Attempting a specific element exchange rather than confirming general support.                                              | If exchange is straightforward, integration estimates fall.                                                             |

## A.7 The Device Pathway

Device data does not arrive through the site’s clinical interfaces. It originates with the patient, reaches a manufacturer cloud service, and becomes available to a care team through account linkage, through an aggregation platform, or through a clinic-level connection established with the patient’s participation. This is why the device pathway is treated as ordered relative to the EHR pathway in the Methodology Architecture rather than as a variant of it.

Three access approaches are described in the literature: connecting directly to a manufacturer, using intermediary software, and relying on a data aggregation platform. Aggregation platforms exist specifically to consolidate data across manufacturers, and cloud-to-cloud connections from major continuous glucose monitoring manufacturers into aggregation platforms are established in the United States market.

The framework-relevant characteristics of this pathway differ from every other class. Consent and account linkage govern access rather than interface configuration. The data are dense time series rather than discrete events, which is what makes measures such as time in range computable. And the patient is an active participant in the flow, which means the pathway can lapse for reasons that have nothing to do with technology.

### A.7.1 Device Pathway Assumptions

| **Assumption**                                                                                                                                                                       | **Basis**                                                                                                                            | **What would confirm or refute it**                                                                  | **What changes if it is wrong**                                                                                |
|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------|
| Device data will reach care teams through an aggregation platform rather than through direct per-manufacturer integration at most sites.                                             | Aggregation platforms are established for this purpose and consolidate across manufacturers. Site-level prevalence is an assumption. | Site discovery of what device data access, if any, exists today and through what mechanism.          | Direct manufacturer integration or in-clinic upload would need to be supported, changing effort and cadence.   |
| Device pathway continuity depends on consent and account linkage remaining in place, and will lapse for non-technical reasons.                                                       | Follows from how account linkage works. Rate of lapse is not established.                                                            | Observing linkage persistence over an operating period at a site.                                    | If linkage is more durable than assumed, less operational attention is needed to maintain population coverage. |
| Device data density is sufficient for time-series measures where linkage is active, and the risk is coverage across a population rather than density within a patient.               | Follows from continuous monitoring data characteristics.                                                                             | Measuring population coverage and per-patient density in a real site population.                     | If per-patient density is inadequate, measure definitions themselves need revisiting, not just the pathway.    |
| A site may need more than one destination, because platforms strong in device time series and platforms strong in EHR-derived population data are not necessarily the same platform. | Framework reasoning from differing platform origins. Not verified against current product capabilities.                              | Evaluating whether a site’s chosen platform covers both element families for its intended workflows. | If a single platform covers both adequately, destination architecture simplifies substantially.                |

## A.8 Return Paths

Return path means any flow carrying information back toward the point of care or toward a source: a specialist’s findings returning to a primary team, a risk flag reaching a clinician’s worklist, a computed measure landing where a decision is made.

Return paths are systematically less well provisioned than inbound paths, and are the most common unrecorded element in a site’s information picture. Options fall into three broad approaches, which are not stages of a single progression and which a site may reasonably mix or stop within.

- **Destination-native.** Information is presented in the platform where it lands, and clinicians go there to see it. Lowest effort, no clinical system integration, and dependent on clinicians actually visiting a second application.

- **Embedded view.** Information is surfaced within the clinical workflow through an embedded interface without writing to the record. Moderate effort, and the information does not persist in the chart.

- **Write-back.** Information is written into the clinical record itself, conventionally through an API pathway. Highest effort and highest vendor dependency, and the only approach under which the information becomes part of the record.

Document generation for chart inclusion sits between these approaches and is worth noting because published implementations have used report generation into the chart to satisfy documentation requirements without full integration.

### A.8.1 Return Path Assumptions

| **Assumption**                                                                                                        | **Basis**                                                                                 | **What would confirm or refute it**                                                            | **What changes if it is wrong**                                                                                       |
|-----------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------|
| Most sites will initially operate destination-native return paths, whether or not they describe them that way.        | Working assumption. Follows from relative effort.                                         | Discovery: establishing where clinicians actually look and whether they do.                    | If richer return paths already exist, the assumed gap narrows and integration priorities shift.                       |
| Return path adequacy, not inbound data availability, will be the practical constraint on care coordination workflows. | Framework reasoning. Consistent with the return-path gap described in the canonical body. | Observing where designed workflows stall during the first operating period at a site.          | If inbound gaps dominate instead, sequencing of pathway investment changes.                                           |
| Write-back will be out of reach for most sites in scope in the near term.                                             | Working assumption based on API pathway feasibility constraints above.                    | Per-site assessment of API write capability, contractual permission, and integration capacity. | If write-back is achievable, information can persist in the record and clinical adoption barriers fall substantially. |

## A.9 Vendor and Platform Landscape

**Non-endorsement.** Organizations and products are named in this document only where naming is necessary for a reader to recognize the class being described. Naming is factual landscape and is not endorsement, recommendation, or assessment of suitability. The framework has opinions about information, not about vendors. Configuration and platform choices belong to sites. No comparative claim about any named organization is made or implied, and product capabilities change faster than this document does, so any capability statement should be confirmed with the organization directly.

**Roles, not rankings.** The landscape is described in terms of the roles organizations occupy. The same organization may occupy different roles in different site configurations, consistent with the role vocabulary in the canonical body.

- **Device manufacturers** produce the monitoring devices and operate cloud services holding the resulting data. In continuous glucose monitoring, this includes Abbott and Dexcom among others, with insulin delivery manufacturers including Insulet, Tandem, and Medtronic.

- **Device data aggregation platforms** consolidate data across manufacturers and present it for clinical use. Glooko and Tidepool both operate in this role, and cloud-to-cloud connections with major manufacturers exist in the United States market.

- **Population health platforms** receive and present data at population scale for care team workflow. This role may be filled by a device aggregation platform’s population view, by a general population health vendor, or by a program-specific platform developed within a clinical network.

- **Interface engines** orchestrate message-pathway traffic at a site. Several established products occupy this role and the choice is generally a site or health system decision predating any engagement.

- **Regional exchange organizations** carry information between organizations in a region, including health information exchanges, accountable care organization platforms, integrated delivery network warehouses, and state-level utilities. An engagement-operated bridge environment may also occupy this role on a transitional basis, in which case Companion C records it as a transport role with its ratification basis, as with any other.

## A.10 Reimbursement Environment

This document does not carry reimbursement thresholds, minimums, or figures. Three reasons, and the third is the operative one.

Program rules change. Rules are interpreted differently by different institutions, so a figure that is correct for one site’s billing determination may be wrong for another’s. And the framework has no standing to make a site’s compliance determinations for it. Companion C accordingly records reimbursability as a site determination, resolved against the site’s own program enumeration.

What can be said at the level of this document: the reimbursement environment for remote monitoring and for value-based arrangements is actively changing, and the direction of regulatory movement is toward API-based data exchange. Specific requirements, effective dates, and thresholds must be confirmed against current published rules at the time of any site engagement, not taken from this document or from any framework artifact.

### A.10.1 Reimbursement Assumptions

| **Assumption**                                                                                                                                                  | **Basis**                                                                                                               | **What would confirm or refute it**                                                          | **What changes if it is wrong**                                                                      |
|-----------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------|
| A site’s documentation requirements, as the site determines them, will drive which elements must be captured consistently rather than the underlying rule text. | Follows from institutional variation in interpretation and documentation capability.                                    | Comparing capture requirements as determined by two sites participating in the same program. | If interpretations converge, a shared reference becomes possible and this position could be relaxed. |
| Regulatory direction favors API-based exchange over time, with timing and specifics unsettled.                                                                  | Directional reading of federal interoperability policy. Specific mandates and dates are deliberately not asserted here. | Confirmation against current published rules at engagement time.                             | Timing of API pathway investment shifts, though the pathway sequencing logic is unaffected.          |

## A.11 What This Document Does Not Carry

**Site-specific facts.** What any particular site can send, receive, or afford is recorded in that site’s Information Flow Specification, not here.

**Variable definitions.** Architecture Specification, always.

**Readiness evaluation.** Whether available data can support a workflow is evaluated per the Methodology Architecture.

**Reimbursement thresholds and figures.** See A.10.

**Implementation guidance.** This document describes pathway characteristics. It does not specify how to build an interface, configure an engine, or map a message.

**Product selection advice.** See A.9.

## A.12 Open Validation Queue

The assumptions most consequential to the framework, in the order they should be tested:

- Whether vital signs appear in outbound observation result traffic at real sites, tested by inspecting actual traffic rather than by asking.

- What sites in scope can actually push outbound today without new interface work.

- Whether diagnosis capture is adequate for population definition from available sources.

- What device data access exists today, through what mechanism, and with what population coverage.

- Where designed care coordination workflows stall during first operation, and whether return path or inbound gaps dominate.

- Contractual and financial terms of API access under sites’ existing vendor agreements.

Each of these is a discovery activity, and each resolves into an update to this document. The first instantiation is expected to revise this companion more than any other artifact in the set.
