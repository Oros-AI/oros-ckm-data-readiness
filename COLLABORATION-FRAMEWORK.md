# Oros Collaboration Framework

*Governance, Licensing & Partnership Principles for Oros Shared Infrastructure*

Working Draft | August 5, 2026 | For partner discussion

Contact: Dominique Pahud | dom@oros.ai

## What Oros Is

Getting clinical data into a state where it can actually be used, for care decisions, reporting, and research, is harder than it looks and rarely gets the attention or funding it deserves. It is the unglamorous first step that makes everything else possible, and it gets assumed far more often than it gets solved. The need is acute in rural and underserved communities where data infrastructure gaps are largest and the populations most at risk.

Oros exists to clear the bottlenecks that block better care. It is the neutral steward of shared infrastructure: open infrastructure anyone can use, build on, and trust. Oros is built to catalyze that unglamorous first step and to support the clinical, operational, and research use cases that depend on it: risk stratification, care coordination, value-based care reporting, and population health research. Oros is not defined by any single domain. Data readiness is where it starts, not where it ends.

The CKM Data Readiness Project is the first project Oros is tackling, a concrete proving ground for the broader mission, not the boundary of it. As Oros takes on additional projects over time, the same stewardship model carries forward: shared infrastructure held in the open, for everyone who depends on it.

For Cardio-Kidney-Metabolic conditions specifically, including diabetes, hypertension, and heart failure, the gap between data that exists and data that is actually ready to use is significant and well-documented. Oros builds the infrastructure to close that gap: open-source software that evaluates the quality of clinical and device data across four tiers (raw ingestion, normalization, check results, use-case readiness), identifies what is blocking specific use cases, guides remediation, and gates analytics on validated data. It is condition-agnostic: diabetes, hypertension, and heart failure are the initial three condition modules, each deployable independently or together, with additional conditions expandable over time without modifying the core.

The platform produces three representations of the same validated, remediated data:

- **SQL**: operational layer for care coordination and program management
- **FHIR R4**: for VBC reporting and interoperability
- **OMOP CDM**: for research and population analytics

Beyond the platform itself, Oros provides implementation and bridge support, connecting clinical, technical, administrative, and payer teams around a shared understanding of what data readiness means in their context, and translating between those worlds to make progress that would otherwise take years to coordinate. The goal is not data quality for its own sake. It is data driven care: clinically grounded, operationally viable, and trusted by everyone who depends on it.

Early deployments run in an Oros-operated bridge environment rather than behind a regional host's firewall. This is a practical choice: it lets the capability come online in months rather than waiting on institutional contracting cycles, and the transition to a permanent regional home is planned from the start in the data sharing agreements.

Oros was developed independently over two years prior to any funded institutional engagement. Oros deploys opportunistically across multiple states wherever motivated sites, funding, and implementation partners align; the first implementation context is being determined.

## Scope & Evolution

The CKM Data Readiness Project is the initial implementation context for this framework, not its boundary. Oros deploys opportunistically across multiple states wherever motivated sites, funding, and implementation partners align; the first implementation context is being determined. The framework is intended to support future implementations across additional states, regions, clinical domains, and institutional configurations. Oros anticipates collaboration over time with academic institutions, regional health networks, nonprofits, open-source infrastructure groups, and technical contributors working on adjacent infrastructure.

## Governing Principles

**1. Oros stewards the core infrastructure.** No single institution owns or controls the core platform. Oros maintains it as shared open infrastructure. This protects every partner: no institution can lock others out, and no single departure breaks the platform.

**2. Open licensing.** Core infrastructure is released under the Apache License 2.0. Any institution may use, deploy, and build on the infrastructure without negotiation or license fees.

**3. Attribution is real, tracked, and runs to the individual.** Every released artifact, including code modules, condition modules, methodology documents, and publications, names the individual contributors whose work is reflected in it. Contributors' institutional affiliations may be listed alongside their names for context, but contribution and attribution are recorded to the person, not the employer. Attribution under this framework is a recognition policy: it records the individuals who did the work. It is independent of, and does not determine, copyright authorship, copyright ownership, or licensing authority, which are governed by law, employment agreements, and the Contributor License Agreements. The attribution record is maintained as ATTRIBUTION.md at the root of the Oros repository, alongside a standard Apache NOTICE file carrying the attribution notices that redistributors are required to preserve under the Apache License 2.0. Oros carries the same attribution into the artifacts and publications it produces; authorship of third-party publications is governed by the norms and agreements applicable to those publications. In this framework, "attribution" refers to credit for authorship and contribution on released artifacts.

**4. No exclusivity.** No institution may claim exclusive rights over core infrastructure components or condition modules with broad applicability, or restrict the licenses already granted in them, regardless of funding contribution.

**5. Local adaptations belong to local institutions.** Site-specific configurations, workflow customizations, and local implementations belong to the institution that develops them. Generalizable components are contributed back to the core. Contribution-back is a condition of funded engagements and collaboration agreements under this framework, not an obligation imposed by the Apache License itself.

**6. Engagement with Oros is a services relationship, not an IP transaction.** When partners need support deploying the platform, integrating it with existing infrastructure, or bridging the organizational and clinical teams that need to work together around it, that work is scoped and compensated as a services engagement. It covers implementation and coordination support, not ownership of the infrastructure or its components.

**7. Principles hold, regardless of funding.** Oros reserves the right to decline engagements that do not meet these conditions, regardless of funding offered.

**8. Funded contributions flow to the core.** Work of broad applicability funded by grants, contracts, or philanthropic awards, meaning Layer 1 core extensions and Layer 2 condition modules, is contributed to the Oros repository as a Pull Request under the Apache License 2.0, accepted under a Contributor License Agreement (see FAQ). Site-specific Layer 3 adaptations remain with the institution that develops them, consistent with Principle 5. Funders are encouraged to make this deposit requirement an explicit grant term to ensure the work reaches the open-source commons as intended.

**9. Forkability and anti-capture.** The framework is intentionally designed to prevent institutional, commercial, or governance capture of broadly applicable infrastructure. Any participant retains the right to use, extend, fork, or deploy the infrastructure under the governing license terms regardless of future governance outcomes, funding relationships, or organizational changes to Oros itself.

**10. No forced disclosure of unrelated assets.** Participation in this framework does not require contributors or institutions to open-source unrelated proprietary work, internal tooling, or independently developed commercial infrastructure outside the scope of collaboratively developed commons components.

**11. Vendor neutrality and site choice.** Oros provides a readiness and quality layer that operates within an ecosystem of compatible third-party products: data aggregators, EHR systems, analytics platforms, device data services, hosting providers, and others. These ecosystem participants may be open-source or proprietary, and vendor selection at the ecosystem layer is a deployment choice made by the implementing site. Participation by both open-source and proprietary ecosystem participants is welcome, provided they do not restrict access to the Oros commons, prevent interoperability with it, or impose exclusive ownership claims on broadly applicable infrastructure.

## Distinct Concepts

Within this framework, attribution, stewardship, ownership, and commercialization are treated as distinct concepts:

- **Attribution**: recognizes authorship and contribution to released artifacts. It is an Oros recognition policy, independent of copyright ownership and licensing authority.
- **Stewardship**: the responsibility for maintaining, releasing, and governing shared infrastructure on behalf of the commons.
- **Ownership**: copyright in each contribution remains with the contributor or their institution. The rights that matter to the commons are granted irrevocably to Oros and to all downstream users under the Apache License 2.0 and the Contributor License Agreements.
- **Commercialization**: may occur through implementation services, hosted infrastructure, support agreements, ecosystem products, and other downstream activities that do not restrict reuse of the commons.

Separating these concepts is intended to reduce ambiguity and preserve collaboration velocity across institutions and contributors.

## Infrastructure Layers

The framework recognizes three layers of work, each with a distinct classification of copyright, license, and stewardship.

| Layer | What it contains | Copyright, License & Stewardship |
| --- | --- | --- |
| Layer 1: Core | Condition-agnostic infrastructure: data model, check engine, scoring engine, normalization pipeline, remediation workflow | Oros stewardship; Apache License 2.0 |
| Layer 2: Contributions | Condition modules, clinical threshold validation, value sets, use-case fitness definitions | Copyright remains with the contributor or their institution per the CLA; licensed under Apache 2.0; attributed to the individual contributor |
| Layer 3: Implementations | Site-specific EHR integrations, local UI customizations, institution-specific reporting | Owned by the implementing institution |

If a contribution originally framed as Layer 2 turns out to have broad applicability beyond the contributing institution, it is classified as core and maintained in the canonical repository under Oros stewardship. Determination of broad applicability is made through documented maintainer review under Oros stewardship, in consultation with the contributor. Funding does not transfer that classification.

### What institutions can and cannot do

| Institutions can | Institutions cannot |
| --- | --- |
| Deploy and use the infrastructure | Restrict the licenses already granted in core components |
| Contribute Layer 2 improvements | Restrict reuse by others |
| Own Layer 3 local adaptations | Apply exclusivity to generalized work |
| Receive attribution for contributions | Strip or narrow Apache 2.0 terms from covered core code |
| Publish research using the infrastructure | Remove required attribution notices from source distributions |

## Contribution Model

| Role | Contribution | What They Receive |
| --- | --- | --- |
| Regional node (ACO, IDN, HIE, or similar regional health data aggregator) | Data access and feed routing during the bridge phase; the destination environment for capabilities as they transition to permanent regional hosting | Named partner attribution, infrastructure access, early adopter advantage, and a proven capability at transition rather than a build-from-scratch project |
| Clinical domain expert | Condition module validation, threshold definition, use case design | Named contributor attribution in condition module, co-authorship on methodology publications |
| Research institution | IRB oversight, research use case definition, OMOP validation | Research access to remediated data, publication opportunities, named collaboration |
| Device/data aggregator | Device data pathway, API integration | Named partner attribution, integration documentation |
| Funder | Condition module development, pilot implementation | Named funder attribution, public good credit, open-source release under their support |

## What This Framework Is Not

- **Not a data sharing agreement.** Data use is governed by data sharing agreements between participating organizations and the operating environment. In early deployments, Oros operates a bridge environment that ingests and holds clinical and device data under those agreements, because regional hosts are often not yet positioned to take on this work. Oros is a temporary custodian, not a permanent home: the agreements plan the transition of data and workflows to a designated regional host from the start, and Oros does not hold data longer than it is useful.
- **Not a research protocol.** IRB oversight is the responsibility of the research institution. Oros provides technical infrastructure; institutional governance covers research use.
- **Not an exclusivity arrangement.** Oros deploys this infrastructure across multiple regions and partners.
- **Not an IP transfer.** Engaging Oros for consulting or deployment does not transfer ownership of the infrastructure or any condition module.

## FAQ for Institutional Partners

*The following questions are addressed to technical, legal, and administrative contacts, including technology transfer offices, at collaborating institutions.*

**Q: Our institution is contributing to this project through a grant. Do we own the infrastructure?**

No. The Oros CKM Data Readiness Infrastructure was developed independently prior to any funded institutional engagement. Funding a consulting engagement or a pilot deployment does not transfer ownership of pre-existing independently developed software. The infrastructure is Apache 2.0-licensed: those rights are granted irrevocably to everyone, and Oros stewards the canonical repository.

**Q: A researcher or faculty member at our institution is contributing to a condition module. Does our institution own that module?**

Ownership and control are separate questions, and this framework separates them deliberately. Your institution may hold copyright in the specific contribution if the researcher's work falls within the scope of their employment. That is exactly why Oros requires a Corporate CLA before accepting such contributions: the institution grants a perpetual, irrevocable license permitting the contribution's use and distribution under the Apache License 2.0. Holding that copyright confers no ability to restrict, relicense, or withdraw the module: the rights are already granted to Oros and to every downstream user, irrevocably. Attribution runs to the individual researcher as a matter of Oros recognition policy, with institutional affiliation listed alongside their name for context; attribution is independent of copyright ownership.

**Q: Our tech transfer office wants to review this. What should they know?**

The core infrastructure is Apache 2.0-licensed open-source software developed independently prior to any engagement with your institution. There is no pre-existing IP to transfer, license exclusively, or negotiate over. The Apache License 2.0 is irrevocable. Local adaptations your institution develops remain yours. Copyright in individual contributions remains with contributors or their institutions, subject to the irrevocable licenses granted under the CLA and Apache 2.0; the core infrastructure and broadly applicable condition modules are maintained in the canonical repository under Oros stewardship.

**Q: We want to use Oros in a federally funded research project. What agreements do we need?**

The Apache License 2.0 covers use. No separate IP agreement is required. If you want Oros's team to support deployment, integration, or cross-team coordination, that is a services engagement scoped separately from any IP discussion. IRB oversight for research use of remediated data is the responsibility of the research institution.

**Q: Does Oros require a Contributor License Agreement?**

Yes. Contributions to the Oros repository are accepted under a Contributor License Agreement (CLA), modeled on the Apache Software Foundation's standard CLAs. The CLA confirms two things: that the contributor has the legal right to license their contribution under the project's terms (which addresses the work-for-hire question where an employer holds copyright in the contributor's work), and that the contributor grants the project a license to use their contribution under the Apache License 2.0. The CLA does not transfer copyright to Oros; contributors retain their copyright and grant a license. Every contributor signs an Individual CLA. Where the contributor's employer or institution may hold rights in the work, the institution additionally executes a Corporate CLA and designates its authorized contributors. The two instruments cover different interests and both are required in that case.

**Q: A funder wants to fund condition module development. Who owns the resulting module?**

The funder receives attribution as the enabling funder. The individual clinical expert who authors the module receives attribution as the contributor, with their institutional affiliation listed alongside their name for context. Copyright in the contribution remains with the contributor or their institution per the CLA, and the module is released under the same Apache License 2.0 as the core infrastructure. No funder or institution receives exclusive rights over a condition module with broad clinical applicability.

**Q: We want to build a proprietary version of this for our institution.**

You may build local adaptations and customizations that belong to your institution: site-specific workflows, branded interfaces, local configurations. What no one can do is remove the core from the commons. The Apache 2.0 rights already granted in the core are irrevocable: recipients may build proprietary derivatives and larger works to the extent Apache 2.0 permits, but the core itself remains permanently available to everyone under Apache 2.0. No funding relationship, engagement, or derivative work withdraws it, and attempts to claim exclusive rights over the core through funding or engagement relationships are inconsistent with this framework and would not be honored.

**Q: Can institutions use proprietary platforms alongside Oros? Can commercial vendors participate in the Oros ecosystem?**

Yes to both. Oros operates within an ecosystem of interoperable products and services that includes both open-source and proprietary participants.

*For institutions:* vendor selection at the ecosystem layer, covering EHR systems, data aggregators, analytics platforms, device data services, and hosting providers, is the deploying institution's choice. Oros does not endorse, require, or restrict specific vendors.

*For commercial vendors:* your product remains yours. Oros does not require you to open-source your product. You retain copyright, control over pricing, and freedom to develop the product as you see fit.

The only requirement, for both, is that participating products do not restrict access to the Oros commons, prevent interoperability with it, or impose exclusive ownership claims on broadly applicable infrastructure. Oros does not seek to replace ecosystem participants; it provides a shared readiness and interoperability foundation that enables them to operate on more trustworthy and fit-for-purpose data.

**Q: What should a funder include in a grant agreement to ensure Oros-related work reaches the open-source commons?**

Two terms, together:

- **License specification.** The grant specifies that software deliverables of broad applicability are released under the Apache License 2.0. Naming the license specifically prevents ambiguous "freely available" language from being reinterpreted by an institutional intermediary.
- **Deposit mechanism.** The grant specifies that those deliverables are deposited in the Oros repository as a Pull Request, with the LICENSE file in place, as a condition of grant completion. This makes the open-source release a concrete, verifiable deliverable tied to grant milestones, not a promised future action.

Together, these terms close the gap between funder intent and actual open-source availability. Oros encourages funders of work in this space to adopt both terms in grant agreements.

**Q: How does the OMOP output relate to our research program?**

OMOP CDM output is generated from Tier 3 approved, remediated records, meaning the data quality gate is part of the record. This makes the OMOP output more trustworthy as a research input than a raw EHR extract. Research use is governed by your institution's IRB and applicable data use agreements. Oros provides the technical infrastructure; your institution governs the research.

## Next Steps for Partners

- Confirm alignment with this framework in writing (email is sufficient for application purposes)
- Scope data use agreements between the regional node and contributing clinical sites
- Define IRB pathway through the research institution
- Define scope of any implementation, integration, or bridge support needed from Oros and agree on terms for that engagement
- Formal collaboration agreement prior to pilot launch

*This document is a working alignment artifact, not a legal agreement. Formal agreements follow standard institutional review.*
