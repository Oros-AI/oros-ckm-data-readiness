import { QualityScore } from '../types/wizard';

interface DataQualityScoringStepProps {
  qualityScores: QualityScore[];
}

export function DataQualityScoringStep({ qualityScores }: DataQualityScoringStepProps) {
  const getScoreColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 0.7) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.9) return 'Excellent';
    if (score >= 0.7) return 'Good';
    return 'Needs Improvement';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Step 4: Data Quality Scoring</h2>
        <p className="text-gray-600 mb-6">
          Compute PIQI-like quality scores per domain and identify records below quality threshold (0.7).
        </p>

        {qualityScores.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Quality Scores by Domain
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {qualityScores.map((score, idx) => (
                <div
                  key={idx}
                  className={`border rounded-lg p-4 ${getScoreColor(score.score)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-lg">{score.domain}</h4>
                    <span className="text-xs font-medium px-2 py-1 rounded">
                      {getScoreLabel(score.score)}
                    </span>
                  </div>
                  
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Score</span>
                      <span className="text-2xl font-bold">
                        {(score.score * 100).toFixed(1)}%
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${score.score * 100}%`,
                          backgroundColor: score.score >= 0.9 ? '#10b981' : 
                                         score.score >= 0.7 ? '#f59e0b' : '#ef4444'
                        }}
                      />
                    </div>
                  </div>

                  {score.recordsBelowThreshold > 0 && (
                    <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                      <p className="text-sm">
                        <span className="font-semibold">{score.recordsBelowThreshold}</span>
                        {' '}record{score.recordsBelowThreshold !== 1 ? 's' : ''} below threshold
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Quality Threshold</h4>
              <p className="text-sm text-blue-800">
                Records with quality scores below 70% may require additional review or data enrichment.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No quality scores available. Please run the data quality scoring step.
          </div>
        )}
      </div>
    </div>
  );
}
