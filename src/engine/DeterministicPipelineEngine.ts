/**
 * DeterministicPipelineEngine
 * 
 * Implementation of PipelineEngine that performs purely deterministic processing.
 * This extracts and organizes the logic currently in pipelineService.ts,
 * but pipelineService remains the active implementation until Step 6.
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
  AuditEntry,
} from './types';

import { PipelineEngine } from './PipelineEngine';
import { AppConfig } from '../config/AppConfig';

// Reuse existing pipeline service logic for now
// In Step 6, we'll refactor to use this engine directly
import { pipelineService } from '../services/pipelineService';

export class DeterministicPipelineEngine implements PipelineEngine {
  private state: PipelineState;
  private auditLog: AuditEntry[] = [];

  constructor(config?: Record<string, any>) {
    this.state = this.createInitialState();
  }

  private createInitialState(): PipelineState {
    // Create default context inline to avoid circular dependency
    const defaultContext: PipelineContext = {
      runId: `run-${Date.now()}`,
      startTime: new Date(),
      datasetVersion: 'v3_raw',
      aiEnabled: AppConfig.AI_ENABLED,
      metadata: {},
    };

    return {
      context: defaultContext,
      completedSteps: [],
      failedSteps: [],
      auditLog: [],
    };
  }

  initialize(config?: Partial<PipelineContext>): PipelineContext {
    // Use existing context as base if available, otherwise create default
    const baseContext = this.state?.context || {
      runId: `run-${Date.now()}`,
      startTime: new Date(),
      datasetVersion: 'v3_raw',
      aiEnabled: AppConfig.AI_ENABLED,
      metadata: {},
    };

    // Merge config overrides with base context
    const context: PipelineContext = {
      ...baseContext,
      runId: config?.runId || baseContext.runId,
      startTime: config?.startTime || baseContext.startTime,
      datasetVersion: config?.datasetVersion || baseContext.datasetVersion,
      aiEnabled: config?.aiEnabled ?? baseContext.aiEnabled,
      metadata: { ...baseContext.metadata, ...(config?.metadata || {}) },
    };

    // Update state if it exists
    if (this.state) {
      this.state.context = context;
    }
    
    this.logAudit('pipeline', 'started', { context });
    
    return context;
  }

  getState(): PipelineState {
    return { ...this.state };
  }

  async ingest(
    rows: CSVRow[],
    context?: PipelineContext
  ): Promise<StepResult<IngestionResult>> {
    const startTime = Date.now();
    this.logAudit('ingestion', 'started', { rowCount: rows.length });

    try {
      // For now, simple validation - in future, implement full ingestion logic
      const errors = [];
      const validRows = rows.filter((row, index) => {
        // Basic validation from step01-ingestion.md spec
        if (!row.ID || !row.Name) {
          errors.push({
            rowIndex: index + 1,
            type: 'missing' as const,
            message: 'Missing required field: ID or Name',
          });
          return false;
        }
        return true;
      });

      const result: IngestionResult = {
        records: validRows,
        totalRows: rows.length,
        successfulRows: validRows.length,
        failedRows: rows.length - validRows.length,
        errors,
      };

      this.state.ingestionResult = result;
      this.state.completedSteps.push('ingestion');
      this.logAudit('ingestion', 'completed', { result });

      return {
        success: true,
        data: result,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.state.failedSteps.push('ingestion');
      this.logAudit('ingestion', 'failed', { error });
      
      return {
        success: false,
        errors: [{
          code: 'INGESTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          severity: 'error',
        }],
        duration: Date.now() - startTime,
      };
    }
  }

  async translate(
    input: CSVRow[] | IngestionResult,
    context?: PipelineContext
  ): Promise<StepResult<TranslationResult>> {
    const startTime = Date.now();
    const rows = Array.isArray(input) ? input : input.records;
    
    this.logAudit('translation', 'started', { recordCount: rows.length });

    try {
      // Delegate to existing service for now
      const translated = await pipelineService.translateRecords(rows);
      
      const result: TranslationResult = {
        records: translated,
        mappedFields: translated.length * 14, // Approximate
        unmappedFields: 0,
        issues: [],
      };

      this.state.translationResult = result;
      this.state.context.datasetVersion = 'v3_translated';
      this.state.completedSteps.push('translation');
      this.logAudit('translation', 'completed', { result });

      return {
        success: true,
        data: result,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.state.failedSteps.push('translation');
      this.logAudit('translation', 'failed', { error });
      
      return {
        success: false,
        errors: [{
          code: 'TRANSLATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          severity: 'error',
        }],
        duration: Date.now() - startTime,
      };
    }
  }

  async normalize(
    input: TranslatedRecord[] | TranslationResult,
    context?: PipelineContext
  ): Promise<StepResult<NormalizationResult>> {
    const startTime = Date.now();
    const records = Array.isArray(input) ? input : input.records;
    
    this.logAudit('normalization', 'started', { recordCount: records.length });

    try {
      // Delegate to existing service
      const normalized = await pipelineService.normalizeRecords(records);
      
      const result: NormalizationResult = {
        records: normalized,
        statistics: {
          totalCodes: normalized.length * 8, // Approximate (2 diagnoses + 2 meds + 2 labs + 2 procedures)
          mappedCodes: normalized.length * 8, // Assume all mapped for now
          unmappedCodes: 0,
          aiMappedCodes: 0,
        },
        issues: [],
      };

      this.state.normalizationResult = result;
      this.state.context.datasetVersion = 'v3_normalized';
      this.state.completedSteps.push('normalization');
      this.logAudit('normalization', 'completed', { result });

      return {
        success: true,
        data: result,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.state.failedSteps.push('normalization');
      this.logAudit('normalization', 'failed', { error });
      
      return {
        success: false,
        errors: [{
          code: 'NORMALIZATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          severity: 'error',
        }],
        duration: Date.now() - startTime,
      };
    }
  }

  async calculateQualityScores(
    input: NormalizedRecord[] | NormalizationResult,
    context?: PipelineContext
  ): Promise<StepResult<QualityScore[]>> {
    const startTime = Date.now();
    const records = Array.isArray(input) ? input : input.records;
    
    this.logAudit('scoring', 'started', { recordCount: records.length });

    try {
      const scores = await pipelineService.calculateQualityScores(records);
      
      this.state.qualityScores = scores;
      this.state.completedSteps.push('scoring');
      this.logAudit('scoring', 'completed', { scores });

      return {
        success: true,
        data: scores,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.state.failedSteps.push('scoring');
      this.logAudit('scoring', 'failed', { error });
      
      return {
        success: false,
        errors: [{
          code: 'SCORING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          severity: 'error',
        }],
        duration: Date.now() - startTime,
      };
    }
  }

  async persist(
    input: NormalizedRecord[] | NormalizationResult,
    context?: PipelineContext
  ): Promise<StepResult<PersistenceResult>> {
    const startTime = Date.now();
    const records = Array.isArray(input) ? input : input.records;
    
    this.logAudit('persistence', 'started', { recordCount: records.length });

    try {
      const { count, failures } = await pipelineService.persistRecords(records);
      
      // Generate NDJSON
      const ndjson = records.map(r => JSON.stringify(r)).join('\n');
      
      const result: PersistenceResult = {
        persistedCount: count,
        failedCount: failures,
        ndjson,
        datasetVersion: this.state.context.datasetVersion,
        storageLocation: 'memory', // Mock for now
      };

      this.state.persistenceResult = result;
      this.state.completedSteps.push('persistence');
      this.logAudit('persistence', 'completed', { result });

      return {
        success: true,
        data: result,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.state.failedSteps.push('persistence');
      this.logAudit('persistence', 'failed', { error });
      
      return {
        success: false,
        errors: [{
          code: 'PERSISTENCE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          severity: 'error',
        }],
        duration: Date.now() - startTime,
      };
    }
  }

  async enrich(
    input: NormalizedRecord[] | NormalizationResult,
    context?: PipelineContext
  ): Promise<StepResult<EnrichedRecord[]>> {
    const startTime = Date.now();
    const records = Array.isArray(input) ? input : input.records;
    
    this.logAudit('enrichment', 'started', { recordCount: records.length });

    try {
      const enriched = await pipelineService.enrichRecords(records);
      
      this.state.enrichedRecords = enriched;
      this.state.context.datasetVersion = 'v3_enriched';
      this.state.completedSteps.push('enrichment');
      this.logAudit('enrichment', 'completed', { count: enriched.length });

      return {
        success: true,
        data: enriched,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.state.failedSteps.push('enrichment');
      this.logAudit('enrichment', 'failed', { error });
      
      return {
        success: false,
        errors: [{
          code: 'ENRICHMENT_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          severity: 'error',
        }],
        duration: Date.now() - startTime,
      };
    }
  }

  async generateAnalytics(
    records: EnrichedRecord[],
    context?: PipelineContext
  ): Promise<StepResult<AnalyticsSummary>> {
    const startTime = Date.now();
    
    this.logAudit('analytics', 'started', { recordCount: records.length });

    try {
      const summary = await pipelineService.generateAnalytics(records);
      
      this.state.analyticsSummary = summary;
      this.state.completedSteps.push('analytics');
      this.logAudit('analytics', 'completed', { summary });

      return {
        success: true,
        data: summary,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.state.failedSteps.push('analytics');
      this.logAudit('analytics', 'failed', { error });
      
      return {
        success: false,
        errors: [{
          code: 'ANALYTICS_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          severity: 'error',
        }],
        duration: Date.now() - startTime,
      };
    }
  }

  async runAll(
    rows: CSVRow[],
    config?: Partial<PipelineContext>
  ): Promise<PipelineState> {
    // Initialize
    this.initialize(config);

    // Run pipeline steps sequentially
    const ingestionResult = await this.ingest(rows);
    if (!ingestionResult.success) return this.state;

    const translationResult = await this.translate(ingestionResult.data!);
    if (!translationResult.success) return this.state;

    const normalizationResult = await this.normalize(translationResult.data!);
    if (!normalizationResult.success) return this.state;

    const scoringResult = await this.calculateQualityScores(normalizationResult.data!);
    if (!scoringResult.success) return this.state;

    const persistenceResult = await this.persist(normalizationResult.data!);
    if (!persistenceResult.success) return this.state;

    const enrichmentResult = await this.enrich(normalizationResult.data!);
    if (!enrichmentResult.success) return this.state;

    const analyticsResult = await this.generateAnalytics(enrichmentResult.data!);
    if (!analyticsResult.success) return this.state;

    return this.state;
  }

  reset(): void {
    this.state = this.createInitialState();
    this.auditLog = [];
  }

  getAuditLog(): AuditEntry[] {
    return [...this.auditLog];
  }

  private logAudit(
    step: string,
    action: 'started' | 'completed' | 'failed' | 'patched',
    details?: Record<string, any>
  ): void {
    if (!AppConfig.features.enableAuditLog) return;

    const entry: AuditEntry = {
      timestamp: new Date(),
      step,
      action,
      details,
      datasetVersionBefore: this.state.context.datasetVersion,
    };

    this.auditLog.push(entry);
    if (this.state.auditLog) {
      this.state.auditLog.push(entry);
    }
  }
}