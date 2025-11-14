import { NormalizedRecord } from '../types/wizard';

interface NormalizationStepProps {
  normalizedRecords: NormalizedRecord[];
}

export function NormalizationStep({ normalizedRecords }: NormalizationStepProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Step 3: Normalization</h2>
        <p className="text-gray-600 mb-6">
          Map medical codes to standard terminologies: Diagnoses → ICD-10, Medications → RxNorm, 
          Labs → LOINC, Procedures → SNOMED-CT. Normalize demographics to standard units.
        </p>

        {normalizedRecords.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Normalized Data Preview
              </h3>
              <span className="text-sm text-gray-600">
                {normalizedRecords.length} records normalized
              </span>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-blue-900 mb-2">Normalization Standards:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Diagnoses: ICD-10 codes</li>
                <li>• Medications: RxNorm codes</li>
                <li>• Labs: LOINC codes</li>
                <li>• Procedures: SNOMED-CT codes</li>
                <li>• Age: years (numeric)</li>
                <li>• Height: cm (numeric)</li>
                <li>• Weight: kg (numeric)</li>
                <li>• Sex: M/F/Other</li>
              </ul>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sex</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Height (cm)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weight (kg)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Diagnoses</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medications</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {normalizedRecords.slice(0, 10).map((record, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{record.id}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{record.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{record.demographics.age}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{record.demographics.sex}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{record.demographics.height}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{record.demographics.weight}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {record.diagnoses.map(d => d.code).join(', ')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {record.medications.map(m => m.code).join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {normalizedRecords.length > 10 && (
              <p className="text-sm text-gray-500 mt-2">
                Showing first 10 of {normalizedRecords.length} records
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No normalized data available. Please run the normalization step.
          </div>
        )}
      </div>
    </div>
  );
}
