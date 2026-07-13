// src/views/PipelineView/PipelineView.tsx
// The under-the-hood pipeline view (Demo UI/UX Spec §2.2): pre-computed
// engine results presented stage by stage. Data enters ONLY via
// getReadinessData; stage set, order, labels, and statuses all come from
// the fixture's pipeline[] (rendering components carry zero stage-name
// literals; the annotation map owns those). Renders nothing while data
// resolves. Not wired into App at inc4-a; the gate test mounts it.

import { useEffect, useState } from 'react';
import type { ReadinessData } from '../../domain/types';
import { getReadinessData } from '../../data/provider';
import type { SessionId } from '../../state/demoState';
import { tokens } from '../../theme/tokens';
import { StageArc } from './StageArc';
import { ChecksPanel } from './ChecksPanel';

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
      <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: tokens.neutral.gray }}>
        Pre-computed results from the scoring engine, presented stage by stage.
      </p>
      <StageArc stages={data.pipeline} />
      {stagesWithRows.map((stage) => (
        <ChecksPanel key={stage.stageId} stage={stage} />
      ))}
    </section>
  );
}
