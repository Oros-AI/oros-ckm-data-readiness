import {
  StepName,
  StepState,
  CSVRow,
  TranslatedRecord,
  NormalizedRecord,
  QualityScore,
  EnrichedRecord,
  AnalyticsSummary,
} from "../types/wizard";

export interface WizardState {
  currentStep: StepName;
  stepStates: Record<StepName, StepState>;
  ingestedRows: CSVRow[];
  translatedRecords: TranslatedRecord[];
  normalizedRecords: NormalizedRecord[];
  qualityScores: QualityScore[];
  persistedCount: number;
  persistedFailures: number;
  enrichedRecords: EnrichedRecord[];
  analyticsSummary: AnalyticsSummary | null;
}

export const initialStepStates: Record<StepName, StepState> = {
  ingestion: { status: "pending" },
  translation: { status: "pending" },
  normalization: { status: "pending" },
  dataQualityScoring: { status: "pending" },
  persistence: { status: "pending" },
  enrichment: { status: "pending" },
  analytics: { status: "pending" },
};

export const initialWizardState: WizardState = {
  currentStep: "ingestion",
  stepStates: initialStepStates,
  ingestedRows: [],
  translatedRecords: [],
  normalizedRecords: [],
  qualityScores: [],
  persistedCount: 0,
  persistedFailures: 0,
  enrichedRecords: [],
  analyticsSummary: null,
};

export const STEPS: Array<{ id: StepName; label: string; order: number }> = [
  { id: "ingestion", label: "Ingestion", order: 1 },
  { id: "translation", label: "Translation", order: 2 },
  { id: "normalization", label: "Normalization", order: 3 },
  { id: "dataQualityScoring", label: "Scoring", order: 4 },
  { id: "persistence", label: "Persistence", order: 5 },
  { id: "enrichment", label: "Enrichment", order: 6 },
  { id: "analytics", label: "Analytics", order: 7 },
];
