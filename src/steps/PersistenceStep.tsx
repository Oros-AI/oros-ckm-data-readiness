import { NormalizedRecord } from '../types/wizard';

interface PersistenceStepProps {
  persistedCount: number;
  persistedFailures: number;
  normalizedRecords: NormalizedRecord[];
}

export function PersistenceStep({ persistedCount, persistedFailures, normalizedRecords }: PersistenceStepProps) {
  const hasData = persistedCount > 0 || persistedFailures > 0;
  const successRate = hasData 
    ? ((persistedCount / (persistedCount + persistedFailures)) * 100).toFixed(1)
    : '0';

  /**
   * Browser-side NDJSON generation for demo purposes.
   * 
   * This function converts normalized records to NDJSON (Newline Delimited JSON) format,
   * where each record is a JSON object on a single line, separated by newlines.
   * 
   * Note: This is a client-side implementation for demonstration. In production,
   * NDJSON generation would typically occur server-side or during batch processing.
   */
  const generateNDJSON = (): string => {
    return normalizedRecords.map(r => JSON.stringify(r)).join('\n');
  };

  /**
   * Handle downloading the NDJSON file to the user's computer.
   * Uses browser Blob API and creates a temporary download link.
   */
  const handleDownloadNDJSON = () => {
    if (normalizedRecords.length === 0) {
      return;
    }

    const ndjson = generateNDJSON();
    const blob = new Blob([ndjson], { type: 'application/x-ndjson' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pipeline-output.ndjson';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the object URL after a short delay
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  // Get preview of first 3 lines of NDJSON
  const getNDJSONPreview = (): string => {
    if (normalizedRecords.length === 0) {
      return '';
    }
    const ndjson = generateNDJSON();
    const lines = ndjson.split('\n');
    return lines.slice(0, 3).join('\n');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Step 5: Persistence</h2>
        <p className="text-gray-600 mb-6">
          Simulate writing normalized data to a DuckDB database (mock operation).
        </p>

        {hasData ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 font-medium">Records Written</p>
                    <p className="text-3xl font-bold text-green-700 mt-2">
                      {persistedCount}
                    </p>
                  </div>
                  <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>

              {persistedFailures > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-600 font-medium">Write Failures</p>
                      <p className="text-3xl font-bold text-red-700 mt-2">
                        {persistedFailures}
                      </p>
                    </div>
                    <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Success Rate</p>
                    <p className="text-3xl font-bold text-blue-700 mt-2">
                      {successRate}%
                    </p>
                  </div>
                  <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Database Operations</h4>
              <div className="space-y-2 text-sm text-gray-700">
                <p>✓ Connected to DuckDB (simulated)</p>
                <p>✓ Created healthcare_data table</p>
                <p>✓ Inserted {persistedCount} records</p>
                {persistedFailures > 0 && (
                  <p className="text-red-600">✗ {persistedFailures} records failed to insert (constraint violations)</p>
                )}
                <p>✓ Committed transaction</p>
              </div>
            </div>

            {persistedFailures > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Suggested Fix</h4>
                <p className="text-sm text-yellow-800">
                  Some records failed to persist due to data constraint violations. 
                  Consider reviewing the normalization step to ensure all data conforms to expected formats.
                  Failed records have been logged for manual review.
                </p>
              </div>
            )}

            {/* NDJSON Export Section */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">NDJSON Export</h4>
              
              {normalizedRecords.length > 0 ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-700 mb-2">Preview (first 3 lines):</p>
                    <pre className="bg-gray-800 text-green-400 p-3 rounded text-xs overflow-x-auto font-mono">
                      {getNDJSONPreview()}
                    </pre>
                  </div>
                  
                  <button
                    onClick={handleDownloadNDJSON}
                    disabled={normalizedRecords.length === 0}
                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download NDJSON
                  </button>
                  <p className="text-xs text-gray-600">
                    Downloads {normalizedRecords.length} record{normalizedRecords.length !== 1 ? 's' : ''} as pipeline-output.ndjson
                  </p>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">No normalized records available for export.</p>
                  <p className="text-xs mt-1">Please complete the normalization step first.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No persistence data available. Please run the persistence step.
          </div>
        )}
      </div>
    </div>
  );
}
