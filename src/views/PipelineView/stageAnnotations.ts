// src/views/PipelineView/stageAnnotations.ts
// View-layer presentational annotation map (ratified D-A/D-B, 2026-07-13):
// keyed by stageId. The fixture carries no annotation field and must not
// gain one; an unknown stageId renders unannotated, never an error. This
// is the ONLY rendering-path file allowed to carry stageId string
// literals (tests excepted).

import { AGENT_MODE } from '../../config/DemoConfig';
import type { ImplementationState } from '../../domain/types';

export type StageAnnotation =
  | { kind: 'ai_assist'; state: ImplementationState }
  | { kind: 'deterministic_core' };

const ANNOTATIONS: Record<string, StageAnnotation> = {
  normalize: { kind: 'ai_assist', state: 'architectural' },
  remediate: {
    kind: 'ai_assist',
    state: AGENT_MODE === 'scripted' ? 'demonstrated_stub' : 'implemented',
  },
  score: { kind: 'deterministic_core' },
};

export function getStageAnnotation(stageId: string): StageAnnotation | null {
  return ANNOTATIONS[stageId] ?? null;
}
