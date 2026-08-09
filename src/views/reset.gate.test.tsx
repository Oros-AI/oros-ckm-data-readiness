/** @vitest-environment jsdom */
// Increment 5c gate (G5c-1..G5c-5): reset + initial-session alignment.
// Reset re-points to the fresh-load state (session A, the configured
// lead view, nothing open, decisions cleared across ALL sessions per
// the Increment 3 D2 transferred assertion). A failure means the state
// or the chrome drifted, never that the test needs adjusting.

import { afterEach, describe, expect, it } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from '@testing-library/react';
import App from '../App';
import { useDemoState } from '../state/demoState';

afterEach(cleanup);

const SIGNPOST_A = 'Session A is the clean baseline. Every use case is unlocked.';
const PIPELINE_CAPTION =
  'Pre-computed results from the scoring engine, presented stage by stage.';

async function freshApp() {
  const utils = render(<App />);
  await screen.findAllByTestId('capability-card');
  return utils;
}

async function switchSession(session: 'A' | 'B' | 'C') {
  fireEvent.click(screen.getByTestId(`session-${session}`));
  await screen.findAllByTestId('capability-card');
}

describe('reset gate - Increment 5c (G5c-1..G5c-5)', () => {
  it('G5c-1: reset from a dirty state lands on the known state', async () => {
    await freshApp();

    // Dirty: session C, a blocker expanded, then the pipeline view.
    await switchSession('C');
    fireEvent.click(await screen.findByTestId('blocker-blk_layer5_date_concordance'));
    expect(screen.getByTestId('four-facts-panel')).toBeTruthy();
    fireEvent.click(screen.getByTestId('view-pipeline'));
    await screen.findByText(PIPELINE_CAPTION);

    fireEvent.click(screen.getByTestId('reset-demo'));
    await screen.findAllByTestId('capability-card');

    expect(screen.getByTestId('session-A').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('view-use_case').getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByText(PIPELINE_CAPTION)).toBeNull();
    expect(screen.queryByTestId('four-facts-panel')).toBeNull();
    expect(screen.queryByTestId('remediation-drawer')).toBeNull();
    expect(screen.getByTestId('session-signpost').textContent).toBe(SIGNPOST_A);
  });

  it('G5c-2: reset clears decisions across ALL sessions (D2 transferred)', async () => {
    // UI grain: decide on a B blocker, reset, revisit B: zero markers.
    await freshApp();
    await switchSession('B');
    fireEvent.click(await screen.findByTestId('blocker-blk_layer3_mapped_values'));
    fireEvent.click(screen.getByTestId('open-drawer-blk_layer3_mapped_values'));
    const drawer = await screen.findByTestId('remediation-drawer');
    fireEvent.click(await within(drawer).findByRole('button', { name: 'Approve' }));
    await within(drawer).findByTestId('decision-confirmation');
    expect(screen.getByTestId('decided-marker-blk_layer3_mapped_values')).toBeTruthy();

    fireEvent.click(screen.getByTestId('reset-demo'));
    await screen.findAllByTestId('capability-card');
    await switchSession('B');
    expect(screen.queryAllByTestId(/^decided-marker-/)).toHaveLength(0);
    cleanup();

    // State grain: keys under two different sessions, reset empties the map.
    const { result } = renderHook(() => useDemoState());
    act(() => result.current.decide('rec_layer3_mapped_values', 'approved'));
    act(() => result.current.selectSession('B'));
    act(() => result.current.decide('rec_layer5_date_concordance', 'rejected'));
    expect(Object.keys(result.current.decisions)).toHaveLength(2);
    act(() => result.current.reset());
    expect(result.current.decisions).toEqual({});
  });

  it('G5c-3: reset closes an open drawer', async () => {
    await freshApp();
    await switchSession('B');
    fireEvent.click(await screen.findByTestId('blocker-blk_layer3_mapped_values'));
    fireEvent.click(screen.getByTestId('open-drawer-blk_layer3_mapped_values'));
    expect(await screen.findByTestId('remediation-drawer')).toBeTruthy();

    fireEvent.click(screen.getByTestId('reset-demo'));
    await screen.findAllByTestId('capability-card');
    expect(screen.queryByTestId('remediation-drawer')).toBeNull();
  });

  it('G5c-4: the A->B->C->B arc renders identically before and after a reset', async () => {
    const { container } = await freshApp();
    const arc: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C', 'B'];

    const run = async () => {
      const snapshots: string[] = [];
      for (const session of arc) {
        await switchSession(session);
        snapshots.push(container.innerHTML);
      }
      return snapshots;
    };

    const firstRun = await run();
    fireEvent.click(screen.getByTestId('reset-demo'));
    await screen.findAllByTestId('capability-card');
    const secondRun = await run();

    expect(secondRun).toHaveLength(firstRun.length);
    firstRun.forEach((snapshot, step) => {
      expect(secondRun[step]).toBe(snapshot);
    });
  });

  it('G5c-5: fresh load and reset-after-dirty land on the same session, view, and signpost', async () => {
    const observed = () => ({
      sessionA: screen.getByTestId('session-A').getAttribute('aria-pressed'),
      viewUseCase: screen.getByTestId('view-use_case').getAttribute('aria-pressed'),
      signpost: screen.getByTestId('session-signpost').textContent,
    });

    await freshApp();
    const fresh = observed();
    cleanup();

    await freshApp();
    await switchSession('C');
    fireEvent.click(screen.getByTestId('view-pipeline'));
    await screen.findByText(PIPELINE_CAPTION);
    fireEvent.click(screen.getByTestId('reset-demo'));
    await screen.findAllByTestId('capability-card');
    const afterReset = observed();

    expect(afterReset).toEqual(fresh);
    expect(fresh.sessionA).toBe('true');
    expect(fresh.viewUseCase).toBe('true');
    expect(fresh.signpost).toBe(SIGNPOST_A);
  });
});
