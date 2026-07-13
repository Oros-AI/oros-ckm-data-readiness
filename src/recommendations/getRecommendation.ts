// src/recommendations/getRecommendation.ts
// The recommendation seam (Demo UI/UX Spec §10): one function, two modes,
// selected by AGENT_MODE (src/config/DemoConfig.ts). Mirrors the
// data-provider abstraction (src/data/provider.ts): the UI calls
// getRecommendation and never knows the mode; the live seam is
// deliberately the flag + this dispatch, with no live module in v0.1.
//
// Identity fields are passthrough from the Blocker verbatim, never
// re-derived; only the authored body comes from the scripted map.

import type { Blocker, Recommendation } from '../domain/types';
import { AGENT_MODE } from '../config/DemoConfig';
import { selectScriptedBody } from './scripted';

export async function getRecommendation(blocker: Blocker): Promise<Recommendation> {
  return getRecommendationFrom(AGENT_MODE, blocker);
}

// Exists so the gate can exercise the live branch without mocking the
// config module (Increment 1 precedent: getReadinessDataFrom).
export async function getRecommendationFrom(
  mode: 'live' | 'scripted',
  blocker: Blocker,
): Promise<Recommendation> {
  if (mode === 'live') {
    throw new Error(
      "AGENT_MODE='live' is designed, not built, in v0.1: scripted is the demo mode with automatic fallback (Demo UI/UX Spec §10)",
    );
  }
  const body = selectScriptedBody(blocker);
  return {
    recommendationId: blocker.recommendationId,
    blockerId: blocker.blockerId,
    checkName: blocker.checkName,
    recommendationType: blocker.recommendationType,
    blockedCapability: blocker.capabilityBlocked,
    responsibleRole: blocker.responsibleRole,
    remediationPlainLanguage: body.remediationPlainLanguage,
    rationale: body.rationale,
    confidence: null,
    source: 'scripted',
    proposedAction:
      blocker.recommendationType === 'ai_suggested_fix' ? body.proposedAction : null,
  };
}
