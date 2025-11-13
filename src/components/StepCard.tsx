import { PipelineStep } from '../types/pipeline';
import { StatusBadge } from './StatusBadge';

interface StepCardProps {
  step: PipelineStep;
  isActive: boolean;
}

export function StepCard({ step, isActive }: StepCardProps) {
  return (
    <div
      className={`border rounded-lg p-4 transition-all ${
        isActive
          ? 'border-primary-500 bg-primary-50 shadow-md'
          : step.status === 'completed'
          ? 'border-green-300 bg-green-50'
          : step.status === 'failed'
          ? 'border-red-300 bg-red-50'
          : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center">
          <div
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mr-3 ${
              step.status === 'completed'
                ? 'bg-green-500 text-white'
                : step.status === 'running'
                ? 'bg-blue-500 text-white'
                : step.status === 'failed'
                ? 'bg-red-500 text-white'
                : 'bg-gray-300 text-gray-600'
            }`}
          >
            {step.id}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{step.name}</h3>
            <p className="text-sm text-gray-600">{step.description}</p>
          </div>
        </div>
        <StatusBadge status={step.status} size="sm" />
      </div>

      {step.duration && (
        <div className="mt-2 text-xs text-gray-500">
          Duration: {(step.duration / 1000).toFixed(2)}s
        </div>
      )}

      {step.details && (
        <div className="mt-3 p-3 bg-white border border-gray-200 rounded text-xs">
          <pre className="whitespace-pre-wrap text-gray-700">
            {JSON.stringify(step.details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
