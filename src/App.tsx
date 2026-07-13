// src/App.tsx
// Step 8 front door shell (rewritten from scratch at Increment 2 — the
// legacy wizard App is replaced per Demo UI/UX Spec §15; nothing from it
// is preserved). Session selector + headline + the use-case view. CSS
// stays imported in main.tsx; this file imports no styles and no legacy
// modules. Lead-view toggle and pipeline view arrive in later increments.

import { useDemoState } from './state/demoState';
import type { SessionId } from './state/demoState';
import { UseCaseView } from './views/UseCaseView/UseCaseView';
import { tokens } from './theme/tokens';

const SESSIONS: SessionId[] = ['A', 'B', 'C'];

export default function App() {
  const state = useDemoState();

  return (
    <main
      style={{
        backgroundColor: tokens.neutral.light,
        color: tokens.brand.ink,
        minHeight: '100vh',
        padding: '2rem',
        maxWidth: '60rem',
        margin: '0 auto',
      }}
    >
      <header style={{ marginBottom: '1.5rem' }}>
        <div
          role="group"
          aria-label="Demo session"
          style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}
        >
          {SESSIONS.map((session) => (
            <button
              key={session}
              type="button"
              data-testid={`session-${session}`}
              aria-pressed={state.session === session}
              onClick={() => state.selectSession(session)}
              style={{
                border: `1px solid ${state.session === session ? tokens.brand.green : tokens.neutral.border}`,
                backgroundColor:
                  state.session === session ? tokens.brand.greenTint1 : tokens.neutral.surface,
                color: tokens.brand.ink,
                borderRadius: '4px',
                padding: '0.3rem 0.9rem',
                fontWeight: state.session === session ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {session}
            </button>
          ))}
        </div>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: tokens.brand.ink }}>
          Can this population's data support each capability?
        </h1>
      </header>

      <UseCaseView
        session={state.session}
        expandedBlockerId={state.expandedBlockerId}
        onToggleBlocker={state.toggleBlocker}
      />
    </main>
  );
}
