/**
 * Engine-specific types for the v3 Pipeline
 * 
 * These types extend and complement the existing wizard types,
 * providing a cleaner abstraction for the pipeline engine.
 */

import {
  CSVRow,
  TranslatedRecord,
  NormalizedRecord,
  QualityScore,
  EnrichedRecord,
  AnalyticsSummary,
} from '../types/wizard';

/**
 * Represents the version of a dataset after pipeline processing
 */
export type DatasetVersion = 
  | 'v3_raw'
  | 'v3_translated'
  | 'v3_normalized'
  | 'v3_normalized_ai'  // After AI patches applied
  | 'v3_enriched'
  | 'v3_enriched_ai';   // After AI enrichments

/**
 * Pipeline execution context passed between steps
 */
export interface PipelineContext {
  runId: string;
  startTime: Date;
  datasetVersion: DatasetVersion;
  aiEnabled: boolean;
  metadata?: Record<string, any>;
}

/**
 * Result of a pipeline step execution
 */
export interface StepResult<T = any> {
  success: boolean;
  data?: T;
  errors?: PipelineError[];
  warnings?: PipelineWarning[];
  duration?: number;  // milliseconds
  metadata?: Record<string, any>;
}

/**
 * Pipeline-specific error structure
 */
export interface PipelineError {
  code: string;
  message: string;
  step?: string;
  field?: string;
  rowIndex?: number;
  severity: 'error' | 'critical';
  details?: any;
}

/**
 * Pipeline warning (non-blocking issues)
 */
export interface PipelineWarning {
  code: string;
  message: string;
  step?: string;
  field?: string;
  rowIndex?: number;
  details?: any;
}

/**
 * Ingestion-specific types
 */
export interface IngestionResult {
  records: CSVRow[];
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  errors: IngestionError[];
}

export interface IngestionError {
  rowIndex: number;  // 1-based
  field?: string;
  type: 'missing' | 'invalid' | 'out_of_range' | 'schema';
  message: string;
  rawValue?: string;
}

/**
 * Translation-specific types
 */
export interface TranslationResult {
  records: TranslatedRecord[];
  mappedFields: number;
  unmappedFields: number;
  issues: TranslationIssue[];
}

export interface TranslationIssue {
  recordId: string;
  field: string;
  issue: string;
  severity: 'warning' | 'error';
}

/**
 * Normalization-specific types
 */
export type NormalizationStatus = 
  | 'mapped' 
  | 'unmapped' 
  | 'unknown' 
  | 'mapped_via_ai';

export interface NormalizationResult {
  records: NormalizedRecord[];
  statistics: {
    totalCodes: number;
    mappedCodes: number;
    unmappedCodes: number;
    aiMappedCodes: number;
  };
  issues: NormalizationIssue[];
}

export interface NormalizationIssue {
  recordId: string;
  domain: 'diagnosis' | 'medication' | 'lab' | 'procedure';
  sourceValue: string;
  issue: 'unmapped' | 'ambiguous' | 'invalid';
  suggestedMapping?: string;
}

/**
 * Persistence result
 */
export interface PersistenceResult {
  persistedCount: number;
  failedCount: number;
  ndjson?: string;
  datasetVersion: DatasetVersion;
  storageLocation?: string;
}

/**
 * Complete pipeline state at any point
 */
export interface PipelineState {
  context: PipelineContext;
  
  // Step outputs
  ingestionResult?: IngestionResult;
  translationResult?: TranslationResult;
  normalizationResult?: NormalizationResult;
  qualityScores?: QualityScore[];
  persistenceResult?: PersistenceResult;
  enrichedRecords?: EnrichedRecord[];
  analyticsSummary?: AnalyticsSummary;
  
  // Tracking
  currentStep?: string;
  completedSteps: string[];
  failedSteps: string[];
  
  // Agent insights per step (only populated when AI is enabled)
  agentInsights?: Map<string, StepAgentInsights>;
  
  // Audit trail (for future use)
  auditLog?: AuditEntry[];
}

/**
 * Audit log entry for tracking changes
 */
export interface AuditEntry {
  timestamp: Date;
  step: string;
  action: 'started' | 'completed' | 'failed' | 'patched';
  userId?: string;
  details?: Record<string, any>;
  datasetVersionBefore?: DatasetVersion;
  datasetVersionAfter?: DatasetVersion;
}

/**
 * Agent insight summary for a pipeline step
 * High-level summary of what the AI agent found
 */
export interface AgentInsightSummary {
  /** The step name this insight is for */
  stepName: string;
  
  /** Overall severity of issues found */
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  /** Short summary of the main issue (1-2 sentences) */
  shortSummary: string;
  
  /** Number of issues detected */
  issueCount: number;
  
  /** Whether AI has patches available */
  hasPatchesAvailable: boolean;
}

/**
 * Detailed agent insights for a specific step
 * Contains root cause analysis, suggestions, and patches
 */
export interface StepAgentInsights {
  /** Summary information */
  summary: AgentInsightSummary;
  
  /** Root cause analysis - bullet points */
  rootCauseAnalysis: string[];
  
  /** Suggested fixes - actionable recommendations */
  suggestedFixes: {
    description: string;
    impact: 'low' | 'medium' | 'high';
    automated: boolean;
  }[];
  
  /** Preview of available patches (if any) */
  patchPreview?: {
    recordId: string;
    field: string;
    currentValue: any;
    suggestedValue: any;
    confidence: number;
  }[];
  
  /** Full patch suggestions with metadata */
  patches?: Array<{
    patchId: string;
    recordId: string;
    field: string;
    originalValue: any;
    patchedValue: any;
    reason: string;
    confidence: number;
    status: 'proposed' | 'applied' | 'rejected';
  }>;
  
  /** Overall patch status for this step */
  patchStatus?: 'none' | 'proposed' | 'applied' | 'rejected' | 'mixed';
  
  /** When this analysis was generated */
  timestamp: Date;
  
  /** Time taken for analysis in ms */
  analysisTimeMs: number;
  
  /** Raw response from agent (for debugging) */
  rawResponse?: any;
}