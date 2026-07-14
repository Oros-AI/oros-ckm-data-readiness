// src/views/PipelineView/stageAnnotations.ts
// View-layer presentational annotation map (ratified D-A/D-B 2026-07-13;
// restructured at inc5-a): keyed by stageId, ONE authored surface with
// TWO render slots. The arc renders 'arc_chip' annotations (exactly one
// exists: Score); the AI-assist strip below the arc renders 'ai_strip'
// annotations (Normalize, Remediate). All annotation literals live in
// this file; components interpolate and never carry their own copies.
// The fixture has no annotation field and must not gain one; an unknown
// stageId renders unannotated in both slots, never an error. This is
// the ONLY rendering-path file allowed to carry stageId string literals
// (tests excepted).

import { AGENT_MODE } from '../../config/DemoConfig';
import type { ImplementationState } from '../../domain/types';

export type StageAnnotation =
  | { kind: 'arc_chip'; label: string; secondary: string }
  | { kind: 'ai_strip'; label: string; state: ImplementationState };

export const STRIP_TITLE = 'Where AI assists in this pipeline';

export const STRIP_FRAMING =
  'The deterministic pipeline is the source of truth. AI assists at these two stages, a person approves every change, and scoring itself uses no AI.';

const ANNOTATIONS: Record<string, StageAnnotation> = {
  normalize: { kind: 'ai_strip', label: 'AI-assist', state: 'architectural' },
  remediate: {
    kind: 'ai_strip',
    label: 'AI-assist',
    state: AGENT_MODE === 'scripted' ? 'demonstrated_stub' : 'implemented',
  },
  score: { kind: 'arc_chip', label: 'Deterministic core', secondary: 'No AI in scoring.' },
};

export function getStageAnnotation(stageId: string): StageAnnotation | null {
  return ANNOTATIONS[stageId] ?? null;
}
