import { useState, useCallback, useMemo } from "react";
import { StepName, StepStatus } from "./types/wizard";
import { WizardState, initialWizardState, STEPS } from "./state/wizardState";
import { DeterministicPipelineEngine } from "./engine/DeterministicPipelineEngine";
import { AppConfig } from "./config/AppConfig";
import { TopPipelineBar } from "./components/TopPipelineBar";
import { StepWorkspace } from "./components/StepWorkspace";
import { BottomStatusBar } from "./components/BottomStatusBar";
import { IngestionStep } from "./steps/IngestionStep";
import { TranslationStep } from "./steps/TranslationStep";
import { NormalizationStep } from "./steps/NormalizationStep";
import { DataQualityScoringStep } from "./steps/DataQualityScoringStep";
import { PersistenceStep } from "./steps/PersistenceStep";
import { EnrichmentStep } from "./steps/EnrichmentStep";
import { AnalyticsStep } from "./steps/AnalyticsStep";
import { AgentInsightsDrawer } from "./components/AgentInsightsDrawer";
import OrosLogo from "./assets/logo/oros-logo.png";

function App() {
  const [state, setState] = useState<WizardState>(initialWizardState);
  // Initialize drawer visibility directly from AI_ENABLED config
  // This ensures it stays open unless explicitly closed by the user
  const [showAgentDrawer, setShowAgentDrawer] = useState<boolean>(AppConfig.AI_ENABLED);
  
  // Store agent insights from the engine (when AI is enabled)
  const [agentInsightsByStep, setAgentInsightsByStep] = useState<Record<string, any>>({});

  // Create a single pipeline engine instance
  // Using useMemo to ensure it's only created once
  const pipelineEngine = useMemo(() => new DeterministicPipelineEngine(), []);

  // Log config status (can be removed after verification)
  console.log('AI Features Enabled:', AppConfig.AI_ENABLED);

  // Helper to sync agent insights from engine to UI
  const syncAgentInsights = useCallback(() => {
    if (AppConfig.AI_ENABLED) {
      const engineState = pipelineEngine.getState();
      if (engineState.agentInsights) {
        // Convert Map to plain object for React state
        const insights: Record<string, any> = {};
        engineState.agentInsights.forEach((value, key) => {
          insights[key] = value;
        });
        setAgentInsightsByStep(insights);
      }
    }
  }, [pipelineEngine]);

  // Handle applying a patch (non-destructive, updates engine state only)
  const handleApplyPatch = useCallback((stepName: string, patchId: string) => {
    if (!AppConfig.AI_ENABLED) return;
    
    console.log('Applying mock patch:', { stepName, patchId });
    
    // Call engine method to apply the patch (non-destructive)
    const success = pipelineEngine.applyMockPatch(stepName, patchId);
    
    if (success) {
      // Refresh insights to reflect the updated patch status
      syncAgentInsights();
      console.log('Patch applied (mock). Dataset version may have changed to v3_normalized_ai');
    }
  }, [pipelineEngine, syncAgentInsights]);

  // Handle rejecting a patch
  const handleRejectPatch = useCallback((stepName: string, patchId: string) => {
    if (!AppConfig.AI_ENABLED) return;
    
    console.log('Rejecting patch:', { stepName, patchId });
    
    // Call engine method to reject the patch
    const success = pipelineEngine.rejectPatch(stepName, patchId);
    
    if (success) {
      // Refresh insights to reflect the updated patch status
      syncAgentInsights();
      console.log('Patch rejected');
    }
  }, [pipelineEngine, syncAgentInsights]);

  const setStepStatus = useCallback(
    (step: StepName, status: StepStatus, error?: string) => {
      setState((prev) => ({
        ...prev,
        stepStates: {
          ...prev.stepStates,
          [step]: { status, error },
        },
      }));
    },
    []
  );

  const handleStepClick = useCallback((step: StepName) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  }, []);

  const runStep = useCallback(
    async (stepName: StepName) => {
      try {
        setStepStatus(stepName, "running");

        switch (stepName) {
          case "ingestion":
            if (state.ingestedRows.length === 0) {
              throw new Error("Please upload a CSV file first");
            }
            setStepStatus(stepName, "success");
            break;

          case "translation":
            if (state.ingestedRows.length === 0) {
              throw new Error(
                "No data to translate. Please complete ingestion first."
              );
            }
            // Use pipeline engine instead of direct service call
            const translationResult = await pipelineEngine.translate(
              state.ingestedRows
            );
            if (translationResult.success && translationResult.data) {
              setState((prev) => ({ 
                ...prev, 
                translatedRecords: translationResult.data.records 
              }));
              setStepStatus(stepName, "success");
              // Sync agent insights after step completes
              syncAgentInsights();
            } else {
              throw new Error("Translation failed");
            }
            break;

          case "normalization":
            if (state.translatedRecords.length === 0) {
              throw new Error(
                "No translated data. Please complete translation first."
              );
            }
            // Use pipeline engine
            const normalizationResult = await pipelineEngine.normalize(
              state.translatedRecords
            );
            if (normalizationResult.success && normalizationResult.data) {
              setState((prev) => ({ 
                ...prev, 
                normalizedRecords: normalizationResult.data.records 
              }));
              setStepStatus(stepName, "success");
              // Sync agent insights after step completes
              syncAgentInsights();
            } else {
              throw new Error("Normalization failed");
            }
            break;

          case "dataQualityScoring":
            if (state.normalizedRecords.length === 0) {
              throw new Error(
                "No normalized data. Please complete normalization first."
              );
            }
            // Use pipeline engine
            const scoringResult = await pipelineEngine.calculateQualityScores(
              state.normalizedRecords
            );
            if (scoringResult.success && scoringResult.data) {
              setState((prev) => ({ 
                ...prev, 
                qualityScores: scoringResult.data 
              }));
              setStepStatus(stepName, "success");
            } else {
              throw new Error("Quality scoring failed");
            }
            break;

          case "persistence":
            if (state.normalizedRecords.length === 0) {
              throw new Error(
                "No data to persist. Please complete normalization first."
              );
            }
            // Use pipeline engine
            const persistResult = await pipelineEngine.persist(
              state.normalizedRecords
            );
            if (persistResult.success && persistResult.data) {
              setState((prev) => ({
                ...prev,
                persistedCount: persistResult.data.persistedCount,
                persistedFailures: persistResult.data.failedCount,
              }));
              setStepStatus(stepName, "success");
            } else {
              throw new Error("Persistence failed");
            }
            break;

          case "enrichment":
            if (state.normalizedRecords.length === 0) {
              throw new Error(
                "No data to enrich. Please complete normalization first."
              );
            }
            // Use pipeline engine
            const enrichmentResult = await pipelineEngine.enrich(
              state.normalizedRecords
            );
            if (enrichmentResult.success && enrichmentResult.data) {
              setState((prev) => ({ 
                ...prev, 
                enrichedRecords: enrichmentResult.data 
              }));
              setStepStatus(stepName, "success");
            } else {
              throw new Error("Enrichment failed");
            }
            break;

          case "analytics":
            if (state.enrichedRecords.length === 0) {
              throw new Error(
                "No enriched data. Please complete enrichment first."
              );
            }
            // Use pipeline engine
            const analyticsResult = await pipelineEngine.generateAnalytics(
              state.enrichedRecords
            );
            if (analyticsResult.success && analyticsResult.data) {
              setState((prev) => ({ 
                ...prev, 
                analyticsSummary: analyticsResult.data 
              }));
              setStepStatus(stepName, "success");
            } else {
              throw new Error("Analytics generation failed");
            }
            break;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        setStepStatus(stepName, "error", errorMessage);
      }
    },
    [state, setStepStatus, pipelineEngine, syncAgentInsights]
  );

  const runAllSteps = useCallback(async () => {
    for (const step of STEPS) {
      if (step.id === "ingestion" && state.ingestedRows.length === 0) {
        alert("Please upload a CSV file before running all steps");
        return;
      }
      await runStep(step.id);

      if (state.stepStates[step.id].status === "error") {
        break;
      }
    }
  }, [state, runStep]);

  const handleIngest = useCallback(
    (rows: any[]) => {
      setState((prev) => ({ ...prev, ingestedRows: rows }));
      setStepStatus("ingestion", "success");
    },
    [setStepStatus]
  );

  const renderStepContent = () => {
    const currentStepState = state.stepStates[state.currentStep];

    return (
      <div className="space-y-6">
        {currentStepState.status === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg
                className="w-6 h-6 text-red-500 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="text-red-900 font-semibold mb-1">Error</h3>
                <p className="text-red-800">{currentStepState.error}</p>
              </div>
            </div>
          </div>
        )}

        {state.currentStep === "ingestion" && (
          <IngestionStep
            ingestedRows={state.ingestedRows}
            onIngest={handleIngest}
          />
        )}
        {state.currentStep === "translation" && (
          <TranslationStep translatedRecords={state.translatedRecords} />
        )}
        {state.currentStep === "normalization" && (
          <NormalizationStep normalizedRecords={state.normalizedRecords} />
        )}
        {state.currentStep === "dataQualityScoring" && (
          <DataQualityScoringStep qualityScores={state.qualityScores} />
        )}
        {state.currentStep === "persistence" && (
          <PersistenceStep
            persistedCount={state.persistedCount}
            persistedFailures={state.persistedFailures}
            normalizedRecords={state.normalizedRecords}
          />
        )}
        {state.currentStep === "enrichment" && (
          <EnrichmentStep enrichedRecords={state.enrichedRecords} />
        )}
        {state.currentStep === "analytics" && (
          <AnalyticsStep analyticsSummary={state.analyticsSummary} />
        )}

        <div className="flex gap-4 pt-4">
          <button
            onClick={() => runStep(state.currentStep)}
            disabled={currentStepState.status === "running"}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {currentStepState.status === "running" ? "Running..." : "Run Step"}
          </button>
          <button
            onClick={runAllSteps}
            disabled={Object.values(state.stepStates).some(
              (s) => s.status === "running"
            )}
            className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Run All Steps
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top progress bar (steps 1–7) */}
      <TopPipelineBar
        currentStep={state.currentStep}
        stepStates={state.stepStates}
        onStepClick={handleStepClick}
      />

      {/* Main workspace for the current step */}
      <StepWorkspace>{renderStepContent()}</StepWorkspace>

      {/* Bottom status bar */}
      <BottomStatusBar
        currentStep={state.currentStep}
        status={state.stepStates[state.currentStep].status}
      />
      
      {/* Agent Insights Drawer - shown when AI is enabled */}
      <AgentInsightsDrawer
        isOpen={showAgentDrawer}
        onClose={() => setShowAgentDrawer(false)}
        title="AI Pipeline Assistant"
        currentStep={state.currentStep}
        insightsByStep={agentInsightsByStep}
        onApplyPatch={handleApplyPatch}
        onRejectPatch={handleRejectPatch}
      />
    </div>
  );
}

export default App;
