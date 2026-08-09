/** @vitest-environment jsdom */
// Increment 2 front-door gate (G2-7..G2-16). Expected values are
// planning-thread literals; fixture reads appear only where a lock states
// fixture-equality (displayNames, A counts, four-facts strings, pathway-id
// collection) — fetched through the provider, never by importing JSON.

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../App';
import { FourFactsPanel } from './shared/FourFactsPanel';
import { getReadinessData } from '../data/provider';
import type { ReadinessData } from '../domain/types';

afterEach(cleanup);

const SESSIONS = ['A', 'B', 'C'] as const;
type Session = (typeof SESSIONS)[number];

// Demo script order (demo-align Item 5): worked example first, then
// care coordination, vbc reporting, hypertension.
const CARD_ORDER = [
  'diabetes_risk_stratification',
  'care_coordination',
  'vbc_reporting',
  'hypertension_risk_stratification',
];

// Canonical blocker-id lists — literals duplicated from
// provider.gate.test.ts A7–A9 (locked; do not derive).
const B_CARD_BLOCKERS: Record<string, string[]> = {
  diabetes_risk_stratification: [
    'blk_device_derived_metric_consistency_cgm',
    'blk_device_patient_linkage_cgm',
    'blk_device_temporal_density_cgm_14d',
    'blk_fitness_recency_a1c',
    'blk_layer2_ranges_numeric_a1c',
    'blk_layer5_date_concordance_a1c',
  ],
  hypertension_risk_stratification: ['blk_layer1_notnull_fields_smoking'],
  care_coordination: ['blk_layer2_value_standards', 'blk_layer3_mapped_values'],
  vbc_reporting: ['blk_layer1_notnull_fields_encounters', 'blk_layer5_date_concordance'],
};
const C_CARD_BLOCKERS: Record<string, string[]> = {
  diabetes_risk_stratification: [
    'blk_device_patient_linkage_cgm',
    'blk_device_temporal_density_cgm_14d',
    'blk_fitness_recency_a1c',
    'blk_layer5_date_concordance_a1c',
  ],
  hypertension_risk_stratification: ['blk_layer1_notnull_fields_smoking'],
  care_coordination: [],
  vbc_reporting: ['blk_layer5_date_concordance'],
};
const A_CARD_BLOCKERS: Record<string, string[]> = {
  diabetes_risk_stratification: [],
  hypertension_risk_stratification: [],
  care_coordination: [],
  vbc_reporting: [],
};

async function openSession(session: Session) {
  render(<App />);
  fireEvent.click(screen.getByTestId(`session-${session}`));
  const cards = await screen.findAllByTestId('capability-card');
  expect(cards).toHaveLength(4);
  return screen.getAllByTestId('capability-card');
}

function cardBlockerIds(card: HTMLElement): string[] {
  return [...card.querySelectorAll('button[data-testid^="blocker-blk_"]')].map((el) =>
    (el.getAttribute('data-testid') ?? '').replace(/^blocker-/, ''),
  );
}

describe('front-door gate — Increment 2 (G2-7..G2-16)', () => {
  it('G2-7: 4 cards per session in locked DOM order, fixture displayNames', async () => {
    for (const session of SESSIONS) {
      const data = await getReadinessData(session);
      const cards = await openSession(session);
      expect(cards.map((c) => c.getAttribute('data-usecase'))).toEqual(CARD_ORDER);
      cards.forEach((card) => {
        const useCaseName = card.getAttribute('data-usecase') ?? '';
        const useCase = data.useCases.find((u) => u.useCaseName === useCaseName);
        expect(useCase).toBeDefined();
        expect(within(card).getByText(useCase!.displayName)).toBeTruthy();
      });
      cleanup();
    }
  });

  it('G2-8: implementation badges per state, three display strings', async () => {
    for (const session of SESSIONS) {
      const cards = await openSession(session);
      const badges = cards.map((c) => within(c).getByTestId('impl-badge').textContent);
      expect(badges).toEqual([
        'Implemented',
        'Demonstrated (stub)',
        'Demonstrated (stub)',
        'Demonstrated (stub)',
      ]);
      cleanup();
    }
  });

  it('G2-9: readiness chips per session in card order', async () => {
    const expected: Record<Session, string[]> = {
      A: ['READY', 'READY', 'READY', 'READY'],
      B: ['NOT_READY', 'PARTIALLY_READY', 'NOT_READY', 'NOT_READY'],
      C: ['PARTIALLY_READY', 'READY', 'PARTIALLY_READY', 'NOT_READY'],
    };
    for (const session of SESSIONS) {
      const cards = await openSession(session);
      const chips = cards.map((c) => within(c).getByTestId('readiness-chip').textContent);
      expect(chips).toEqual(expected[session]);
      cleanup();
    }
  });

  it('G2-10: patientCounts bands — B/C literals; A fixture-equal with zeros', async () => {
    const counts = (card: HTMLElement) => [
      Number(within(card).getByTestId('count-ready').textContent),
      Number(within(card).getByTestId('count-partially-ready').textContent),
      Number(within(card).getByTestId('count-not-ready').textContent),
    ];

    const bCards = await openSession('B');
    expect(bCards.map(counts)).toEqual([
      [30, 6, 0],
      [44, 0, 5],
      [40, 0, 9],
      [29, 0, 6],
    ]);
    cleanup();

    const cCards = await openSession('C');
    expect(cCards.map(counts)).toEqual([
      [33, 3, 0],
      [49, 0, 0],
      [46, 0, 3],
      [29, 0, 6],
    ]);
    cleanup();

    const aData = await getReadinessData('A');
    const aCards = await openSession('A');
    aCards.forEach((card) => {
      const useCaseName = card.getAttribute('data-usecase') ?? '';
      const useCase = aData.useCases.find((u) => u.useCaseName === useCaseName);
      expect(useCase).toBeDefined();
      const [ready, partiallyReady, notReady] = counts(card);
      expect(ready).toBe(useCase!.patientCounts.ready);
      expect(partiallyReady).toBe(useCase!.patientCounts.partiallyReady);
      expect(notReady).toBe(useCase!.patientCounts.notReady);
      expect(partiallyReady).toBe(0);
      expect(notReady).toBe(0);
    });
  });

  it('G2-11: blocker totals A 0 / B 11 / C 6; per-card sets equal the canonical lists', async () => {
    const perSession: Array<[Session, Record<string, string[]>, number]> = [
      ['A', A_CARD_BLOCKERS, 0],
      ['B', B_CARD_BLOCKERS, 11],
      ['C', C_CARD_BLOCKERS, 6],
    ];
    for (const [session, expected, total] of perSession) {
      const cards = await openSession(session);
      const all = cards.flatMap(cardBlockerIds);
      expect(all).toHaveLength(total);
      cards.forEach((card) => {
        const useCaseName = card.getAttribute('data-usecase') ?? '';
        expect(cardBlockerIds(card)).toEqual(expected[useCaseName]);
      });
      cleanup();
    }
  });

  it('G2-12: expanding B device_patient_linkage renders the four-facts panel verbatim', async () => {
    const data = await getReadinessData('B');
    const blocker = data.blockers.find((b) => b.blockerId === 'blk_device_patient_linkage_cgm');
    expect(blocker).toBeDefined();
    if (!blocker) return;

    const cards = await openSession('B');
    const diabetesCard = cards[0];
    fireEvent.click(within(diabetesCard).getByTestId('blocker-blk_device_patient_linkage_cgm'));

    const panel = within(diabetesCard).getByTestId('four-facts-panel');
    const q = within(panel);
    expect(q.getByText(blocker.whatFailed)).toBeTruthy();
    expect(q.getByText(blocker.capabilityBlocked)).toBeTruthy();
    expect(q.getByText(blocker.responsibleRole)).toBeTruthy();
    expect(q.getByText(blocker.whatUnlocks)).toBeTruthy();
    expect(q.getByText(blocker.phenotype)).toBeTruthy();
    const drawerButton = q.getByRole('button', { name: /Open remediation recommendation/ });
    // Enabled since Increment 3b (drawer wired); was disabled in Increment 2.
    expect((drawerButton as HTMLButtonElement).disabled).toBe(false);
  });

  it('G2-13: every B and C blocker (17) renders all four facts + phenotype', async () => {
    const blockers = [
      ...(await getReadinessData('B')).blockers,
      ...(await getReadinessData('C')).blockers,
    ];
    expect(blockers).toHaveLength(17);
    for (const blocker of blockers) {
      const { container, unmount } = render(<FourFactsPanel blocker={blocker} />);
      const q = within(container as HTMLElement);
      expect(q.getByText(blocker.whatFailed)).toBeTruthy();
      expect(q.getByText(blocker.capabilityBlocked)).toBeTruthy();
      expect(q.getByText(blocker.responsibleRole)).toBeTruthy();
      expect(q.getByText(blocker.whatUnlocks)).toBeTruthy();
      expect(q.getByText(blocker.phenotype)).toBeTruthy();
      unmount();
    }
  });

  it('G2-14: no per-patient leakage in any session, collapsed or expanded', async () => {
    for (const session of SESSIONS) {
      const cards = await openSession(session);
      const assertClean = () => {
        const text = document.body.textContent ?? '';
        expect(text).not.toMatch(/PAT\d{6}/);
        expect(text).not.toMatch(/fitness\s*[:=]?\s*\d/i);
      };
      assertClean();
      for (const card of cards) {
        for (const id of cardBlockerIds(card)) {
          fireEvent.click(within(card).getByTestId(`blocker-${id}`));
          assertClean();
          fireEvent.click(within(card).getByTestId(`blocker-${id}`));
        }
      }
      cleanup();
    }
  });

  it('G2-15: no mechanical pathway ids anywhere in rendered output', async () => {
    const pathwayIds = new Set<string>(['cgm_primary', 'a1c_fallback']);
    const fixtureData: ReadinessData[] = [];
    for (const session of SESSIONS) fixtureData.push(await getReadinessData(session));
    for (const data of fixtureData) {
      for (const row of data.patientRows ?? []) {
        if (row.activePathwayId !== null) pathwayIds.add(row.activePathwayId);
      }
    }
    for (const session of SESSIONS) {
      await openSession(session);
      const text = document.body.textContent ?? '';
      for (const id of pathwayIds) {
        expect(text).not.toContain(id);
      }
      cleanup();
    }
  });

  it('G2-16: diabetes card renders exactly the 5 criteria; stubs none; site band once at view level', async () => {
    const DIABETES_CRITERIA = [
      'cgm_temporal_density_floor',
      'tir_recompute_tolerance',
      'a1c_plausible_range',
      'a1c_recency_lookback',
      'diabetes_readiness_bands',
    ];
    const data = await getReadinessData('B');
    const cards = await openSession('B');
    const [diabetesCard, ...stubCards] = cards;

    // R1 (demo-align): both sections are collapsed by default behind
    // labeled toggles; expand before asserting the unchanged content.
    expect(within(diabetesCard).queryByTestId('criteria-section')).toBeNull();
    fireEvent.click(within(diabetesCard).getByTestId('toggle-criteria'));
    expect(screen.queryByTestId('site-band-criterion')).toBeNull();
    fireEvent.click(screen.getByTestId('toggle-site-band'));

    const rendered = [...diabetesCard.querySelectorAll('[data-testid^="criterion-"]')].map((el) =>
      (el.getAttribute('data-testid') ?? '').replace(/^criterion-/, ''),
    );
    expect(rendered.sort()).toEqual([...DIABETES_CRITERIA].sort());
    expect(rendered).not.toContain('site_display_band');
    for (const id of DIABETES_CRITERIA) {
      const criterion = data.criteria.find((c) => c.criterionId === id);
      expect(criterion).toBeDefined();
      if (!criterion) continue;
      const node = within(diabetesCard).getByTestId(`criterion-${id}`);
      const text = node.textContent ?? '';
      expect(text).toContain(criterion.label);
      expect(text).toContain(criterion.value);
      expect(text).toContain('Configured');
      expect(text).toContain(criterion.configVersion);
      expect(text).toContain(criterion.ownedBy);
      expect(text).toContain(criterion.tier);
    }

    for (const stub of stubCards) {
      // Stubs have no criteria, so no toggle and no section at all.
      expect(within(stub).queryByTestId('toggle-criteria')).toBeNull();
      expect(within(stub).queryByTestId('criteria-section')).toBeNull();
      expect(stub.querySelectorAll('[data-testid^="criterion-"]')).toHaveLength(0);
    }

    const siteBands = screen.getAllByTestId('site-band-criterion');
    expect(siteBands).toHaveLength(1);
    expect(within(siteBands[0]).getByTestId('criterion-site_display_band')).toBeTruthy();
    for (const card of cards) {
      expect(within(card).queryByTestId('criterion-site_display_band')).toBeNull();
    }
  });
});
