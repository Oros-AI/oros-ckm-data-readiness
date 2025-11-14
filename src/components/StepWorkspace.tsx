import { ReactNode } from 'react';

interface StepWorkspaceProps {
  children: ReactNode;
}

export function StepWorkspace({ children }: StepWorkspaceProps) {
  return (
    <div className="h-[80vh] overflow-y-auto bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {children}
      </div>
    </div>
  );
}
