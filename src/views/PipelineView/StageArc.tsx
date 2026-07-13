// src/views/PipelineView/StageArc.tsx
// Horizontal stage arc: nodes with labels and connectors between (the
// legacy top-bar row PATTERN rebuilt on theme tokens; the legacy file is
// never imported, and its statusColors map, gradient, dynamic class
// interpolation, and numbered-circle treatment were not harvested).
// Stages render in fixture order, each arriving WITH its final status
// via a one-shot staggered CSS entrance; prefers-reduced-motion renders
// static. No spinners, no fills, no counters.

import { Fragment } from 'react';
import type { PipelineStageView } from '../../domain/types';
import { tokens } from '../../theme/tokens';
import { getStageAnnotation } from './stageAnnotations';
import { ImplementationBadge } from '../shared/ImplementationBadge';

// 'complete'/'attention' from the functional status group; 'pending'
// from the neutrals. Exhaustive: a new stage status is a compile error.
// Exported: the PipelineView status legend shares this exact mapping.
export function stageFill(status: PipelineStageView['status']): string {
  switch (status) {
    case 'complete':
      return tokens.status.ready;
    case 'attention':
      return tokens.status.partiallyReady;
    case 'pending':
      return tokens.neutral.border;
    default: {
      const exhaustive: never = status;
      throw new Error(`stageFill: unknown stage status ${String(exhaustive)}`);
    }
  }
}

const entranceCss = `
@keyframes pvStageIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  [data-pv-animated] { animation: none !important; }
}
`;

export function StageArc({ stages }: { stages: PipelineStageView[] }) {
  return (
    <div
      data-testid="pipeline-arc"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.3rem',
        flexWrap: 'nowrap',
        overflowX: 'auto',
        paddingBottom: '0.25rem',
      }}
    >
      <style>{entranceCss}</style>
      {stages.map((stage, index) => (
        <Fragment key={stage.stageId}>
          {index > 0 && (
            <span
              aria-hidden="true"
              style={{
                flex: '0 0 0.75rem',
                height: '2px',
                backgroundColor: tokens.neutral.border,
                marginTop: '0.35rem',
              }}
            />
          )}
          <StageNode stage={stage} index={index} />
        </Fragment>
      ))}
    </div>
  );
}

function StageNode({ stage, index }: { stage: PipelineStageView; index: number }) {
  const annotation = getStageAnnotation(stage.stageId);
  return (
    <div
      data-testid={`stage-${stage.stageId}`}
      data-status={stage.status}
      data-pv-animated=""
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.25rem',
        minWidth: '4.75rem',
        flex: '0 0 auto',
        textAlign: 'center',
        animation: 'pvStageIn 320ms ease-out both',
        animationDelay: `${index * 80}ms`,
      }}
    >
      <span
        aria-hidden="true"
        data-testid={`node-dot-${stage.stageId}`}
        style={{
          width: '0.75rem',
          height: '0.75rem',
          borderRadius: '999px',
          backgroundColor: stageFill(stage.status),
        }}
      />
      <span style={{ fontSize: '0.8rem', color: tokens.brand.ink }}>{stage.label}</span>

      {annotation?.kind === 'ai_assist' && (
        <span
          data-testid={`annotation-${stage.stageId}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.15rem',
            fontSize: '0.7rem',
            color: tokens.neutral.gray,
          }}
        >
          <span>AI-assist</span>
          <ImplementationBadge state={annotation.state} />
        </span>
      )}

      {annotation?.kind === 'deterministic_core' && (
        <span
          data-testid={`annotation-${stage.stageId}`}
          style={{
            border: `1px solid ${tokens.brand.ink}`,
            backgroundColor: tokens.neutral.surface,
            color: tokens.brand.ink,
            borderRadius: '4px',
            padding: '0.1rem 0.45rem',
            fontSize: '0.7rem',
            fontWeight: 600,
          }}
        >
          Deterministic core
          <span style={{ display: 'block', fontWeight: 400, color: tokens.neutral.gray }}>
            No AI in scoring.
          </span>
        </span>
      )}
    </div>
  );
}
