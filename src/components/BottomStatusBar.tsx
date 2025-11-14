import { StepName, StepStatus } from '../types/wizard';
import { STEPS } from '../state/wizardState';

interface BottomStatusBarProps {
  currentStep: StepName;
  status: StepStatus;
}

const statusColors: Record<StepStatus, string> = {
  pending: 'bg-gray-400',
  running: 'bg-blue-500',
  success: 'bg-green-500',
  error: 'bg-red-500',
};

const statusText: Record<StepStatus, string> = {
  pending: 'Pending',
  running: 'In Progress',
  success: 'Completed',
  error: 'Failed',
};

export function BottomStatusBar({ currentStep, status }: BottomStatusBarProps) {
  const step = STEPS.find(s => s.id === currentStep);
  const bgColor = statusColors[status];
  
  return (
    <div className={`h-[5vh] ${bgColor} flex items-center px-8 text-white`}>
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
        <div className="flex items-center space-x-4">
          <span className="font-semibold text-lg">
            {step?.label || 'Unknown Step'}
          </span>
          <span className="text-sm opacity-90">
            • {statusText[status]}
          </span>
        </div>
        {status === 'running' && (
          <div className="flex items-center space-x-2">
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            <span className="text-sm">Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
}
