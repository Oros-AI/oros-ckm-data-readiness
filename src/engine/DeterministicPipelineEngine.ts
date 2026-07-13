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
  StepAgentInsights,
  AgentInsightSummary,
} from './types';

import { PipelineEngine } from './PipelineEngine';
import { AppConfig } from '../config/AppConfig';
import { AgentHooks } from '../agents/AgentHooks';

// Reuse existing pipeline service logic for now
// In Step 6, we'll refactor to use this engine directly
import { pipelineService } from '../services/pipelineService';

export class DeterministicPipelineEngine implements PipelineEngine {
  private state: PipelineState;
  private auditLog: AuditEntry[] = [];
  private agentHooks: AgentHooks;

  constructor(config?: Record<string, any>) {
    this.state = this.createInitialState();
    this.agentHooks = new AgentHooks({
      apiKey: 'mock-key', // Will use mock client
      orgId: 'mock-org',
    });
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
      // Initialize agentInsights map if AI is enabled
      agentInsights: AppConfig.AI_ENABLED ? new Map() : undefined,
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

      // Analyze with agent if there are errors
      if (errors.length > 0 && AppConfig.AI_ENABLED) {
        await this.analyzeWithAgent('ingestion', {
          errors,
          records: rows.slice(0, 5),
          description: 'Errors during CSV ingestion and validation',
        });
      }

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
      
      // Add placeholder issues for demo purposes when AI is enabled
      const issues = AppConfig.AI_ENABLED && translated.length > 0 ? [
        {
          recordId: translated[0].id,
          field: 'date',
          issue: 'Non-standard date format detected',
          severity: 'warning' as const,
        },
      ] : [];

      const result: TranslationResult = {
        records: translated,
        mappedFields: translated.length * 14, // Approximate
        unmappedFields: issues.length,
        issues,
      };

      this.state.translationResult = result;
      this.state.context.datasetVersion = 'v3_translated';
      this.state.completedSteps.push('translation');
      this.logAudit('translation', 'completed', { result });

      // Analyze with agent if there are issues
      if (issues.length > 0 && AppConfig.AI_ENABLED) {
        await this.analyzeWithAgent('translation', {
          issues,
          records: translated.slice(0, 5),
          description: 'Issues during field translation and mapping',
        });
      }

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
      
      // Add placeholder issues for demo purposes when AI is enabled
      const issues = AppConfig.AI_ENABLED && normalized.length > 0 ? [
        {
          recordId: normalized[0].id,
          domain: 'diagnosis' as const,
          sourceValue: 'Diabetes Type II',
          issue: 'unmapped' as const,
          suggestedMapping: 'E11.9 - Type 2 diabetes mellitus without complications',
        },
        {
          recordId: normalized[Math.min(1, normalized.length - 1)].id,
          domain: 'medication' as const,
          sourceValue: 'Metformin 500',
          issue: 'ambiguous' as const,
          suggestedMapping: 'A10BA02 - Metformin',
        },
      ] : [];
      
      const result: NormalizationResult = {
        records: normalized,
        statistics: {
          totalCodes: normalized.length * 8, // Approximate (2 diagnoses + 2 meds + 2 labs + 2 procedures)
          mappedCodes: normalized.length * 8 - issues.length,
          unmappedCodes: issues.length,
          aiMappedCodes: 0,
        },
        issues,
      };

      this.state.normalizationResult = result;
      this.state.context.datasetVersion = 'v3_normalized';
      this.state.completedSteps.push('normalization');
      this.logAudit('normalization', 'completed', { result });

      // Analyze with agent if there are issues
      if (issues.length > 0 && AppConfig.AI_ENABLED) {
        await this.analyzeWithAgent('normalization', {
          issues,
          records: normalized.slice(0, 5),
          description: 'Issues during medical code normalization',
        });
      }

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
    // Clear agent insights if they exist
    if (this.state.agentInsights) {
      this.state.agentInsights.clear();
    }
  }

  /**
   * Apply a mock patch (NON-DESTRUCTIVE)
   * Updates patch status and optionally dataset version, but does NOT modify actual data
   */
  applyMockPatch(stepName: string, patchId: string): boolean {
    if (!AppConfig.AI_ENABLED || !this.state.agentInsights) {
      return false;
    }

    const stepInsights = this.state.agentInsights.get(stepName);
    if (!stepInsights || !stepInsights.patches) {
      return false;
    }

    // Find the patch and update its status
    const patch = stepInsights.patches.find(p => p.patchId === patchId);
    if (!patch) {
      return false;
    }

    // Mark patch as applied
    patch.status = 'applied';

    // Update overall patch status
    const statuses = stepInsights.patches.map(p => p.status);
    if (statuses.every(s => s === 'applied')) {
      stepInsights.patchStatus = 'applied';
    } else if (statuses.some(s => s === 'applied') && statuses.some(s => s === 'rejected')) {
      stepInsights.patchStatus = 'mixed';
    } else if (statuses.some(s => s === 'applied')) {
      stepInsights.patchStatus = 'applied';
    }

    // For normalization, demo updating the dataset version
    if (stepName === 'normalization' && stepInsights.patches.some(p => p.status === 'applied')) {
      this.state.context.datasetVersion = 'v3_normalized_ai';
      this.logAudit('normalization', 'patched', { 
        patchId, 
        mockApplied: true, 
        datasetVersion: 'v3_normalized_ai' 
      });
    }

    return true;
  }

  /**
   * Reject a patch (NON-DESTRUCTIVE)
   * Updates patch status only, no data changes
   */
  rejectPatch(stepName: string, patchId: string): boolean {
    if (!AppConfig.AI_ENABLED || !this.state.agentInsights) {
      return false;
    }

    const stepInsights = this.state.agentInsights.get(stepName);
    if (!stepInsights || !stepInsights.patches) {
      return false;
    }

    // Find the patch and update its status
    const patch = stepInsights.patches.find(p => p.patchId === patchId);
    if (!patch) {
      return false;
    }

    // Mark patch as rejected
    patch.status = 'rejected';

    // Update overall patch status
    const statuses = stepInsights.patches.map(p => p.status);
    if (statuses.every(s => s === 'rejected')) {
      stepInsights.patchStatus = 'rejected';
    } else if (statuses.some(s => s === 'applied') && statuses.some(s => s === 'rejected')) {
      stepInsights.patchStatus = 'mixed';
    } else if (statuses.some(s => s === 'rejected')) {
      stepInsights.patchStatus = 'rejected';
    }

    this.logAudit(stepName, 'patched', { 
      patchId, 
      rejected: true 
    });

    return true;
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

  /**
   * Analyze issues with the AI agent and store insights
   * Only runs when AI is enabled
   */
  private async analyzeWithAgent(
    stepName: string,
    context: {
      errors?: any[];
      issues?: any[];
      records?: any[];
      description?: string;
    }
  ): Promise<void> {
    // Skip if AI is disabled or no agentInsights map
    if (!AppConfig.AI_ENABLED || !this.state.agentInsights) {
      return;
    }

    const startTime = Date.now();

    try {
      // Determine severity based on error/issue count
      const issueCount = (context.errors?.length || 0) + (context.issues?.length || 0);
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (issueCount > 10) severity = 'critical';
      else if (issueCount > 5) severity = 'high';
      else if (issueCount > 0) severity = 'medium';

      // Call agent for analysis
      const agentResponse = await this.agentHooks.analyzeIngestionErrors({
        errors: context.errors || context.issues || [],
        records: context.records?.slice(0, 5), // Sample records
        context: {
          step: stepName,
          runId: this.state.context.runId,
          description: context.description,
        },
      });

      // Transform agent response into StepAgentInsights
      const insights: StepAgentInsights = {
        summary: {
          stepName,
          severity,
          shortSummary: agentResponse.summary || `Found ${issueCount} issues in ${stepName}`,
          issueCount,
          hasPatchesAvailable: agentResponse.patches?.length > 0,
        },
        rootCauseAnalysis: agentResponse.rootCauses || [
          `Detected ${issueCount} issues during ${stepName}`,
          'Analysis available when processing errorful data',
        ],
        suggestedFixes: agentResponse.suggestedFixes?.map(fix => ({
          description: fix,
          impact: 'medium' as const,
          automated: false,
        })) || [],
        patchPreview: agentResponse.patches?.slice(0, 5).map(patch => ({
          recordId: patch.recordId || 'unknown',
          field: patch.field || 'unknown',
          currentValue: patch.currentValue,
          suggestedValue: patch.suggestedValue,
          confidence: patch.confidence || 0.8,
        })),
        // Add full patch suggestions for normalization step
        patches: stepName === 'normalization' && agentResponse.patches?.length > 0 
          ? agentResponse.patches.map((patch: any, index: number) => ({
              patchId: `patch-${stepName}-${index}`,
              recordId: patch.recordId || 'record-1',
              field: patch.field || 'diagnosis',
              originalValue: patch.currentValue || 'Diabetes Type II',
              patchedValue: patch.suggestedValue || 'E11.9',
              reason: patch.reason || 'Map to standard ICD-10 code',
              confidence: patch.confidence || 0.85,
              status: 'proposed' as const,
            }))
          : undefined,
        patchStatus: stepName === 'normalization' && agentResponse.patches?.length > 0 
          ? 'proposed' 
          : 'none',
        timestamp: new Date(),
        analysisTimeMs: Date.now() - startTime,
        rawResponse: agentResponse,
      };

      // Store insights in state
      this.state.agentInsights.set(stepName, insights);
      
      this.logAudit(stepName, 'patched', {
        agentAnalysis: true,
        issueCount,
        severity,
      });
    } catch (error) {
      // Log but don't fail the pipeline on agent errors
      console.warn(`Agent analysis failed for ${stepName}:`, error);
      this.logAudit(stepName, 'failed', {
        agentAnalysis: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}