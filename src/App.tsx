// src/App.tsx
// Step 8 front door shell (rewritten from scratch at Increment 2 — the
// legacy wizard App is replaced per Demo UI/UX Spec §15; nothing from it
// is preserved). Session selector + headline + the use-case view. CSS
// stays imported in main.tsx; this file imports no styles and no legacy
// modules. Lead-view toggle and pipeline view arrive in later increments.

import { useDemoState } from './state/demoState';
import type { SessionId, ViewId } from './state/demoState';
import { UseCaseView } from './views/UseCaseView/UseCaseView';
import { PipelineView } from './views/PipelineView/PipelineView';
import { RemediationDrawer } from './components/RemediationDrawer';
import { tokens } from './theme/tokens';

const SESSIONS: SessionId[] = ['A', 'B', 'C'];

const VIEWS: Array<{ id: ViewId; label: string }> = [
  { id: 'use_case', label: 'Capabilities' },
  { id: 'pipeline', label: 'Under the hood' },
];

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
        <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div
            role="group"
            aria-label="Demo session"
            style={{ display: 'flex', gap: '0.4rem' }}
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
          <div role="group" aria-label="View" style={{ display: 'flex', gap: '0.4rem' }}>
            {VIEWS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                data-testid={`view-${id}`}
                aria-pressed={state.view === id}
                onClick={() => state.selectView(id)}
                style={{
                  border: `1px solid ${state.view === id ? tokens.brand.green : tokens.neutral.border}`,
                  backgroundColor:
                    state.view === id ? tokens.brand.greenTint1 : tokens.neutral.surface,
                  color: tokens.brand.ink,
                  borderRadius: '4px',
                  padding: '0.3rem 0.9rem',
                  fontWeight: state.view === id ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: tokens.brand.ink }}>
          Can this population's data support each capability?
        </h1>
      </header>

      {state.view === 'use_case' ? (
        <UseCaseView
          session={state.session}
          expandedBlockerId={state.expandedBlockerId}
          onToggleBlocker={state.toggleBlocker}
          decisions={state.decisions}
          onOpenDrawer={state.openDrawer}
        />
      ) : (
        <PipelineView session={state.session} />
      )}

      {/* Drawer shell mounts once here (spec §5); opened only from the
          four-facts panel affordance. */}
      <RemediationDrawer
        session={state.session}
        blockerId={state.openDrawerBlockerId}
        decisions={state.decisions}
        onDecide={state.decide}
        onClose={state.closeDrawer}
      />
    </main>
  );
}
