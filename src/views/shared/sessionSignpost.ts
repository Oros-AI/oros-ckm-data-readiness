// src/views/shared/sessionSignpost.ts
// Session-identity signposting copy (inc5-b): the single authored home
// of the three signpost strings (approved copy, verbatim). Components
// render from this function only; no signpost literal lives in JSX.
// Exhaustive over SessionId (never-default idiom, tokens.ts precedent):
// a new session id is a compile error here, never a silent gap.

import type { SessionId } from '../../state/demoState';

export function getSessionSignpost(session: SessionId): string {
  switch (session) {
    case 'A':
      return 'Session A is the clean baseline. Every use case is unlocked.';
    case 'B':
      return 'Session B is the same population with deliberately seeded data defects. Each blocker shows what failed and where it routes.';
    case 'C':
      return 'Session C is after one remediation pass. Some defects are fixed. The rest remain visible and routed to the people who can fix them.';
    default: {
      const exhaustive: never = session;
      throw new Error(`getSessionSignpost: unknown session ${String(exhaustive)}`);
    }
  }
}
