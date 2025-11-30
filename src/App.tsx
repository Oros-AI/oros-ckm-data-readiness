import { useState, useCallback } from 'react';
import { StepName, StepStatus } from './types/wizard';
import { WizardState, initialWizardState, STEPS } from './state/wizardState';
import { pipelineService } from './services/pipelineService';
import { TopPipelineBar } from './components/TopPipelineBar';
import { StepWorkspace } from './components/StepWorkspace';
import { BottomStatusBar } from './components/BottomStatusBar';
import { IngestionStep } from './steps/IngestionStep';
import { TranslationStep } from './steps/TranslationStep';
import { NormalizationStep } from './steps/NormalizationStep';
import { DataQualityScoringStep } from './steps/DataQualityScoringStep';
import { PersistenceStep } from './steps/PersistenceStep';
import { EnrichmentStep } from './steps/EnrichmentStep';
import { AnalyticsStep } from './steps/AnalyticsStep';
import { OrosLogo } from './assets/oros-logo.png';

function App() {
  const [state, setState] = useState<WizardState>(initialWizardState);

  const setStepStatus = useCallback((step: StepName, status: StepStatus, error?: string) => {
    setState(prev => ({
      ...prev,
      stepStates: {
        ...prev.stepStates,
        [step]: { status, error },
      },
    }));
  }, []);

  const handleStepClick = useCallback((step: StepName) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const runStep = useCallback(async (stepName: StepName) => {
    try {
      setStepStatus(stepName, 'running');

      switch (stepName) {
        case 'ingestion':
          if (state.ingestedRows.length === 0) {
            throw new Error('Please upload a CSV file first');
          }
          setStepStatus(stepName, 'success');
          break;

        case 'translation':
          if (state.ingestedRows.length === 0) {
            throw new Error('No data to translate. Please complete ingestion first.');
          }
          const translated = await pipelineService.translateRecords(state.ingestedRows);
          setState(prev => ({ ...prev, translatedRecords: translated }));
          setStepStatus(stepName, 'success');
          break;

        case 'normalization':
          if (state.translatedRecords.length === 0) {
            throw new Error('No translated data. Please complete translation first.');
          }
          const normalized = await pipelineService.normalizeRecords(state.translatedRecords);
          setState(prev => ({ ...prev, normalizedRecords: normalized }));
          setStepStatus(stepName, 'success');
          break;

        case 'dataQualityScoring':
          if (state.normalizedRecords.length === 0) {
            throw new Error('No normalized data. Please complete normalization first.');
          }
          const scores = await pipelineService.calculateQualityScores(state.normalizedRecords);
          setState(prev => ({ ...prev, qualityScores: scores }));
          setStepStatus(stepName, 'success');
          break;

        case 'persistence':
          if (state.normalizedRecords.length === 0) {
            throw new Error('No data to persist. Please complete normalization first.');
          }
          const { count, failures } = await pipelineService.persistRecords(state.normalizedRecords);
          setState(prev => ({ 
            ...prev, 
            persistedCount: count,
            persistedFailures: failures 
          }));
          setStepStatus(stepName, 'success');
          break;

        case 'enrichment':
          if (state.normalizedRecords.length === 0) {
            throw new Error('No data to enrich. Please complete normalization first.');
          }
          const enriched = await pipelineService.enrichRecords(state.normalizedRecords);
          setState(prev => ({ ...prev, enrichedRecords: enriched }));
          setStepStatus(stepName, 'success');
          break;

        case 'analytics':
          if (state.enrichedRecords.length === 0) {
            throw new Error('No enriched data. Please complete enrichment first.');
          }
          const analytics = await pipelineService.generateAnalytics(state.enrichedRecords);
          setState(prev => ({ ...prev, analyticsSummary: analytics }));
          setStepStatus(stepName, 'success');
          break;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setStepStatus(stepName, 'error', errorMessage);
    }
  }, [state, setStepStatus]);

  const runAllSteps = useCallback(async () => {
    for (const step of STEPS) {
      if (step.id === 'ingestion' && state.ingestedRows.length === 0) {
        alert('Please upload a CSV file before running all steps');
        return;
      }
      await runStep(step.id);
      
      if (state.stepStates[step.id].status === 'error') {
        break;
      }
    }
  }, [state, runStep]);

  const handleIngest = useCallback((rows: any[]) => {
    setState(prev => ({ ...prev, ingestedRows: rows }));
    setStepStatus('ingestion', 'success');
  }, [setStepStatus]);

  const renderStepContent = () => {
    const currentStepState = state.stepStates[state.currentStep];

    return (
      <div className="space-y-6">
        {currentStepState.status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-red-900 font-semibold mb-1">Error</h3>
                <p className="text-red-800">{currentStepState.error}</p>
              </div>
            </div>
          </div>
        )}

        {state.currentStep === 'ingestion' && (
          <IngestionStep ingestedRows={state.ingestedRows} onIngest={handleIngest} />
        )}
        {state.currentStep === 'translation' && (
          <TranslationStep translatedRecords={state.translatedRecords} />
        )}
        {state.currentStep === 'normalization' && (
          <NormalizationStep normalizedRecords={state.normalizedRecords} />
        )}
        {state.currentStep === 'dataQualityScoring' && (
          <DataQualityScoringStep qualityScores={state.qualityScores} />
        )}
        {state.currentStep === 'persistence' && (
          <PersistenceStep 
            persistedCount={state.persistedCount}
            persistedFailures={state.persistedFailures}
            normalizedRecords={state.normalizedRecords}
          />
        )}
        {state.currentStep === 'enrichment' && (
          <EnrichmentStep enrichedRecords={state.enrichedRecords} />
        )}
        {state.currentStep === 'analytics' && (
          <AnalyticsStep analyticsSummary={state.analyticsSummary} />
        )}

        <div className="flex gap-4 pt-4">
          <button
            onClick={() => runStep(state.currentStep)}
            disabled={currentStepState.status === 'running'}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {currentStepState.status === 'running' ? 'Running...' : 'Run Step'}
          </button>
          <button
            onClick={runAllSteps}
            disabled={Object.values(state.stepStates).some(s => s.status === 'running')}
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
      
      {/* Oros Header */}
      <header className="w-full flex justify-center items-center py-4 border-b border-gray-300 mb-4 bg-white">
        <img
          src={OrosLogo}
          alt="Oros Logo"
          className="h-12 w-auto opacity-90"
        />
      </header>

      <TopPipelineBar
        currentStep={state.currentStep}
        stepStates={state.stepStates}
        onStepClick={handleStepClick}
      />

      <StepWorkspace>{renderStepContent()}</StepWorkspace>

      <BottomStatusBar
        currentStep={state.currentStep}
        status={state.stepStates[state.currentStep].status}
      />
    </div>
  );
}

export default App;
