import { StepStatus, RunStatus } from '../types/pipeline';

interface StatusBadgeProps {
  status: StepStatus | RunStatus;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const statusConfig = {
    pending: {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      label: 'Pending',
    },
    running: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      label: 'Running',
    },
    completed: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      label: 'Completed',
    },
    failed: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      label: 'Failed',
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizeClasses[size]} ${config.bg} ${config.text}`}
    >
      <span className={`mr-1.5 h-2 w-2 rounded-full ${
        status === 'running' ? 'bg-blue-500 animate-pulse' : 
        status === 'completed' ? 'bg-green-500' :
        status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
      }`} />
      {config.label}
    </span>
  );
}
