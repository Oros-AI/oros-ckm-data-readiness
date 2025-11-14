import { TranslatedRecord } from '../types/wizard';

interface TranslationStepProps {
  translatedRecords: TranslatedRecord[];
}

export function TranslationStep({ translatedRecords }: TranslationStepProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Step 2: Translation</h2>
        <p className="text-gray-600 mb-6">
          Convert CSV rows into structured JSON objects for processing.
        </p>

        {translatedRecords.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Translated Records
              </h3>
              <span className="text-sm text-gray-600">
                {translatedRecords.length} records translated
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto">
              {translatedRecords.slice(0, 5).map((record, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <pre className="text-xs text-gray-800 overflow-x-auto">
                    {JSON.stringify(record, null, 2)}
                  </pre>
                </div>
              ))}
            </div>

            {translatedRecords.length > 5 && (
              <p className="text-sm text-gray-500 mt-2">
                Showing first 5 of {translatedRecords.length} records
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No translated data available. Please run the translation step.
          </div>
        )}
      </div>
    </div>
  );
}
