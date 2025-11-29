export type StepStatus = 'pending' | 'running' | 'success' | 'error';

export type StepName = 
  | 'ingestion'
  | 'translation'
  | 'normalization'
  | 'dataQualityScoring'
  | 'persistence'
  | 'enrichment'
  | 'analytics';

export interface Step {
  id: StepName;
  label: string;
  order: number;
}

export interface StepState {
  status: StepStatus;
  error?: string;
}

export interface CSVRow {
  [key: string]: string;
}

export interface PatientRecord {
  ID: string;
  Name: string;
  Age: string;
  Sex: string;
  Height: string;
  Weight: string;
  Diagnosis1: string;
  Diagnosis2: string;
  Medication1: string;
  Medication2: string;
  Lab1: string;
  Lab2: string;
  Procedure1: string;
  Procedure2: string;
}

export interface TranslatedRecord {
  id: string;
  name: string;
  demographics: {
    age: string;
    sex: string;
    height: string;
    weight: string;
  };
  diagnoses: string[];
  medications: string[];
  labs: string[];
  procedures: string[];
}

export interface NormalizedRecord {
  id: string;
  name: string;
  demographics: {
    age: number;
    sex: 'M' | 'F' | 'Other';
    height: number;
    weight: number;
  };
  diagnoses: Array<{ code: string; system: 'ICD-10' }>;
  medications: Array<{ code: string; system: 'RxNorm' }>;
  labs: Array<{ code: string; system: 'LOINC' }>;
  procedures: Array<{ code: string; system: 'SNOMED-CT' }>;
}

export interface QualityScore {
  domain: string;
  score: number; // Integer score 0-100
  recordsBelowThreshold: number;
  label?: string; // Quality label: "Excellent", "Good", "Fair", or "Poor"
  present?: number; // Number of non-missing values
  total?: number; // Total possible values
}

export interface EnrichedRecord extends NormalizedRecord {
  bmi: number;
  diabetesRisk: number;
}

export interface AnalyticsSummary {
  sexDistribution: { [key: string]: number };
  ageHistogram: Array<{ range: string; count: number }>;
  diagnosisDistribution: Array<{ diagnosis: string; count: number }>;
  diabetesRiskDistribution: Array<{ range: string; count: number }>;
}
