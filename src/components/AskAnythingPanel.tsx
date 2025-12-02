/**
 * AskAnythingPanel Component
 * 
 * A mock NLP-style chat interface for asking questions about the dataset.
 * This component provides a demo of AI-powered analytics without real backend calls.
 */

import React, { useState } from 'react';

export const AskAnythingPanel: React.FC = () => {
  const [question, setQuestion] = useState<string>('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState<boolean>(false);

  // Handle Ask Anything submission
  const handleAskQuestion = async () => {
    if (!question.trim()) {
      return; // Do nothing if question is empty
    }

    setIsAsking(true);
    setAnswer(null);
    
    // Simulate a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Generate mock answer based on question keywords
    // TODO: In a future phase, replace this mock implementation with a real Archia /query call via a backend proxy.
    const mockAnswer = generateMockAnalyticsAnswer(question);
    
    setAnswer(mockAnswer);
    setIsAsking(false);
  };

  // Generate contextual mock answers
  const generateMockAnalyticsAnswer = (q: string): string => {
    const lowerQ = q.toLowerCase();
    
    if (lowerQ.includes('quality') || lowerQ.includes('score')) {
      return "The dataset shows an overall quality score of 85%, with high completeness (92%) but moderate consistency issues (78%). The main quality concerns are in the normalization step where 2 diagnosis codes could not be mapped to standard ICD-10 codes. Consider reviewing the unmapped codes and applying the suggested patches.";
    }
    
    if (lowerQ.includes('error') || lowerQ.includes('issue') || lowerQ.includes('problem')) {
      return "The pipeline identified 2 normalization issues: 'Diabetes Type II' could not be automatically mapped to ICD-10, and 'Metformin 500' has an ambiguous medication code. These issues affect 2 out of your total records. The AI agent has proposed patches that would map these to standard codes with 85% confidence.";
    }
    
    if (lowerQ.includes('patient') || lowerQ.includes('demographic')) {
      return "Based on the enriched dataset, the patient population includes diverse age groups (18-85 years) with a balanced gender distribution. The most common diagnoses are diabetes-related conditions, and the medication profile suggests a focus on chronic disease management. Lab values show normal distributions for most biomarkers.";
    }
    
    if (lowerQ.includes('trend') || lowerQ.includes('pattern')) {
      return "Analysis reveals several patterns: 1) Higher prevalence of diabetes in older age cohorts, 2) Correlation between HbA1c levels and medication adherence, 3) Seasonal variations in certain lab test frequencies. These insights could inform targeted intervention strategies.";
    }
    
    if (lowerQ.includes('recommendation') || lowerQ.includes('suggest')) {
      return "Based on the analysis: 1) Focus interventions on patients with diabetes risk scores > 0.7, 2) Implement standardized medication reconciliation for better data consistency, 3) Consider enriching lab data with reference ranges for improved clinical context, 4) Review unmapped diagnosis codes for potential manual mapping.";
    }
    
    if (lowerQ.includes('statistic') || lowerQ.includes('metric')) {
      return "Key metrics from your dataset: Total records: 100, Average age: 52.3 years, Gender distribution: 48% Male, 49% Female, 3% Other. Most common diagnosis: Type 2 Diabetes (15%). Data completeness: 92%. Processing time: < 2 seconds per step. Quality score: 85/100.";
    }
    
    // Default response
    return "This dataset has been successfully processed through all 7 pipeline steps. The normalization achieved 99% code mapping, with minor issues flagged for review. Data quality metrics indicate the dataset is suitable for downstream analytics and reporting. Consider applying the AI-suggested patches to achieve 100% normalization.";
  };

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">
          Analytics Chat
        </h3>
        <p className="text-sm text-blue-700">
          Ask a question about this dataset or pipeline run. This is a mock demo; no real Archia call is made.
        </p>
      </div>

      {/* Question Input */}
      <div>
        <label htmlFor="ask-anything-question" className="block text-sm font-medium text-gray-700 mb-2">
          Your Question
        </label>
        <textarea
          id="ask-anything-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g., What are the main data quality issues?"
          className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          disabled={isAsking}
        />
      </div>

      {/* Ask Button */}
      <div>
        <button
          onClick={handleAskQuestion}
          disabled={isAsking || !question.trim()}
          className={`w-full px-4 py-2 font-medium rounded-lg transition-colors ${
            isAsking || !question.trim()
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isAsking ? 'Analyzing...' : 'Ask'}
        </button>
      </div>

      {/* Answer Display */}
      {answer && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Answer
          </h3>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-800 leading-relaxed">
              {answer}
            </p>
          </div>
        </div>
      )}

      {/* Sample Questions */}
      {!answer && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Sample Questions
          </h3>
          <div className="space-y-2">
            {[
              'What are the data quality scores?',
              'Are there any normalization issues?',
              'Tell me about patient demographics',
              'What patterns do you see in the data?',
              'What are your recommendations?',
              'Show me key statistics'
            ].map((sample, index) => (
              <button
                key={index}
                onClick={() => setQuestion(sample)}
                className="w-full text-left px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer Note */}
      <div className="text-xs text-gray-500 text-center pt-4 border-t">
        <p>This is a read-only mock demonstration. No data is modified.</p>
        <p className="mt-1">Future versions will connect to Archia AI for real-time insights.</p>
      </div>
    </div>
  );
};