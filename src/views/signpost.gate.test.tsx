/** @vitest-environment jsdom */
// Increment 5b gate (G5b-1..G5b-3 rendered assertions; G5b-4/G5b-5 are
// grep evidence in the gate script). The signpost strings below are the
// locked approved copy; a mismatch means the authored surface drifted,
// never that the test needs adjusting.

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from '../App';

afterEach(cleanup);

const SIGNPOSTS = {
  A: 'Session A is the clean baseline. Every use case is ready.',
  B: 'Session B is the same population with deliberately seeded data defects. Each blocker shows what failed and where it routes.',
  C: 'Session C is after one remediation pass. Some defects are fixed. The rest remain visible and routed to the people who can fix them.',
} as const;

const PIPELINE_CAPTION =
  'Pre-computed results from the scoring engine, presented stage by stage.';

async function openApp() {
  render(<App />);
  await screen.findAllByTestId('capability-card');
}

const signpostText = () => screen.getByTestId('session-signpost').textContent;

describe('session signpost gate - Increment 5b (G5b-1..G5b-3)', () => {
  it('G5b-1: the approved string renders verbatim for each of A, B, C', async () => {
    await openApp();
    for (const session of ['A', 'B', 'C'] as const) {
      fireEvent.click(screen.getByTestId(`session-${session}`));
      expect(signpostText()).toBe(SIGNPOSTS[session]);
    }
  });

  it('G5b-2: the line updates when the session switches', async () => {
    await openApp();
    expect(signpostText()).toBe(SIGNPOSTS.A); // default session (A since inc5-c, D5)
    fireEvent.click(screen.getByTestId('session-C'));
    expect(signpostText()).toBe(SIGNPOSTS.C);
    fireEvent.click(screen.getByTestId('session-B'));
    expect(signpostText()).toBe(SIGNPOSTS.B);
  });

  it('G5b-3: present in both views; survives the view toggle', async () => {
    await openApp();
    expect(signpostText()).toBe(SIGNPOSTS.A);

    fireEvent.click(screen.getByTestId('view-pipeline'));
    await screen.findByText(PIPELINE_CAPTION);
    expect(signpostText()).toBe(SIGNPOSTS.A);

    fireEvent.click(screen.getByTestId('view-use_case'));
    await screen.findAllByTestId('capability-card');
    expect(signpostText()).toBe(SIGNPOSTS.A);
  });
});
