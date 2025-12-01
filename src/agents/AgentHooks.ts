/**
 * AgentHooks
 * 
 * Thin wrapper for agent interactions.
 * Routes pipeline step errors to appropriate agent analyzers.
 * This will be the main integration point between the pipeline and agents.
 */

import { AppConfig } from '../config/AppConfig';
import { ArchiaMockClient } from './ArchiaMockClient';
import {
  AgentContext,
  AgentResponse,
  AgentRunSummary,
  ArchiaQueryRequest,
  ArchiaQueryResponse,
} from './types';

/**
 * Central agent hook system
 */
export class AgentHooks {
  private client: ArchiaMockClient;
  private runSummaries: AgentRunSummary[] = [];

  constructor() {
    // Always use mock client in Phase 1
    // In Phase 2, this will check AppConfig.features.enableMockArchia
    this.client = new ArchiaMockClient();
  }

  /**
   * Main entry point for agent analysis
   * Routes to appropriate analyzer based on step name
   * 
   * @param stepName - The pipeline step requesting analysis
   * @param context - Context about the step and errors
   * @returns Agent response with suggestions and patches
   */
  async analyzeStep(
    stepName: AgentContext['step'],
    context: AgentContext
  ): Promise<AgentResponse | null> {
    // Check if AI is enabled
    if (!AppConfig.AI_ENABLED) {
      console.log('AI features disabled, skipping agent analysis');
      return null;
    }

    // Start tracking this run
    const runId = `agent-run-${Date.now()}`;
    const startTime = new Date();
    
    const summary: AgentRunSummary = {
      runId,
      step: stepName,
      startTime,
      success: false,
      issuesAnalyzed: context.errorRecords || 0,
      suggestionsMade: 0,
      patchesProposed: 0,
    };

    try {
      let response: AgentResponse;

      // Route to appropriate analyzer
      switch (stepName) {
        case 'ingestion':
          response = await this.client.analyzeIngestionErrors(context);
          break;
        
        case 'translation':
          response = await this.client.analyzeTranslationErrors(context);
          break;
        
        case 'normalization':
          response = await this.client.analyzeNormalizationIssues(context);
          break;
        
        case 'scoring':
          response = await this.client.analyzeScoringIssues(context);
          break;
        
        case 'enrichment':
          response = await this.client.analyzeEnrichmentIssues(context);
          break;
        
        case 'analytics':
          // Analytics uses a different flow (query-based)
          // This would typically not be called through analyzeStep
          console.warn('Analytics step uses queryAnalytics instead of analyzeStep');
          return null;
        
        default:
          console.warn(`No agent analyzer available for step: ${stepName}`);
          return null;
      }

      // Update summary with results
      summary.endTime = new Date();
      summary.success = true;
      summary.suggestionsMade = response.suggestions.length;
      summary.patchesProposed = response.patches?.length || 0;
      summary.response = response;

      this.runSummaries.push(summary);
      
      console.log(`Agent analysis complete for ${stepName}:`, {
        suggestions: response.suggestions.length,
        patches: response.patches?.length || 0,
        confidence: response.confidence,
      });

      return response;

    } catch (error) {
      // Log error and update summary
      console.error(`Agent analysis failed for ${stepName}:`, error);
      
      summary.endTime = new Date();
      summary.success = false;
      summary.error = error instanceof Error ? error.message : 'Unknown error';
      
      this.runSummaries.push(summary);
      
      return null;
    }
  }

  /**
   * Query analytics with natural language
   * Used for the "Ask Anything" feature in Analytics step
   * 
   * @param question - Natural language question
   * @param datasetVersion - Current dataset version
   * @param filters - Optional filters
   * @returns Query response with answer and visualizations
   */
  async queryAnalytics(
    question: string,
    datasetVersion: string,
    filters?: Record<string, any>
  ): Promise<ArchiaQueryResponse | null> {
    // Check if AI is enabled
    if (!AppConfig.AI_ENABLED) {
      console.log('AI features disabled, analytics query not available');
      return null;
    }

    try {
      const request: ArchiaQueryRequest = {
        question,
        dataset_version: datasetVersion,
        filters,
        context: {
          run_id: `query-${Date.now()}`,
        },
      };

      const response = await this.client.queryAnalytics(request);
      
      console.log('Analytics query complete:', {
        question: question.substring(0, 50) + '...',
        answerLength: response.answer.length,
        hasVisualizations: !!response.suggested_visualizations?.length,
      });

      return response;

    } catch (error) {
      console.error('Analytics query failed:', error);
      return null;
    }
  }

  /**
   * Get all run summaries for audit/debugging
   * 
   * @returns Array of agent run summaries
   */
  getRunSummaries(): AgentRunSummary[] {
    return [...this.runSummaries];
  }

  /**
   * Get run summaries for a specific step
   * 
   * @param step - Pipeline step name
   * @returns Filtered array of summaries
   */
  getStepSummaries(step: string): AgentRunSummary[] {
    return this.runSummaries.filter(s => s.step === step);
  }

  /**
   * Clear all run summaries
   * Useful for resetting between pipeline runs
   */
  clearSummaries(): void {
    this.runSummaries = [];
  }

  /**
   * Check if agent analysis is available
   * 
   * @returns True if AI is enabled and agent is ready
   */
  isAvailable(): boolean {
    return AppConfig.AI_ENABLED;
  }

  /**
   * Get agent configuration status
   * 
   * @returns Configuration information
   */
  getStatus(): {
    enabled: boolean;
    mode: 'mock' | 'live';
    runsCompleted: number;
    lastRun?: Date;
  } {
    const lastRun = this.runSummaries
      .filter(s => s.success)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0];

    return {
      enabled: AppConfig.AI_ENABLED,
      mode: 'mock', // Always mock in Phase 1
      runsCompleted: this.runSummaries.filter(s => s.success).length,
      lastRun: lastRun?.startTime,
    };
  }
}

// Export singleton instance
// Note: This is not imported anywhere in Phase 1
// It will be integrated into the pipeline in Phase 2
export const agentHooks = new AgentHooks();