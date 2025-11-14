import { StepName, StepStatus } from '../types/wizard';
import { STEPS } from '../state/wizardState';

interface TopPipelineBarProps {
  currentStep: StepName;
  stepStates: Record<StepName, { status: StepStatus; error?: string }>;
  onStepClick: (step: StepName) => void;
}

const statusColors: Record<StepStatus, { bg: string; border: string; text: string }> = {
  pending: { bg: 'bg-gray-300', border: 'border-gray-400', text: 'text-gray-700' },
  running: { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-white' },
  success: { bg: 'bg-green-500', border: 'border-green-600', text: 'text-white' },
  error: { bg: 'bg-red-500', border: 'border-red-600', text: 'text-white' },
};

export function TopPipelineBar({ currentStep, stepStates, onStepClick }: TopPipelineBarProps) {
  return (
    <div className="h-[15vh] bg-gradient-to-b from-gray-50 to-white border-b border-gray-200 flex items-center px-8">
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
        {STEPS.map((step, index) => {
          const status = stepStates[step.id].status;
          const colors = statusColors[status];
          const isActive = currentStep === step.id;
          
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <button
                  onClick={() => onStepClick(step.id)}
                  className={`
                    w-16 h-16 rounded-full border-4 flex items-center justify-center
                    transition-all duration-200 hover:scale-110 cursor-pointer
                    ${colors.bg} ${colors.border} ${colors.text}
                    ${isActive ? 'ring-4 ring-blue-300 shadow-lg' : ''}
                  `}
                  title={step.label}
                >
                  <span className="text-lg font-bold">{index + 1}</span>
                </button>
                <span className={`
                  mt-2 text-sm font-medium text-center px-2
                  ${isActive ? 'text-blue-600 font-semibold' : 'text-gray-600'}
                `}>
                  {step.label}
                </span>
              </div>
              
              {index < STEPS.length - 1 && (
                <div className="flex-1 h-1 bg-gray-300 mx-2 mb-6">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      statusColors[stepStates[STEPS[index + 1].id].status].bg
                    }`}
                    style={{ 
                      width: stepStates[STEPS[index + 1].id].status !== 'pending' ? '100%' : '0%' 
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
