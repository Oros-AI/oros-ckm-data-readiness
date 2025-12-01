/**
 * PipelineEngine Interface
 * 
 * Defines the contract for pipeline execution engines.
 * This abstraction allows for different implementations (deterministic, AI-enhanced, etc.)
 * while maintaining a consistent interface.
 */

import {
  CSVRow,
  TranslatedRecord,
  NormalizedRecord,
  QualityScore,
  EnrichedRecord,
  AnalyticsSummary,
} from '../types/wizard';

import {
  PipelineContext,
  StepResult,
  IngestionResult,
  TranslationResult,
  NormalizationResult,
  PersistenceResult,
  PipelineState,
} from './types';

/**
 * Core interface for pipeline execution
 */
export interface PipelineEngine {
  /**
   * Initialize a new pipeline run
   */
  initialize(config?: Partial<PipelineContext>): PipelineContext;

  /**
   * Get current pipeline state
   */
  getState(): PipelineState;

  /**
   * Step 1: Ingest CSV data
   * @param rows Raw CSV rows
   * @param context Pipeline context
   * @returns Ingestion result with parsed records and any errors
   */
  ingest(
    rows: CSVRow[],
    context?: PipelineContext
  ): Promise<StepResult<IngestionResult>>;

  /**
   * Step 2: Translate raw records to structured format
   * @param rows Raw CSV rows or ingestion result
   * @param context Pipeline context
   * @returns Translation result with structured records
   */
  translate(
    rows: CSVRow[] | IngestionResult,
    context?: PipelineContext
  ): Promise<StepResult<TranslationResult>>;

  /**
   * Step 3: Normalize medical codes and units
   * @param records Translated records
   * @param context Pipeline context
   * @returns Normalization result with standardized codes
   */
  normalize(
    records: TranslatedRecord[] | TranslationResult,
    context?: PipelineContext
  ): Promise<StepResult<NormalizationResult>>;

  /**
   * Step 4: Calculate data quality scores
   * @param records Normalized records
   * @param context Pipeline context
   * @returns Quality scores by domain
   */
  calculateQualityScores(
    records: NormalizedRecord[] | NormalizationResult,
    context?: PipelineContext
  ): Promise<StepResult<QualityScore[]>>;

  /**
   * Step 5: Persist normalized data
   * @param records Normalized records
   * @param context Pipeline context
   * @returns Persistence result with counts and optional NDJSON
   */
  persist(
    records: NormalizedRecord[] | NormalizationResult,
    context?: PipelineContext
  ): Promise<StepResult<PersistenceResult>>;

  /**
   * Step 6: Enrich records with calculated fields
   * @param records Normalized records
   * @param context Pipeline context
   * @returns Enriched records with BMI, risk scores, etc.
   */
  enrich(
    records: NormalizedRecord[] | NormalizationResult,
    context?: PipelineContext
  ): Promise<StepResult<EnrichedRecord[]>>;

  /**
   * Step 7: Generate analytics summary
   * @param records Enriched records
   * @param context Pipeline context
   * @returns Analytics summary with distributions and insights
   */
  generateAnalytics(
    records: EnrichedRecord[],
    context?: PipelineContext
  ): Promise<StepResult<AnalyticsSummary>>;

  /**
   * Run all pipeline steps sequentially
   * @param rows Raw CSV data
   * @param config Optional pipeline configuration
   * @returns Complete pipeline state after execution
   */
  runAll(
    rows: CSVRow[],
    config?: Partial<PipelineContext>
  ): Promise<PipelineState>;

  /**
   * Reset pipeline state
   */
  reset(): void;

  /**
   * Get audit log (if enabled)
   */
  getAuditLog(): Array<any>;
}

/**
 * Factory function type for creating pipeline engines
 */
export type PipelineEngineFactory = (
  config?: Record<string, any>
) => PipelineEngine;