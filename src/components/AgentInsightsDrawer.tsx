/**
 * AgentInsightsDrawer Component
 * 
 * Right-side drawer for displaying AI agent insights and suggestions.
 * This is a shell component for Phase 1 - it displays placeholder content
 * and will be enhanced in Phase 2 to show real agent responses.
 */

import React from 'react';

interface AgentInsightsDrawerProps {
  /** Whether the drawer is open */
  isOpen: boolean;
  
  /** Optional callback when drawer should close */
  onClose?: () => void;
  
  /** Title to display in the drawer header */
  title?: string;
  
  /** Current pipeline step (for context) */
  currentStep?: string;
  
  /** Children to render in the drawer body */
  children?: React.ReactNode;
}

/**
 * Right-side drawer for agent insights
 * Slides in from the right when AI features are enabled
 */
export const AgentInsightsDrawer: React.FC<AgentInsightsDrawerProps> = ({
  isOpen,
  onClose,
  title = 'AI Analysis',
  currentStep,
  children,
}) => {
  // Don't render anything if closed
  if (!isOpen) return null;

  return (
    /* Fixed right panel without backdrop - main wizard remains fully interactive */
    <aside className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl z-30 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{title}</h2>
              {currentStep && (
                <p className="text-blue-100 text-sm mt-1">
                  Step: {currentStep}
                </p>
              )}
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-white hover:text-blue-100 transition-colors"
                aria-label="Close drawer"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {children ? (
            children
          ) : (
            // Default placeholder content
            <div className="space-y-6">
              {/* Status indicator */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-blue-500 mt-0.5 mr-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-blue-900">
                      AI Agent Ready
                    </h3>
                    <p className="text-sm text-blue-700 mt-1">
                      AI-powered analysis is available for this pipeline.
                      When errors occur, suggestions will appear here.
                    </p>
                  </div>
                </div>
              </div>

              {/* Placeholder sections */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Root Cause Analysis
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-600 italic">
                    No errors detected. Root cause analysis will appear here when issues are encountered.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Suggested Fixes
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-600 italic">
                    AI-suggested fixes will be displayed here when available.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Patch Preview
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-600 italic">
                    Proposed data patches will be shown here for review.
                  </p>
                </div>
              </div>

              {/* Action buttons (disabled for now) */}
              <div className="border-t pt-4">
                <div className="flex gap-3">
                  <button
                    disabled
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-500 font-medium rounded-lg cursor-not-allowed"
                  >
                    Apply Patches
                  </button>
                  <button
                    disabled
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-500 font-medium rounded-lg cursor-not-allowed"
                  >
                    Reject Suggestions
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Actions will be enabled when AI suggestions are available
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-3 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Powered by Archia AI</span>
            <span className="flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
              Connected
            </span>
          </div>
        </div>
    </aside>
  );
};

/**
 * Placeholder content for demonstrating specific agent responses
 * This will be replaced with real agent data in Phase 2
 */
export const AgentPlaceholderContent: React.FC<{ 
  type?: 'ingestion' | 'normalization' | 'analytics' 
}> = ({ type = 'ingestion' }) => {
  const contents = {
    ingestion: {
      title: 'Ingestion Analysis',
      rootCause: 'Several rows contain invalid age values and non-standard sex codes.',
      suggestions: [
        'Clamp age values to 0-110 range',
        'Map non-standard sex codes to "Other"',
        'Add schema validation before ingestion',
      ],
    },
    normalization: {
      title: 'Normalization Analysis',
      rootCause: 'Multiple medical codes could not be mapped to standard terminologies.',
      suggestions: [
        'Map "Hyperglycemia NOS" to ICD-10 R73.9',
        'Use fuzzy matching for medication names',
        'Flag ambiguous lab codes for review',
      ],
    },
    analytics: {
      title: 'Analytics Insights',
      rootCause: 'Query results based on enriched dataset analysis.',
      suggestions: [
        'Consider filtering by age cohorts',
        'Add time-series analysis for trends',
        'Include confidence intervals in metrics',
      ],
    },
  };

  const content = contents[type];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Root Cause</h3>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">{content.rootCause}</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Suggestions</h3>
        <ul className="space-y-2">
          {content.suggestions.map((suggestion, index) => (
            <li key={index} className="flex items-start">
              <svg
                className="w-5 h-5 text-green-500 mr-2 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm text-gray-700">{suggestion}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> This is placeholder content. Real AI analysis will be available when processing errorful data with AI enabled.
        </p>
      </div>
    </div>
  );
};