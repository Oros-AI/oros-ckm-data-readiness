/**
 * Application Configuration
 * 
 * This module provides centralized configuration for the Oros Health Data Pipeline Wizard.
 * Configuration values can be set via environment variables or default values.
 */

interface AppConfiguration {
  /**
   * Controls whether AI/agentic features are enabled.
   * When true:
   * - AgentInsightsDrawer can be shown for error analysis
   * - "Ask AI" CTAs appear in eligible steps
   * - Analytics "Ask Anything" tab is enabled
   * When false:
   * - All AI features are hidden
   * - Pipeline runs deterministically only
   */
  AI_ENABLED: boolean;

  /**
   * Backend API URL (for future use)
   * Will be used when we introduce the Node/Express backend in Phase 2
   */
  API_BASE_URL: string;

  /**
   * Environment name for telemetry/logging
   */
  ENVIRONMENT: 'development' | 'staging' | 'production';

  /**
   * Feature flags for gradual rollout (future use)
   */
  features: {
    enableMockArchia: boolean;  // Use mock Archia responses instead of real API
    enableAuditLog: boolean;     // Track all pipeline operations
    enableExport: boolean;       // Allow NDJSON export
  };
}

/**
 * Get configuration from environment or defaults
 * Note: In Vite, env vars must be prefixed with VITE_
 */
function loadConfig(): AppConfiguration {
  // Check for Vite environment variables (VITE_ prefix required)
  // For now, we'll use defaults since we're not setting up full env var handling
  const aiEnabled = import.meta.env?.VITE_AI_ENABLED === 'true' || false;
  const apiBaseUrl = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3001';
  const environment = (import.meta.env?.VITE_ENVIRONMENT || 'development') as AppConfiguration['ENVIRONMENT'];

  return {
    AI_ENABLED: aiEnabled,
    API_BASE_URL: apiBaseUrl,
    ENVIRONMENT: environment,
    features: {
      enableMockArchia: true,  // Always use mocks in Phase 1
      enableAuditLog: false,   // Disabled for Phase 1
      enableExport: true,      // Keep existing export functionality
    },
  };
}

// Export a singleton configuration instance
export const AppConfig = loadConfig();

// Export type for use in other modules
export type { AppConfiguration };