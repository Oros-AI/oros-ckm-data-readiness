// src/state/demoState.ts
// Minimal demo state for the Step 8 front door (spec §15: replaces the
// wizard's seven-step state model). Selected session, one expanded
// blocker, the remediation drawer target, and recommendation decisions.
// Plain React state: no library, no persistence, no undo (reset, in
// Increment 5, will be the undo).

import { useState } from 'react';
import { LEAD_VIEW } from '../config/DemoConfig';

export type SessionId = 'A' | 'B' | 'C';
export type ViewId = 'use_case' | 'pipeline';
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
}

// initialView defaults to config for the app; the parameter exists for
// gate testability (Increment 1 seam precedent). App passes no argument.
export function useDemoState(initialView: ViewId = LEAD_VIEW): DemoState {
  const [session, setSession] = useState<SessionId>('B');
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
    // R1 (2026-07-13): entering the pipeline view closes the drawer;
    // expandedBlockerId is left unchanged. Toggling never opens the drawer.
    if (next === 'pipeline') setOpenDrawerBlockerId(null);
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
    view,
    selectView,
    expandedBlockerId,
    toggleBlocker,
    openDrawerBlockerId,
    openDrawer,
    closeDrawer,
    decisions,
    decide,
  };
}
