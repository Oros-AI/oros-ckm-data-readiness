// src/domain/types.ts
// The data-driven rendering contract — Demo UI/UX Specification §7.3
// (normative types) plus the 2026-07-12 revision-entry additions
// (Blocker.recommendationType, Blocker.bugId), written against the exported
// fixture shape verified in gate_inc1_precheck.txt / gate_inc1_build.txt.
//
// The UI renders these shapes and invents no shapes the engine does not
// emit. Data-driven rule: identifiers that arrive with the data — use-case
// names, pipeline stage ids — are `string`, NOT unions, so a new use case
// or stage lands via a re-exported fixture with zero type change.

// ---- enums: exactly the engine's value lists (CLAUDE.md §6, §7, §9) ----
export type ReadinessStatus = 'READY' | 'PARTIALLY_READY' | 'NOT_READY';
export type CheckStatus = 'PASS' | 'FAIL' | 'PARTIAL' | 'NOT_APPLICABLE';
export type PathwayResult = 'primary_pass' | 'fallback_pass' | 'no_valid_pathway';
export type CheckScope = 'ehr' | 'device' | 'use_case';
export type Priority = 'High' | 'Medium' | 'Low';
export type ImplementationState = 'implemented' | 'demonstrated_stub' | 'architectural';

// The seven canonical strings (CLAUDE.md §7); enforced at two layers in the
// engine (config loader + DB CHECK), so the fixture can only carry these.
export type ResponsibleRole =
  | 'Primary Care Site'
  | 'Specialty Partner'
  | 'Regional Data Node'
  | 'Technology Vendor'
  | 'Program Coordinator'
  | 'Network/Payer'
  | 'Policy/Regulatory';

// Engine classification carried on the blocker (spec §10.1 + the 2026-07-12
// revision entry (a) — the type is carried on the blocker in the fixture).
export type RecommendationType = 'ai_suggested_fix' | 'route_to_stakeholder';

// ---- the top-level shape getReadinessData(session) returns ----
export interface ReadinessData {
  session: SessionMeta;
  useCases: UseCaseSummary[]; // front-door cards
  blockers: Blocker[]; // list-driven; the four-facts units
  criteria: ConfiguredCriterion[]; // surfaced as configuration (§9)
  pipeline: PipelineStageView[]; // under-the-hood toggle (§2.2)
  // per-patient detail is optional in the fixture; the front door never uses it
  patientRows?: PatientUseCaseRow[];
}

export interface SessionMeta {
  demoSessionId: string; // the real UUID
  label: 'A' | 'B' | 'C';
  datasetState: 'clean' | 'buggy' | 'remediated';
  audienceType?: string; // reserved for fast-follow per-audience views
}

export interface UseCaseSummary {
  useCaseName: string; // frozen enum value in data, e.g. 'vbc_reporting'
  displayName: string;
  category: string; // engine's use_case_category value
  implementationState: ImplementationState; // drives the honesty label (§12)
  overallStatus: ReadinessStatus; // site display band over strict ready fraction
  // null by design at population level (spec revision entry (c), 2026-07-12):
  // the engine emits per-patient fitness (see patientRows); the export
  // invents no population statistic.
  fitnessScore: number | null;
  pathwayResult: PathwayResult | null; // null at population level
  // Mechanical id (e.g. 'cgm_primary') — never rendered raw (CLAUDE.md §1.6):
  // user-facing copy uses the reconciled narrative, not pathway names.
  activePathwayId: string | null;
  requiredVariables: string[];
  blockingVariables: string[];
  partialVariables: string[];
  patientCounts: { ready: number; partiallyReady: number; notReady: number };
  blockerIds: string[]; // links to Blocker[] for this capability
}

export interface Blocker {
  blockerId: string;
  recommendationId: string; // links to the scripted recommendation (§10)
  checkName: string; // full name, e.g. 'device_patient_linkage_cgm'
  checkScope: CheckScope;
  priority: Priority;
  // Deliberate tightening of §7.3's optional markers (observedValue?,
  // threshold?): the exporter ALWAYS emits both fields (observedValue is
  // null at the blocker grain; per-record evidence lives in the score
  // stage's CheckResultView rows), so they are present-and-nullable here
  // to match fixture truth.
  threshold: number | null;
  phenotype: string; // e.g. 'Identity Linkage Failure'
  blockedUseCaseName: string; // frozen enum in data; UI maps to displayName
  responsibleRole: ResponsibleRole;
  capabilityBlocked: string; // the displayName of the blocked capability
  recommendationType: RecommendationType; // revision entry (a), 2026-07-12
  bugId: string; // content-map hint linking to the Reconciliation doc entry
  // the four facts, as plain-language strings produced at export time:
  whatFailed: string;
  whatUnlocks: string;
  status: CheckStatus;
  observedValue: string | number | null; // see tightening note on threshold
}

export interface ConfiguredCriterion {
  criterionId: string;
  label: string;
  // Frozen use_case_name, or the documented sentinel 'all' for the one
  // site-level display-band criterion spanning every use case's rollup
  // (spec revision entry (b), 2026-07-12).
  appliesToUseCase: string;
  tier: 'foundational' | 'customizable';
  configVersion: string; // e.g. 'diabetes.config.json@0.1'
  ownedBy: string; // e.g. 'Local clinical team' — never 'the platform'
  value: string; // the configured threshold/value, shown as configured
}

export interface PipelineStageView {
  stageId: string; // data-driven: stages arrive with the fixture
  label: string;
  status: 'complete' | 'attention' | 'pending';
  checkResults?: CheckResultView[]; // the receipts behind the headline
}

export interface CheckResultView {
  checkName: string;
  variableName: string;
  status: CheckStatus;
  score: number | null;
  threshold: number | null;
  observedValue: string | number | null;
  priority: Priority;
  patientId: string;
}

export interface PatientUseCaseRow {
  patientId: string;
  useCaseName: string;
  overallStatus: ReadinessStatus;
  fitnessScore: number | null;
  pathwayResult: PathwayResult;
  activePathwayId: string | null;
}
