/**
 * Agentic types for AI-powered pipeline assistance
 * 
 * These types define the contract between the pipeline and AI agents (Archia).
 * They are designed to be flexible enough for both mock and real implementations.
 */

import { DatasetVersion } from '../engine/types';

/**
 * Context passed to agent for analysis
 */
export interface AgentContext {
  /** The pipeline step being analyzed */
  step: 'ingestion' | 'translation' | 'normalization' | 'scoring' | 'enrichment' | 'analytics';
  
  /** Current dataset version */
  datasetVersion: DatasetVersion;
  
  /** Whether AI is enabled globally */
  aiEnabled: boolean;
  
  /** Total number of records being processed */
  totalRecords: number;
  
  /** Number of records with errors */
  errorRecords: number;
  
  /** Sample of errors for analysis */
  sampleErrors?: AgentError[];
  
  /** Sample of problematic records */
  sampleRecords?: any[];
  
  /** Additional metadata specific to the step */
  metadata?: Record<string, any>;
  
  /** Run ID for tracking */
  runId?: string;
}

/**
 * Error details for agent analysis
 */
export interface AgentError {
  /** Row or record index */
  rowIndex?: number;
  
  /** Record ID if available */
  recordId?: string;
  
  /** Field with the error */
  field?: string;
  
  /** Error type */
  type: string;
  
  /** Error message */
  message: string;
  
  /** Raw value that caused the error */
  rawValue?: any;
  
  /** Expected value or format */
  expectedValue?: any;
}

/**
 * Agent's suggestion for fixing an issue
 */
export interface AgentSuggestion {
  /** Unique identifier for the suggestion */
  id: string;
  
  /** Type of suggestion */
  type: 'fix' | 'warning' | 'info' | 'enhancement';
  
  /** Priority of the suggestion */
  priority: 'high' | 'medium' | 'low';
  
  /** Human-readable title */
  title: string;
  
  /** Detailed description */
  description: string;
  
  /** Specific actions to take */
  actions?: string[];
  
  /** Confidence score (0-1) */
  confidence?: number;
  
  /** Related documentation or references */
  references?: string[];
}

/**
 * Patch suggestion for specific records
 */
export interface PatchSuggestion {
  /** Record identifier */
  recordId: string;
  
  /** Row index if applicable */
  rowIndex?: number;
  
  /** Field to patch */
  field: string;
  
  /** Original value */
  originalValue: any;
  
  /** Suggested new value */
  suggestedValue: any;
  
  /** Reason for the patch */
  reason: string;
  
  /** Confidence in the patch (0-1) */
  confidence: number;
  
  /** Whether this patch was applied */
  applied?: boolean;
  
  /** Timestamp when applied */
  appliedAt?: Date;
}

/**
 * Complete agent response
 */
export interface AgentResponse {
  /** Root cause analysis */
  rootCause: string;
  
  /** List of suggestions */
  suggestions: AgentSuggestion[];
  
  /** Specific patches for records */
  patches?: PatchSuggestion[];
  
  /** Step-by-step narrative report */
  narrative?: string;
  
  /** Overall confidence in the analysis */
  confidence?: number;
  
  /** Limitations or caveats */
  limitations?: string[];
  
  /** Metadata about the analysis */
  metadata?: {
    analysisTime?: number;
    modelsUsed?: string[];
    apiVersion?: string;
  };
}

/**
 * Summary of an agent run
 */
export interface AgentRunSummary {
  /** Unique run identifier */
  runId: string;
  
  /** Step that was analyzed */
  step: string;
  
  /** When the analysis started */
  startTime: Date;
  
  /** When the analysis completed */
  endTime?: Date;
  
  /** Whether the analysis succeeded */
  success: boolean;
  
  /** Number of issues analyzed */
  issuesAnalyzed: number;
  
  /** Number of suggestions made */
  suggestionsMade: number;
  
  /** Number of patches proposed */
  patchesProposed: number;
  
  /** Number of patches accepted by user */
  patchesAccepted?: number;
  
  /** Error if the analysis failed */
  error?: string;
  
  /** Full response from the agent */
  response?: AgentResponse;
}

/**
 * Request payload for Archia agent endpoint
 * Aligns with the spec in docs/04-archia-integration.md
 */
export interface ArchiaAgentRequest {
  step: string;
  ai_enabled: boolean;
  error_type?: string;
  error_details?: Record<string, any>;
  sample_records?: Array<{
    rowIndex?: number;
    raw?: Record<string, any>;
    normalized?: Record<string, any>;
  }>;
  context?: {
    dataset_version: string;
    value_sets_used?: string[];
    config?: Record<string, any>;
    run_id?: string;
  };
}

/**
 * Response from Archia agent endpoint
 * Aligns with the spec in docs/04-archia-integration.md
 */
export interface ArchiaAgentResponse {
  root_cause: string;
  suggested_fixes: string[];
  patched_rows?: Array<{
    rowIndex: number;
    patched: Record<string, any>;
    patch_metadata?: {
      confidence: number;
      rules_or_models?: string[];
    };
  }>;
  insights?: Array<{
    type: 'warning' | 'info';
    message: string;
  }>;
  step_by_step_report?: string;
}

/**
 * Request payload for Archia query endpoint (Analytics "Ask Anything")
 */
export interface ArchiaQueryRequest {
  question: string;
  dataset_version: string;
  filters?: Record<string, any>;
  context?: {
    available_metrics?: string[];
    run_id?: string;
  };
}

/**
 * Response from Archia query endpoint
 */
export interface ArchiaQueryResponse {
  answer: string;
  supporting_analysis?: string;
  suggested_visualizations?: Array<{
    type: string;
    metric: string;
    [key: string]: any;
  }>;
  follow_up_questions?: string[];
  raw_result?: Record<string, any>;
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  /** Whether to use mock responses */
  useMock: boolean;
  
  /** Base URL for Archia API */
  apiUrl?: string;
  
  /** API key for authentication */
  apiKey?: string;
  
  /** Timeout in milliseconds */
  timeout?: number;
  
  /** Maximum number of retries */
  maxRetries?: number;
  
  /** Whether to log requests/responses */
  debug?: boolean;
}