export type StepStatus = 'pending' | 'running' | 'success' | 'error';

export type StepName = 
  | 'ingestion'
  | 'translation'
  | 'normalization'
  | 'dataQualityScoring'
  | 'persistence'
  | 'enrichment'
  | 'analytics';

export interface Step {
  id: StepName;
  label: string;
  order: number;
}

export interface StepState {
  status: StepStatus;
  error?: string;
}

export interface CSVRow {
  [key: string]: string;
}

export interface PatientRecord {
  ID: string;
  Name: string;
  Age: string;
  Sex: string;
  Height: string;
  Weight: string;
  Diagnosis1: string;
  Diagnosis2: string;
  Medication1: string;
  Medication2: string;
  Lab1: string;
  Lab2: string;
  Procedure1: string;
  Procedure2: string;
}

export interface TranslatedRecord {
  id: string;
  name: string;
  demographics: {
    age: string;
    sex: string;
    height: string;
    weight: string;
  };
  diagnoses: string[];
  medications: string[];
  labs: string[];
  procedures: string[];
}

export interface NormalizedRecord {
  id: string;
  name: string;
  demographics: {
    age: number;
    sex: 'M' | 'F' | 'Other';
    height: number;
    weight: number;
  };
  diagnoses: Array<{ code: string; system: 'ICD-10' }>;
  medications: Array<{ code: string; system: 'RxNorm' }>;
  labs: Array<{ code: string; system: 'LOINC' }>;
  procedures: Array<{ code: string; system: 'SNOMED-CT' }>;
}

export interface QualityScore {
  domain: string;
  score: number; // Integer score 0-100
  recordsBelowThreshold: number;
  label?: string; // Quality label: "Excellent", "Good", "Fair", or "Poor"
  present?: number; // Number of non-missing values
  total?: number; // Total possible values
}

export interface EnrichedRecord extends NormalizedRecord {
  bmi: number;
  diabetesRisk: number;
}

export interface AnalyticsSummary {
  sexDistribution: { [key: string]: number };
  ageHistogram: Array<{ range: string; count: number }>;
  diagnosisDistribution: Array<{ diagnosis: string; count: number }>;
  diabetesRiskDistribution: Array<{ range: string; count: number }>;
}

// ============================================================================
// V3 Types - Added for v3 architecture support
// These types support the new pipeline engine and agentic capabilities
// They are additive and do not modify existing types above
// ============================================================================

/**
 * Dataset version tracking for v3 pipeline
 * Tracks the state of data as it moves through the pipeline
 */
export type DatasetVersion = 
  | 'v3_raw'                // After ingestion
  | 'v3_translated'         // After translation
  | 'v3_normalized'         // After normalization
  | 'v3_normalized_ai'      // After AI patches applied to normalization
  | 'v3_enriched'           // After enrichment
  | 'v3_enriched_ai';       // After AI enrichments applied

/**
 * Status of normalization for medical codes
 * Tracks whether codes were successfully mapped
 */
export type NormalizationStatus = 
  | 'mapped'                // Successfully mapped to standard terminology
  | 'unmapped'              // Could not be mapped
  | 'unknown'               // Unknown or ambiguous
  | 'mapped_via_ai';        // Mapped with AI assistance

/**
 * Extended normalized record with v3 features
 * Extends the existing NormalizedRecord with additional tracking
 */
export interface NormalizedRecordV3 extends NormalizedRecord {
  /** Track normalization status for each field */
  normalizationStatus?: {
    diagnoses?: NormalizationStatus[];
    medications?: NormalizationStatus[];
    labs?: NormalizationStatus[];
    procedures?: NormalizationStatus[];
  };
  /** Track the dataset version */
  datasetVersion?: DatasetVersion;
  /** Track any normalization issues */
  normalizationIssues?: NormalizationIssue[];
}

/**
 * Ingestion error details
 * Used to track problems during CSV ingestion
 */
export interface IngestionError {
  /** Row index in the CSV (1-based) */
  rowIndex: number;
  /** Patient ID if available */
  id?: string;
  /** Field that has the error */
  field: string;
  /** Type of error encountered */
  type: 'missing' | 'invalid' | 'out_of_range' | 'schema';
  /** Human-readable error message */
  message: string;
  /** The raw value that caused the error */
  rawValue?: string | null;
}

/**
 * Normalization issue details
 * Used to track problems during medical code normalization
 */
export interface NormalizationIssue {
  /** Record identifier */
  recordId: string;
  /** Medical domain affected */
  domain: 'diagnosis' | 'medication' | 'lab' | 'procedure';
  /** Original source value */
  sourceValue: string;
  /** Type of issue encountered */
  issue: 'unmapped' | 'ambiguous' | 'invalid';
  /** Suggested mapping if available */
  suggestedMapping?: string;
}

/**
 * Agentic patch record
 * Tracks AI-suggested changes to data
 */
export interface AgenticPatch {
  /** Unique patch identifier */
  patchId: string;
  /** Pipeline step where patch was suggested */
  step: StepName;
  /** Record being patched */
  recordId: string;
  /** Field being patched */
  field: string;
  /** Original value before patch */
  originalValue: any;
  /** Suggested new value */
  patchedValue: any;
  /** Reason for the patch */
  reason: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Whether the patch was applied */
  applied: boolean;
  /** When the patch was applied */
  appliedAt?: Date;
  /** User who approved the patch */
  appliedBy?: string;
}

/**
 * Pipeline run metadata
 * Tracks information about a complete pipeline execution
 */
export interface PipelineRunMetadata {
  /** Unique run identifier */
  runId: string;
  /** When the run started */
  startTime: Date;
  /** When the run ended */
  endTime?: Date;
  /** Whether AI was enabled for this run */
  aiEnabled: boolean;
  /** Current dataset version */
  datasetVersion: DatasetVersion;
  /** Total records processed */
  totalRecords: number;
  /** Records with errors */
  errorRecords: number;
  /** Applied patches */
  appliedPatches: AgenticPatch[];
}

/**
 * Step execution result
 * Tracks the outcome of a single pipeline step
 */
export interface StepExecutionResult {
  /** Step that was executed */
  step: StepName;
  /** Whether execution succeeded */
  success: boolean;
  /** Execution duration in milliseconds */
  duration: number;
  /** Number of records processed */
  recordsProcessed: number;
  /** Number of errors encountered */
  errorsEncountered: number;
  /** Whether AI assistance was used */
  aiAssistanceUsed: boolean;
  /** Number of AI suggestions made */
  aiSuggestionsMade?: number;
  /** Number of AI patches applied */
  aiPatchesApplied?: number;
}

/**
 * Extended quality score with v3 features
 */
export interface QualityScoreV3 extends QualityScore {
  /** Confidence in the score calculation */
  confidence?: number;
  /** Whether AI was used to improve the score */
  aiImproved?: boolean;
  /** Detailed breakdown of score components */
  breakdown?: {
    completeness: number;
    consistency: number;
    validity: number;
    uniqueness: number;
  };
}

/**
 * Analytics query for "Ask Anything" feature
 */
export interface AnalyticsQuery {
  /** Natural language question */
  question: string;
  /** Dataset version to query */
  datasetVersion: DatasetVersion;
  /** Optional filters */
  filters?: Record<string, any>;
  /** Query timestamp */
  timestamp: Date;
}

/**
 * Analytics query response
 */
export interface AnalyticsQueryResponse {
  /** The original query */
  query: AnalyticsQuery;
  /** Natural language answer */
  answer: string;
  /** Supporting data or visualizations */
  supportingData?: any;
  /** Confidence in the answer */
  confidence?: number;
  /** Response time in milliseconds */
  responseTime: number;
}
