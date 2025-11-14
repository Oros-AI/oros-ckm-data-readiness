import { useRef, ChangeEvent } from 'react';
import Papa from 'papaparse';
import { CSVRow } from '../types/wizard';

interface IngestionStepProps {
  ingestedRows: CSVRow[];
  onIngest: (rows: CSVRow[]) => void;
}

export function IngestionStep({ ingestedRows, onIngest }: IngestionStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        onIngest(results.data);
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        alert('Error parsing CSV file: ' + error.message);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Step 1: Data Ingestion</h2>
        <p className="text-gray-600 mb-6">
          Upload a CSV file containing patient data with columns: ID, Name, Age, Sex, Height, Weight, 
          Diagnosis1, Diagnosis2, Medication1, Medication2, Lab1, Lab2, Procedure1, Procedure2.
        </p>

        <div className="mb-6">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none focus:border-blue-500 p-2"
          />
        </div>

        {ingestedRows.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Ingested Data Preview
              </h3>
              <span className="text-sm text-gray-600">
                {ingestedRows.length} records loaded
              </span>
            </div>
            
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(ingestedRows[0] || {}).map((header) => (
                      <th
                        key={header}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ingestedRows.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {Object.values(row).map((value, cellIdx) => (
                        <td
                          key={cellIdx}
                          className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap"
                        >
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {ingestedRows.length > 10 && (
              <p className="text-sm text-gray-500 mt-2">
                Showing first 10 of {ingestedRows.length} records
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
