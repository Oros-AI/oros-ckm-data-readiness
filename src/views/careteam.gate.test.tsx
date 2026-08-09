/** @vitest-environment jsdom */
// Care Team View gate (demo-align Task 4 C4). Expected header counts
// derive from the tiles' patientCounts; row content is fixture-equal
// via the provider, never by importing JSON.

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../App';
import { getReadinessData } from '../data/provider';

afterEach(cleanup);

type Session = 'A' | 'B' | 'C';

async function openCareTeam(session: Session) {
  render(<App />);
  fireEvent.click(screen.getByTestId(`session-${session}`));
  fireEvent.click(screen.getByTestId('view-care_team'));
  return screen.findByTestId('care-team-view');
}

describe('care team view gate - Task 4 (CT-1..CT-6)', () => {
  it('CT-1: third view toggle labeled Care Team View; lead view unchanged; banner stays visible', async () => {
    render(<App />);
    // Fresh load still lands on the capabilities view.
    expect(await screen.findByTestId('use-case-view')).toBeTruthy();
    const toggles = ['view-use_case', 'view-pipeline', 'view-care_team'].map((id) =>
      screen.getByTestId(id),
    );
    expect(toggles[2].textContent).toBe('Care Team View');
    fireEvent.click(toggles[2]);
    expect(await screen.findByTestId('care-team-view')).toBeTruthy();
    expect(screen.queryByTestId('use-case-view')).toBeNull();
    // The persistent session banner remains visible in this view.
    expect(screen.getByTestId('session-banner')).toBeTruthy();
  });

  it('CT-2: diabetes is the default use case; header counts per session', async () => {
    const expected: Record<Session, string> = {
      A: '36 of 36 patients ready for this workflow',
      B: '30 of 36 patients ready for this workflow',
      C: '33 of 36 patients ready for this workflow',
    };
    for (const session of ['A', 'B', 'C'] as Session[]) {
      await openCareTeam(session);
      expect(
        screen
          .getByTestId('care-team-usecase-diabetes_risk_stratification')
          .getAttribute('aria-pressed'),
      ).toBe('true');
      expect(screen.getByTestId('care-team-header').textContent).toBe(expected[session]);
      cleanup();
    }
  });

  it('CT-3: persistent illustrative composite label', async () => {
    await openCareTeam('B');
    expect(screen.getByTestId('illustrative-composite').textContent).toBe('illustrative composite');
  });

  it('CT-4: B diabetes rows - 36 rows; non-READY rows carry fixture blockedReasons; READY rows none', async () => {
    const data = await getReadinessData('B');
    const fixtureRows = (data.patientRows ?? []).filter(
      (r) => r.useCaseName === 'diabetes_risk_stratification',
    );
    expect(fixtureRows).toHaveLength(36);

    await openCareTeam('B');
    const list = screen.getByTestId('care-team-rows');
    expect(list.querySelectorAll('[data-testid^="care-team-row-"]')).toHaveLength(36);

    for (const fixtureRow of fixtureRows) {
      const rendered = screen.getByTestId(`care-team-row-${fixtureRow.patientId}`);
      expect(rendered.getAttribute('data-status')).toBe(fixtureRow.overallStatus);
      if (fixtureRow.overallStatus === 'READY') {
        expect(
          within(rendered).queryByTestId(`care-team-reasons-${fixtureRow.patientId}`),
        ).toBeNull();
      } else {
        expect(
          within(rendered).getByTestId(`care-team-reasons-${fixtureRow.patientId}`).textContent,
        ).toBe((fixtureRow.blockedReasons ?? []).join(', '));
      }
    }
  });

  it('CT-5: row content is status and reasons only', async () => {
    const data = await getReadinessData('B');
    const partial = (data.patientRows ?? []).find(
      (r) => r.useCaseName === 'diabetes_risk_stratification' && r.overallStatus !== 'READY',
    );
    expect(partial).toBeDefined();
    if (!partial) return;

    await openCareTeam('B');
    const rendered = screen.getByTestId(`care-team-row-${partial.patientId}`);
    // The row renders exactly patient id + status + reasons: no fitness
    // scores, no pathway ids, no check scores, nothing else.
    expect(rendered.textContent).toBe(
      `${partial.patientId}${partial.overallStatus}${(partial.blockedReasons ?? []).join(', ')}`,
    );
  });

  it('CT-6: use-case selection works and resets to diabetes on session switch', async () => {
    await openCareTeam('B');
    fireEvent.click(screen.getByTestId('care-team-usecase-vbc_reporting'));
    expect(screen.getByTestId('care-team-header').textContent).toBe(
      '40 of 49 patients ready for this workflow',
    );
    // Session switch resets the selector to the default use case.
    fireEvent.click(screen.getByTestId('session-C'));
    await screen.findByTestId('care-team-rows');
    expect(
      screen
        .getByTestId('care-team-usecase-diabetes_risk_stratification')
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(screen.getByTestId('care-team-header').textContent).toBe(
      '33 of 36 patients ready for this workflow',
    );
  });
});
