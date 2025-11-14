import {
  CSVRow,
  TranslatedRecord,
  NormalizedRecord,
  QualityScore,
  EnrichedRecord,
  AnalyticsSummary,
} from '../types/wizard';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const pipelineService = {
  async translateRecords(rows: CSVRow[]): Promise<TranslatedRecord[]> {
    await delay(800);
    
    return rows.map((row) => ({
      id: row.ID || '',
      name: row.Name || '',
      demographics: {
        age: row.Age || '',
        sex: row.Sex || '',
        height: row.Height || '',
        weight: row.Weight || '',
      },
      diagnoses: [row.Diagnosis1, row.Diagnosis2].filter(Boolean),
      medications: [row.Medication1, row.Medication2].filter(Boolean),
      labs: [row.Lab1, row.Lab2].filter(Boolean),
      procedures: [row.Procedure1, row.Procedure2].filter(Boolean),
    }));
  },

  async normalizeRecords(translated: TranslatedRecord[]): Promise<NormalizedRecord[]> {
    await delay(1000);
    
    const icd10Map: Record<string, string> = {
      'Diabetes': 'E11.9',
      'Hypertension': 'I10',
      'Asthma': 'J45.909',
      'Depression': 'F32.9',
      'Obesity': 'E66.9',
    };

    const rxNormMap: Record<string, string> = {
      'Metformin': '6809',
      'Lisinopril': '29046',
      'Albuterol': '435',
      'Sertraline': '36437',
      'Atorvastatin': '83367',
    };

    const loincMap: Record<string, string> = {
      'HbA1c': '4548-4',
      'Glucose': '2345-7',
      'Cholesterol': '2093-3',
      'HDL': '2085-9',
      'LDL': '18262-6',
    };

    const snomedMap: Record<string, string> = {
      'Blood Draw': '396550006',
      'X-Ray': '363680008',
      'MRI': '113091000',
      'CT Scan': '77477000',
      'EKG': '29303009',
    };

    return translated.map((record) => ({
      id: record.id,
      name: record.name,
      demographics: {
        age: parseInt(record.demographics.age) || 0,
        sex: (record.demographics.sex === 'M' || record.demographics.sex === 'F' 
          ? record.demographics.sex 
          : 'Other') as 'M' | 'F' | 'Other',
        height: parseFloat(record.demographics.height) || 0,
        weight: parseFloat(record.demographics.weight) || 0,
      },
      diagnoses: record.diagnoses.map((d) => ({
        code: icd10Map[d] || `ICD-${Math.floor(Math.random() * 1000)}`,
        system: 'ICD-10' as const,
      })),
      medications: record.medications.map((m) => ({
        code: rxNormMap[m] || `RX-${Math.floor(Math.random() * 10000)}`,
        system: 'RxNorm' as const,
      })),
      labs: record.labs.map((l) => ({
        code: loincMap[l] || `LOINC-${Math.floor(Math.random() * 10000)}`,
        system: 'LOINC' as const,
      })),
      procedures: record.procedures.map((p) => ({
        code: snomedMap[p] || `SNOMED-${Math.floor(Math.random() * 100000)}`,
        system: 'SNOMED-CT' as const,
      })),
    }));
  },

  async calculateQualityScores(normalized: NormalizedRecord[]): Promise<QualityScore[]> {
    await delay(700);
    
    const domains = [
      'Demographics',
      'Diagnoses',
      'Medications',
      'Labs',
      'Procedures',
    ];

    return domains.map((domain) => {
      const score = 0.75 + Math.random() * 0.2;
      const recordsBelowThreshold = Math.floor(
        normalized.length * (1 - score) * Math.random()
      );
      
      return {
        domain,
        score: Math.min(score, 1),
        recordsBelowThreshold,
      };
    });
  },

  async persistRecords(normalized: NormalizedRecord[]): Promise<{ count: number; failures: number }> {
    await delay(900);
    
    const failureRate = 0.02;
    const failures = Math.floor(normalized.length * failureRate * Math.random());
    
    return {
      count: normalized.length - failures,
      failures,
    };
  },

  async enrichRecords(normalized: NormalizedRecord[]): Promise<EnrichedRecord[]> {
    await delay(1000);
    
    return normalized.map((record) => {
      const heightM = record.demographics.height / 100;
      const bmi = record.demographics.weight / (heightM * heightM);
      
      let diabetesRisk = 0;
      if (bmi > 30) diabetesRisk += 0.3;
      if (record.demographics.age > 45) diabetesRisk += 0.2;
      if (record.diagnoses.some(d => d.code.includes('E11') || d.code === 'E66.9')) {
        diabetesRisk += 0.4;
      }
      diabetesRisk += Math.random() * 0.1;
      
      return {
        ...record,
        bmi: Math.round(bmi * 10) / 10,
        diabetesRisk: Math.min(Math.round(diabetesRisk * 100) / 100, 1),
      };
    });
  },

  async generateAnalytics(enriched: EnrichedRecord[]): Promise<AnalyticsSummary> {
    await delay(800);
    
    const sexDistribution = enriched.reduce((acc, record) => {
      const sex = record.demographics.sex;
      acc[sex] = (acc[sex] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const ageRanges = ['0-20', '21-40', '41-60', '61-80', '81+'];
    const ageHistogram = ageRanges.map((range) => {
      const [min, max] = range.split('-').map(s => s === '+' ? 200 : parseInt(s));
      const count = enriched.filter((r) => {
        const age = r.demographics.age;
        return max ? age >= min && age <= max : age >= min;
      }).length;
      
      return { range, count };
    });

    const diagnosisCounts = enriched.reduce((acc, record) => {
      record.diagnoses.forEach((d) => {
        const key = d.code;
        acc[key] = (acc[key] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const diagnosisDistribution = Object.entries(diagnosisCounts)
      .map(([diagnosis, count]) => ({ diagnosis, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const riskRanges = ['0-0.2', '0.2-0.4', '0.4-0.6', '0.6-0.8', '0.8-1.0'];
    const diabetesRiskDistribution = riskRanges.map((range) => {
      const [min, max] = range.split('-').map(parseFloat);
      const count = enriched.filter((r) => 
        r.diabetesRisk >= min && r.diabetesRisk < max
      ).length;
      
      return { range, count };
    });

    return {
      sexDistribution,
      ageHistogram,
      diagnosisDistribution,
      diabetesRiskDistribution,
    };
  },
};
