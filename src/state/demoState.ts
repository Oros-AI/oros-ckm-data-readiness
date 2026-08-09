// src/state/demoState.ts
// Minimal demo state for the Step 8 front door (spec §15: replaces the
// wizard's seven-step state model). Selected session, active view, one
// expanded blocker, the remediation drawer target, and recommendation
// decisions. Plain React state: no library, no persistence; reset() is
// the undo (inc5-c). A fresh load and a reset land on the identical
// known state (D5: session A, the configured lead view, nothing open).

import { useState } from 'react';
import { LEAD_VIEW } from '../config/DemoConfig';

export type SessionId = 'A' | 'B' | 'C';
export type ViewId = 'use_case' | 'pipeline' | 'care_team';
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
  view: ViewId;
  selectView: (view: ViewId) => void;
  expandedBlockerId: string | null;
  toggleBlocker: (blockerId: string) => void;
  openDrawerBlockerId: string | null;
  openDrawer: (blockerId: string) => void;
  closeDrawer: () => void;
  decisions: Record<string, Decision>;
  decide: (recommendationId: string, decision: Decision) => void;
  reset: () => void;
}

// initialView defaults to config for the app; the parameter exists for
// gate testability (Increment 1 seam precedent). App passes no argument.
export function useDemoState(initialView: ViewId = LEAD_VIEW): DemoState {
  const [session, setSession] = useState<SessionId>('A');
  const [view, setView] = useState<ViewId>(initialView);
  const [expandedBlockerId, setExpandedBlockerId] = useState<string | null>(null);
  const [openDrawerBlockerId, setOpenDrawerBlockerId] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  const selectSession = (next: SessionId) => {
    setSession(next);
    // blocker ids and drawer context are session-scoped; view selection
    // deliberately survives a session switch (R2, 2026-07-13)
    setExpandedBlockerId(null);
    setOpenDrawerBlockerId(null);
  };

  const selectView = (next: ViewId) => {
    setView(next);
    // R1 (2026-07-13), extended at Task 4: leaving the use-case view
    // closes the drawer (its trigger lives only there);
    // expandedBlockerId is left unchanged. Toggling never opens the drawer.
    if (next !== 'use_case') setOpenDrawerBlockerId(null);
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

  // Reset re-points; it does not recompute. Lands on the fresh-load
  // state: session A, the configured lead view, nothing open, and the
  // decisions map cleared across ALL sessions (Increment 3 D2 transfer).
  const reset = () => {
    setSession('A');
    setView(LEAD_VIEW);
    setExpandedBlockerId(null);
    setOpenDrawerBlockerId(null);
    setDecisions({});
  };

  return {
    session,
    selectSession,
    view,
    selectView,
    expandedBlockerId,
    toggleBlocker,
    openDrawerBlockerId,
    openDrawer,
    closeDrawer,
    decisions,
    decide,
    reset,
  };
}
