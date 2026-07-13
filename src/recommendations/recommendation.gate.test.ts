// src/recommendations/recommendation.gate.test.ts
// Increment 3a gate: the recommendation seam serves an authored body for
// every blocker in the committed B and C fixtures, with identity fields
// passed through verbatim, and throws rather than degrades on drift.
// Assertions are locked against the fixture reality (B 11 / C 6 blockers,
// the Bug 5 type flip); a failure here means the content map or the
// fixtures drifted, never that the test needs adjusting.

import { beforeAll, describe, expect, it } from 'vitest';
import type { Blocker, ReadinessData, Recommendation } from '../domain/types';
import { getReadinessData } from '../data/provider';
import { getRecommendation, getRecommendationFrom } from './getRecommendation';

let B: ReadinessData;
let C: ReadinessData;
let recsB: Recommendation[];
let recsC: Recommendation[];

beforeAll(async () => {
  [B, C] = await Promise.all([getReadinessData('B'), getReadinessData('C')]);
  recsB = await Promise.all(B.blockers.map((bl) => getRecommendation(bl)));
  recsC = await Promise.all(C.blockers.map((bl) => getRecommendation(bl)));
});

const allPairs = () => [
  ...B.blockers.map((bl, i) => ({ label: 'B' as const, blocker: bl, rec: recsB[i] })),
  ...C.blockers.map((bl, i) => ({ label: 'C' as const, blocker: bl, rec: recsC[i] })),
];

describe('recommendation gate - Increment 3a', () => {
  it('R1: resolves for every blocker in B and C (11 + 6 = 17)', () => {
    expect(recsB.length).toBe(11);
    expect(recsC.length).toBe(6);
    for (const { rec } of allPairs()) expect(rec).toBeDefined();
  });

  it('R2: identity fields are verbatim passthrough from the blocker', () => {
    for (const { blocker, rec } of allPairs()) {
      expect(rec.recommendationId).toBe(blocker.recommendationId);
      expect(rec.blockerId).toBe(blocker.blockerId);
      expect(rec.checkName).toBe(blocker.checkName);
      expect(rec.recommendationType).toBe(blocker.recommendationType);
      expect(rec.responsibleRole).toBe(blocker.responsibleRole);
      expect(rec.blockedCapability).toBe(blocker.capabilityBlocked);
    }
  });

  it('R3: authored body fields are non-empty for all 17', () => {
    for (const { rec } of allPairs()) {
      expect(rec.remediationPlainLanguage.length).toBeGreaterThan(0);
      expect(rec.rationale.length).toBeGreaterThan(0);
    }
  });

  it('R4: proposedAction non-null IFF ai_suggested_fix; shape when present', () => {
    for (const { blocker, rec } of allPairs()) {
      if (blocker.recommendationType === 'ai_suggested_fix') {
        expect(rec.proposedAction).not.toBeNull();
        expect(rec.proposedAction!.summary.length).toBeGreaterThan(0);
        expect(rec.proposedAction!.expectedOutcome.length).toBeGreaterThan(0);
        expect(rec.proposedAction!.targetCheckName).toBe(blocker.checkName);
      } else {
        expect(rec.proposedAction).toBeNull();
      }
    }
  });

  it('R5: confidence null and source scripted for all 17', () => {
    for (const { rec } of allPairs()) {
      expect(rec.confidence).toBeNull();
      expect(rec.source).toBe('scripted');
    }
  });

  it('R6: Bug 5 flip - both date checks serve the ai body in B and the route body in C, with different copy', () => {
    for (const checkName of ['layer5_date_concordance_a1c', 'layer5_date_concordance']) {
      const recB = recsB.find((r) => r.checkName === checkName);
      const recC = recsC.find((r) => r.checkName === checkName);
      expect(recB).toBeDefined();
      expect(recC).toBeDefined();
      expect(recB!.recommendationType).toBe('ai_suggested_fix');
      expect(recB!.proposedAction).not.toBeNull();
      expect(recC!.recommendationType).toBe('route_to_stakeholder');
      expect(recC!.proposedAction).toBeNull();
      expect(recB!.remediationPlainLanguage).not.toBe(recC!.remediationPlainLanguage);
    }
  });

  it("R7: live branch rejects with 'designed, not built'", async () => {
    await expect(getRecommendationFrom('live', B.blockers[0])).rejects.toThrow(
      /designed, not built/,
    );
  });

  it('R8: unknown checkName rejects with the named error', async () => {
    const drifted: Blocker = { ...B.blockers[0], checkName: 'no_such_check' };
    await expect(getRecommendation(drifted)).rejects.toThrow(/UnknownScriptedCheckError|No scripted recommendation entry/);
    await expect(getRecommendation(drifted)).rejects.toThrow(/no_such_check/);
  });

  it('R9: recommendationType contradicting the map entry rejects with the named error', async () => {
    const layer3 = B.blockers.find((bl) => bl.checkName === 'layer3_mapped_values')!;
    const drifted: Blocker = { ...layer3, recommendationType: 'route_to_stakeholder' };
    await expect(getRecommendation(drifted)).rejects.toThrow(
      /drifted from the content map/,
    );
    await expect(getRecommendation(drifted)).rejects.toThrow(/layer3_mapped_values/);
  });
});
