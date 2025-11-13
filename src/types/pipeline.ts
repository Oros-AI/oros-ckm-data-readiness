export type StepStatus = 'pending' | 'running' | 'completed' | 'failed';
export type RunStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface PIQIDomainScores {
  demographics: number;
  vitals: number;
  labs: number;
  medications: number;
  conditions: number;
  procedures: number;
  allergies: number;
  immunizations: number;
}

export interface PipelineStep {
  id: number;
  name: string;
  description: string;
  status: StepStatus;
  startTime?: string;
  endTime?: string;
  duration?: number;
  details?: Record<string, any>;
}

export interface PipelineRun {
  id: string;
  patientId: string;
  patientName: string;
  fileName: string;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  currentStep: number;
  steps: PipelineStep[];
  piqiScores?: PIQIDomainScores;
  enrichedData?: {
    bmi?: number;
    riskScores?: {
      cardiovascular?: number;
      diabetes?: number;
      falls?: number;
    };
  };
}

export interface NewRunRequest {
  patientId: string;
  patientName: string;
  file: File;
}
