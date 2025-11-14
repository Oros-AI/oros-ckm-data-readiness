import { EnrichedRecord } from '../types/wizard';

interface EnrichmentStepProps {
  enrichedRecords: EnrichedRecord[];
}

export function EnrichmentStep({ enrichedRecords }: EnrichmentStepProps) {
  const getRiskColor = (risk: number) => {
    if (risk >= 0.7) return 'text-red-600 bg-red-50';
    if (risk >= 0.4) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getRiskLabel = (risk: number) => {
    if (risk >= 0.7) return 'High Risk';
    if (risk >= 0.4) return 'Medium Risk';
    return 'Low Risk';
  };

  const riskDistribution = enrichedRecords.reduce((acc, record) => {
    const label = getRiskLabel(record.diabetesRisk);
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Step 6: Enrichment</h2>
        <p className="text-gray-600 mb-6">
          Compute BMI and diabetes risk scores to enrich patient records with derived insights.
        </p>

        {enrichedRecords.length > 0 ? (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Enrichment Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
                <div>
                  <p className="font-medium">Total Records Enriched</p>
                  <p className="text-2xl font-bold">{enrichedRecords.length}</p>
                </div>
                <div>
                  <p className="font-medium">High Risk Patients</p>
                  <p className="text-2xl font-bold">{riskDistribution['High Risk'] || 0}</p>
                </div>
                <div>
                  <p className="font-medium">Medium Risk Patients</p>
                  <p className="text-2xl font-bold">{riskDistribution['Medium Risk'] || 0}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Enriched Records Sample
              </h3>
              
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">BMI</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">BMI Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Diabetes Risk</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {enrichedRecords.slice(0, 10).map((record, idx) => {
                      const bmiCategory = record.bmi < 18.5 ? 'Underweight' :
                                        record.bmi < 25 ? 'Normal' :
                                        record.bmi < 30 ? 'Overweight' : 'Obese';
                      const riskLabel = getRiskLabel(record.diabetesRisk);
                      
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{record.id}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{record.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{record.demographics.age}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-semibold">{record.bmi}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{bmiCategory}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                            {(record.diabetesRisk * 100).toFixed(0)}%
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(record.diabetesRisk)}`}>
                              {riskLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {enrichedRecords.length > 10 && (
                <p className="text-sm text-gray-500 mt-2">
                  Showing first 10 of {enrichedRecords.length} records
                </p>
              )}
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Enrichment Calculations</h4>
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>BMI Formula:</strong> weight (kg) / height² (m²)</p>
                <p><strong>Diabetes Risk Factors:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>BMI &gt; 30: +30% risk</li>
                  <li>Age &gt; 45: +20% risk</li>
                  <li>Diabetes-related diagnoses: +40% risk</li>
                  <li>Additional individual factors: variable</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No enriched data available. Please run the enrichment step.
          </div>
        )}
      </div>
    </div>
  );
}
