// src/views/PipelineView/PipelineView.tsx
// The under-the-hood pipeline view (Demo UI/UX Spec §2.2): pre-computed
// engine results presented stage by stage. Data enters ONLY via
// getReadinessData; stage set, order, labels, and statuses all come from
// the fixture's pipeline[] (rendering components carry zero stage-name
// literals; the annotation map owns those). Renders nothing while data
// resolves. Not wired into App at inc4-a; the gate test mounts it.

import { useEffect, useState } from 'react';
import type { PipelineStageView, ReadinessData } from '../../domain/types';
import { getReadinessData } from '../../data/provider';
import type { SessionId } from '../../state/demoState';
import { tokens } from '../../theme/tokens';
import { StageArc, stageFill } from './StageArc';
import { ChecksPanel } from './ChecksPanel';
import { getStageAnnotation, STRIP_FRAMING, STRIP_TITLE } from './stageAnnotations';
import { ImplementationBadge } from '../shared/ImplementationBadge';

// Legend entries reuse the stage nodes' exact status-to-token mapping
// (stageFill); color literals are never duplicated here.
const LEGEND: Array<{ status: PipelineStageView['status']; label: string }> = [
  { status: 'complete', label: 'Complete' },
  { status: 'attention', label: 'Needs attention' },
  { status: 'pending', label: 'Pending' },
];

function StatusLegend() {
  return (
    <ul
      data-testid="status-legend"
      style={{ display: 'flex', gap: '0.9rem', listStyle: 'none', margin: 0, padding: 0 }}
    >
      {LEGEND.map(({ status, label }) => (
        <li
          key={status}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontSize: '0.75rem',
            color: tokens.neutral.gray,
          }}
        >
          <span
            aria-hidden="true"
            data-testid={`legend-dot-${status}`}
            style={{
              width: '0.6rem',
              height: '0.6rem',
              borderRadius: '999px',
              backgroundColor: stageFill(status),
            }}
          />
          {label}
        </li>
      ))}
    </ul>
  );
}

// The assist strip (inc5-a): the second render slot over the
// annotations map. Renders the stages whose annotation kind is
// 'ai_strip', in fixture order; no entries means no strip. Exported so
// the gate can exercise the unknown-stageId slot behavior directly.
// All strings come from stageAnnotations (title, framing, labels) or
// the fixture (stage labels); the state word renders through the
// shared ImplementationBadge, never a hard-coded string.
export function AiAssistStrip({ stages }: { stages: PipelineStageView[] }) {
  const entries = stages.flatMap((stage) => {
    const annotation = getStageAnnotation(stage.stageId);
    return annotation && annotation.kind === 'ai_strip' ? [{ stage, annotation }] : [];
  });
  if (entries.length === 0) return null;

  return (
    <aside
      data-testid="ai-assist-strip"
      style={{
        borderTop: `1px solid ${tokens.neutral.border}`,
        marginTop: '0.9rem',
        paddingTop: '0.6rem',
        color: tokens.neutral.gray,
        fontSize: '0.75rem',
      }}
    >
      <h3 style={{ margin: '0 0 0.3rem', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.06em' }}>
        {STRIP_TITLE}
      </h3>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {entries.map(({ stage, annotation }) => (
          <li
            key={stage.stageId}
            data-testid={`strip-entry-${stage.stageId}`}
            style={{ margin: '0.15rem 0' }}
          >
            {stage.label}: {annotation.label} <ImplementationBadge state={annotation.state} />
          </li>
        ))}
      </ul>
      <p style={{ margin: '0.4rem 0 0' }}>{STRIP_FRAMING}</p>
    </aside>
  );
}

export function PipelineView({ session }: { session: SessionId }) {
  const [data, setData] = useState<ReadinessData | null>(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    getReadinessData(session).then((d) => {
      if (alive) setData(d);
    });
    return () => {
      alive = false;
    };
  }, [session]);

  if (!data) return null;

  const stagesWithRows = data.pipeline.filter((stage) => (stage.checkResults ?? []).length > 0);

  return (
    <section data-testid="pipeline-view">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: '1rem',
          flexWrap: 'wrap',
          margin: '0 0 1rem',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.9rem', color: tokens.neutral.gray }}>
          Pre-computed results from the scoring engine, presented stage by stage.
        </p>
        <StatusLegend />
      </div>
      <StageArc stages={data.pipeline} />
      <AiAssistStrip stages={data.pipeline} />
      {stagesWithRows.map((stage) => (
        <ChecksPanel key={stage.stageId} stage={stage} />
      ))}
    </section>
  );
}
