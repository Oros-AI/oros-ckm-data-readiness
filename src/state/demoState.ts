// src/state/demoState.ts
// Minimal demo state for the Step 8 front door (spec §15: replaces the
// wizard's seven-step state model). Selected session, one expanded
// blocker, the remediation drawer target, and recommendation decisions.
// Plain React state: no library, no persistence, no undo (reset, in
// Increment 5, will be the undo).

import { useState } from 'react';

export type SessionId = 'A' | 'B' | 'C';
export type Decision = 'approved' | 'rejected';

// Decision keys are session-scoped composites: recommendationIds are
// check-scoped in the fixtures and repeat across B and C, so the session
// prefix is what keeps a B decision invisible in C.
export function keyDecision(session: SessionId, recommendationId: string): string {
  return `${session}:${recommendationId}`;
}

export interface DemoState {
  session: SessionId;
  selectSession: (session: SessionId) => void;
  expandedBlockerId: string | null;
  toggleBlocker: (blockerId: string) => void;
  openDrawerBlockerId: string | null;
  openDrawer: (blockerId: string) => void;
  closeDrawer: () => void;
  decisions: Record<string, Decision>;
  decide: (recommendationId: string, decision: Decision) => void;
}

export function useDemoState(): DemoState {
  const [session, setSession] = useState<SessionId>('B');
  const [expandedBlockerId, setExpandedBlockerId] = useState<string | null>(null);
  const [openDrawerBlockerId, setOpenDrawerBlockerId] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  const selectSession = (next: SessionId) => {
    setSession(next);
    // blocker ids and drawer context are session-scoped
    setExpandedBlockerId(null);
    setOpenDrawerBlockerId(null);
  };

  const toggleBlocker = (blockerId: string) => {
    setExpandedBlockerId((current) => (current === blockerId ? null : blockerId));
  };

  const openDrawer = (blockerId: string) => setOpenDrawerBlockerId(blockerId);
  const closeDrawer = () => setOpenDrawerBlockerId(null);

  const decide = (recommendationId: string, decision: Decision) => {
    setDecisions((current) => ({
      ...current,
      [keyDecision(session, recommendationId)]: decision,
    }));
  };

  return {
    session,
    selectSession,
    expandedBlockerId,
    toggleBlocker,
    openDrawerBlockerId,
    openDrawer,
    closeDrawer,
    decisions,
    decide,
  };
}
