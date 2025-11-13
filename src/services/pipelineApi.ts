import { PipelineRun, PipelineStep, NewRunRequest, PIQIDomainScores } from '../types/pipeline';

const STEP_DEFINITIONS: Omit<PipelineStep, 'status' | 'startTime' | 'endTime' | 'duration'>[] = [
  { id: 1, name: 'Ingestion', description: 'CCD file upload and validation' },
  { id: 2, name: 'Translation', description: 'Convert CCD to FHIR format' },
  { id: 3, name: 'Normalization', description: 'Map to ICD-10, LOINC, RxNorm standards' },
  { id: 4, name: 'Data Quality Scoring', description: 'Calculate PIQI scores per domain' },
  { id: 5, name: 'Persistence', description: 'Store normalized data in database' },
  { id: 6, name: 'Enrichment', description: 'Calculate BMI and risk scores' },
  { id: 7, name: 'Analytics', description: 'Generate insights and analytics' },
];

const mockRuns: Map<string, PipelineRun> = new Map();
let runCounter = 1;

const generateMockPIQIScores = (): PIQIDomainScores => ({
  demographics: Math.floor(Math.random() * 20) + 80,
  vitals: Math.floor(Math.random() * 25) + 70,
  labs: Math.floor(Math.random() * 30) + 65,
  medications: Math.floor(Math.random() * 20) + 75,
  conditions: Math.floor(Math.random() * 15) + 85,
  procedures: Math.floor(Math.random() * 25) + 70,
  allergies: Math.floor(Math.random() * 30) + 60,
  immunizations: Math.floor(Math.random() * 20) + 75,
});

const generateMockEnrichment = () => ({
  bmi: Math.floor(Math.random() * 15) + 20,
  riskScores: {
    cardiovascular: Math.floor(Math.random() * 40) + 10,
    diabetes: Math.floor(Math.random() * 30) + 15,
    falls: Math.floor(Math.random() * 25) + 5,
  },
});

const createInitialSteps = (): PipelineStep[] => {
  return STEP_DEFINITIONS.map(def => ({
    ...def,
    status: 'pending' as const,
  }));
};

export const pipelineApi = {
  getAllRuns: async (): Promise<PipelineRun[]> => {
    await delay(300);
    return Array.from(mockRuns.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  getRun: async (id: string): Promise<PipelineRun | null> => {
    await delay(200);
    return mockRuns.get(id) || null;
  },

  createRun: async (request: NewRunRequest): Promise<PipelineRun> => {
    await delay(500);
    
    const runId = `run-${runCounter++}`;
    const now = new Date().toISOString();
    
    const newRun: PipelineRun = {
      id: runId,
      patientId: request.patientId,
      patientName: request.patientName,
      fileName: request.file.name,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      currentStep: 0,
      steps: createInitialSteps(),
    };
    
    mockRuns.set(runId, newRun);
    
    setTimeout(() => {
      simulatePipelineExecution(runId);
    }, 1000);
    
    return newRun;
  },

  subscribeToRun: (runId: string, callback: (run: PipelineRun) => void): (() => void) => {
    const intervalId = setInterval(() => {
      const run = mockRuns.get(runId);
      if (run) {
        callback(run);
        if (run.status === 'completed' || run.status === 'failed') {
          clearInterval(intervalId);
        }
      }
    }, 500);
    
    return () => clearInterval(intervalId);
  },
};

function simulatePipelineExecution(runId: string) {
  const run = mockRuns.get(runId);
  if (!run) return;

  run.status = 'running';
  run.updatedAt = new Date().toISOString();

  let currentStepIndex = 0;

  const executeNextStep = () => {
    if (currentStepIndex >= run.steps.length) {
      run.status = 'completed';
      run.completedAt = new Date().toISOString();
      run.updatedAt = new Date().toISOString();
      return;
    }

    const step = run.steps[currentStepIndex];
    step.status = 'running';
    step.startTime = new Date().toISOString();
    run.currentStep = currentStepIndex + 1;
    run.updatedAt = new Date().toISOString();

    const duration = Math.random() * 2000 + 1000;

    setTimeout(() => {
      step.status = 'completed';
      step.endTime = new Date().toISOString();
      step.duration = Math.floor(duration);
      run.updatedAt = new Date().toISOString();

      if (step.id === 4) {
        run.piqiScores = generateMockPIQIScores();
        step.details = { piqiScores: run.piqiScores };
      }

      if (step.id === 6) {
        run.enrichedData = generateMockEnrichment();
        step.details = { enrichedData: run.enrichedData };
      }

      currentStepIndex++;
      executeNextStep();
    }, duration);
  };

  executeNextStep();
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const sampleRuns: PipelineRun[] = [
  {
    id: 'run-demo-1',
    patientId: 'PT-001',
    patientName: 'John Doe',
    fileName: 'john_doe_ccd.xml',
    status: 'completed',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    completedAt: new Date(Date.now() - 1800000).toISOString(),
    currentStep: 7,
    steps: STEP_DEFINITIONS.map(def => ({
      ...def,
      status: 'completed' as const,
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date(Date.now() - 3500000).toISOString(),
      duration: 1200,
    })),
    piqiScores: {
      demographics: 95,
      vitals: 88,
      labs: 82,
      medications: 91,
      conditions: 87,
      procedures: 79,
      allergies: 85,
      immunizations: 93,
    },
    enrichedData: {
      bmi: 24.5,
      riskScores: {
        cardiovascular: 18,
        diabetes: 22,
        falls: 8,
      },
    },
  },
  {
    id: 'run-demo-2',
    patientId: 'PT-002',
    patientName: 'Jane Smith',
    fileName: 'jane_smith_ccd.xml',
    status: 'completed',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 5400000).toISOString(),
    completedAt: new Date(Date.now() - 5400000).toISOString(),
    currentStep: 7,
    steps: STEP_DEFINITIONS.map(def => ({
      ...def,
      status: 'completed' as const,
      startTime: new Date(Date.now() - 7200000).toISOString(),
      endTime: new Date(Date.now() - 7100000).toISOString(),
      duration: 1500,
    })),
    piqiScores: {
      demographics: 92,
      vitals: 85,
      labs: 78,
      medications: 89,
      conditions: 94,
      procedures: 81,
      allergies: 76,
      immunizations: 88,
    },
    enrichedData: {
      bmi: 27.3,
      riskScores: {
        cardiovascular: 35,
        diabetes: 28,
        falls: 12,
      },
    },
  },
];

sampleRuns.forEach(run => mockRuns.set(run.id, run));
runCounter = 3;
