/** @vitest-environment jsdom */
// Increment 3b gate (G3b-1..G3b-8; G3b-9 is grep evidence in the gate
// script). Locked against the committed fixtures and the scripted
// recommendation seam: expected recommendation content is read through
// getRecommendation, never duplicated here. A failure means the drawer,
// the state, or the data drifted; not that the test needs adjusting.

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
import App from '../../App';
import { getReadinessData } from '../../data/provider';
import { getRecommendation } from '../../recommendations/getRecommendation';
import { keyDecision, useDemoState } from '../../state/demoState';

afterEach(cleanup);

type Session = 'A' | 'B' | 'C';

async function openApp(session: Session) {
  render(<App />);
  fireEvent.click(screen.getByTestId(`session-${session}`));
  await screen.findAllByTestId('capability-card');
}

async function switchSession(session: Session) {
  fireEvent.click(screen.getByTestId(`session-${session}`));
  await screen.findAllByTestId('capability-card');
}

// Expand the blocker row, click its four-facts affordance, await the drawer.
async function openDrawerFor(blockerId: string) {
  fireEvent.click(await screen.findByTestId(`blocker-${blockerId}`));
  fireEvent.click(screen.getByTestId(`open-drawer-${blockerId}`));
  return screen.findByTestId('remediation-drawer');
}

async function fixtureBlocker(session: Session, blockerId: string) {
  const data = await getReadinessData(session);
  const blocker = data.blockers.find((b) => b.blockerId === blockerId);
  expect(blocker).toBeDefined();
  return blocker!;
}

describe('remediation drawer gate - Increment 3b (G3b-1..G3b-8)', () => {
  it("G3b-1: B care_coordination blocker's panel opens the drawer with that recommendation", async () => {
    const blocker = await fixtureBlocker('B', 'blk_layer3_mapped_values');
    const rec = await getRecommendation(blocker);
    await openApp('B');
    const drawer = await openDrawerFor(blocker.blockerId);
    const q = within(drawer);
    expect(await q.findByText(rec.remediationPlainLanguage)).toBeTruthy();
    expect(q.getByText(blocker.checkName)).toBeTruthy();
    expect(q.getByText(blocker.capabilityBlocked)).toBeTruthy();
    expect(q.getByText(rec.rationale)).toBeTruthy();
    expect(q.getByText(blocker.responsibleRole)).toBeTruthy();
    expect(q.getByText(blocker.phenotype)).toBeTruthy();
  });

  it('G3b-2: ai body renders proposedValue + Approve/Reject; route body renders role + action, no buttons', async () => {
    const blockerB = await fixtureBlocker('B', 'blk_layer5_date_concordance');
    const recB = await getRecommendation(blockerB);
    expect(recB.recommendationType).toBe('ai_suggested_fix');
    await openApp('B');
    const drawerB = await openDrawerFor('blk_layer5_date_concordance');
    const qB = within(drawerB);
    expect(await qB.findByText(recB.proposedAction!.proposedValue!)).toBeTruthy();
    expect(qB.getByRole('button', { name: 'Approve' })).toBeTruthy();
    expect(qB.getByRole('button', { name: 'Reject' })).toBeTruthy();
    cleanup();

    const blockerC = await fixtureBlocker('C', 'blk_layer5_date_concordance');
    const recC = await getRecommendation(blockerC);
    expect(recC.recommendationType).toBe('route_to_stakeholder');
    await openApp('C');
    const drawerC = await openDrawerFor('blk_layer5_date_concordance');
    const qC = within(drawerC);
    expect(await qC.findByText(recC.remediationPlainLanguage)).toBeTruthy();
    expect(
      qC.getByText(`Routed as a work item to ${blockerC.responsibleRole}.`),
    ).toBeTruthy();
    expect(qC.queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(qC.queryByRole('button', { name: 'Reject' })).toBeNull();
  });

  it('G3b-3: approve/reject record session-keyed decisions; confirmation + row marker render', async () => {
    // State grain: decide() writes the `${session}:${recommendationId}` key.
    const { result } = renderHook(() => useDemoState());
    expect(result.current.session).toBe('A');
    act(() => result.current.decide('rec_layer3_mapped_values', 'approved'));
    expect(result.current.decisions[keyDecision('A', 'rec_layer3_mapped_values')]).toBe(
      'approved',
    );

    // UI grain: approve.
    await openApp('B');
    let drawer = await openDrawerFor('blk_layer3_mapped_values');
    fireEvent.click(await within(drawer).findByRole('button', { name: 'Approve' }));
    const approvedText = (await within(drawer).findByTestId('decision-confirmation'))
      .textContent;
    expect(approvedText).toContain('Approved');
    expect(approvedText).toContain('for review');
    expect(approvedText).not.toContain('fixed');
    expect(
      screen.getByTestId('decided-marker-blk_layer3_mapped_values').textContent,
    ).toContain('approved');
    cleanup();

    // UI grain: reject.
    await openApp('B');
    drawer = await openDrawerFor('blk_layer3_mapped_values');
    fireEvent.click(await within(drawer).findByRole('button', { name: 'Reject' }));
    expect(
      (await within(drawer).findByTestId('decision-confirmation')).textContent,
    ).toContain('No action recorded');
    expect(
      screen.getByTestId('decided-marker-blk_layer3_mapped_values').textContent,
    ).toContain('rejected');
  });

  it("G3b-4: the card's readiness chip is identical before and after a decision", async () => {
    await openApp('B');
    const card = screen
      .getAllByTestId('capability-card')
      .find((c) => c.getAttribute('data-usecase') === 'care_coordination')!;
    const before = within(card).getByTestId('readiness-chip').textContent;
    expect(before).toBe('PARTIALLY_READY');

    const drawer = await openDrawerFor('blk_layer3_mapped_values');
    fireEvent.click(await within(drawer).findByRole('button', { name: 'Approve' }));
    await within(drawer).findByTestId('decision-confirmation');

    const after = within(card).getByTestId('readiness-chip').textContent;
    expect(after).toBe(before);
  });

  it('G3b-5: a B decision does not render as decided on the C blocker with the same recommendationId', async () => {
    await openApp('B');
    const drawer = await openDrawerFor('blk_layer5_date_concordance');
    fireEvent.click(await within(drawer).findByRole('button', { name: 'Approve' }));
    await within(drawer).findByTestId('decision-confirmation');
    expect(
      screen.getByTestId('decided-marker-blk_layer5_date_concordance'),
    ).toBeTruthy();

    await switchSession('C');
    expect(screen.queryByTestId('decided-marker-blk_layer5_date_concordance')).toBeNull();
    const drawerC = await openDrawerFor('blk_layer5_date_concordance');
    await within(drawerC).findByTestId('routed-action');
    expect(within(drawerC).queryByTestId('decision-confirmation')).toBeNull();
  });

  it('G3b-6: switching session closes an open drawer', async () => {
    await openApp('B');
    await openDrawerFor('blk_layer3_mapped_values');
    fireEvent.click(screen.getByTestId('session-C'));
    expect(screen.queryByTestId('remediation-drawer')).toBeNull();
  });

  it("G3b-7: 'Demonstrated (stub)' renders in the drawer under AGENT_MODE 'scripted'", async () => {
    await openApp('B');
    const drawer = await openDrawerFor('blk_layer3_mapped_values');
    expect(within(drawer).getByText('Demonstrated (stub)')).toBeTruthy();
  });

  it('G3b-8: the two B care_coordination blocker rows are distinguishable by checkName secondary text', async () => {
    await openApp('B');
    const card = screen
      .getAllByTestId('capability-card')
      .find((c) => c.getAttribute('data-usecase') === 'care_coordination')!;
    const names = ['blk_layer2_value_standards', 'blk_layer3_mapped_values'].map(
      (id) => within(card).getByTestId(`blocker-checkname-${id}`).textContent,
    );
    expect(names).toEqual(['layer2_value_standards', 'layer3_mapped_values']);
    expect(names[0]).not.toBe(names[1]);
  });
});
