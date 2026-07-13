// src/state/demoState.ts
// Minimal demo state for the Step 8 front door (spec §15: replaces the
// wizard's seven-step state model). Selected session + one expanded
// blocker; plain React state, no library. Reset/arc polish is Increment 5
// scope — deliberately not built here.

import { useState } from 'react';

export type SessionId = 'A' | 'B' | 'C';

export interface DemoState {
  session: SessionId;
  selectSession: (session: SessionId) => void;
  expandedBlockerId: string | null;
  toggleBlocker: (blockerId: string) => void;
}

export function useDemoState(): DemoState {
  const [session, setSession] = useState<SessionId>('B');
  const [expandedBlockerId, setExpandedBlockerId] = useState<string | null>(null);

  const selectSession = (next: SessionId) => {
    setSession(next);
    setExpandedBlockerId(null); // a blocker id is session-scoped context
  };

  const toggleBlocker = (blockerId: string) => {
    setExpandedBlockerId((current) => (current === blockerId ? null : blockerId));
  };

  return { session, selectSession, expandedBlockerId, toggleBlocker };
}
