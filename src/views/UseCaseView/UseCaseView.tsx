// src/views/UseCaseView/UseCaseView.tsx
// The use-case front door (spec §2.1): population-level capability cards
// rendered from the provider's ReadinessData — list-driven, no hard-coded
// use cases or outcomes. Data flows ONLY through getReadinessData;
// patientRows are never consumed here (front door stays population-level,
// spec §7.2).

import { useEffect, useState } from 'react';
import type { ReadinessData } from '../../domain/types';
import { getReadinessData } from '../../data/provider';
import type { SessionId } from '../../state/demoState';
import { tokens } from '../../theme/tokens';
import { CapabilityCard } from './CapabilityCard';
import { CriteriaCard } from '../shared/CriteriaCard';

interface UseCaseViewProps {
  session: SessionId;
  expandedBlockerId: string | null;
  onToggleBlocker: (blockerId: string) => void;
}

export function UseCaseView({ session, expandedBlockerId, onToggleBlocker }: UseCaseViewProps) {
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

  if (!data) {
    return <p style={{ color: tokens.neutral.gray }}>Loading readiness data…</p>;
  }

  const blockersById = new Map(data.blockers.map((b) => [b.blockerId, b]));
  // The 'all' sentinel criterion (site display band) renders once at view
  // level, never on a card (spec revision entry (b)).
  const siteBandCriteria = data.criteria.filter((c) => c.appliesToUseCase === 'all');

  return (
    <section data-testid="use-case-view">
      {data.useCases.map((useCase) => (
        <CapabilityCard
          key={useCase.useCaseName}
          useCase={useCase}
          blockers={useCase.blockerIds.flatMap((id) => {
            const blocker = blockersById.get(id);
            return blocker ? [blocker] : [];
          })}
          criteria={data.criteria.filter((c) => c.appliesToUseCase === useCase.useCaseName)}
          expandedBlockerId={expandedBlockerId}
          onToggleBlocker={onToggleBlocker}
        />
      ))}

      {siteBandCriteria.length > 0 && (
        <aside data-testid="site-band-criterion" style={{ marginTop: '0.5rem' }}>
          <h3 style={{ margin: '0 0 0.35rem', fontSize: '0.8rem', color: tokens.neutral.gray }}>
            How the site-level readiness label above is derived
          </h3>
          <div style={{ display: 'grid', gap: '0.4rem' }}>
            {siteBandCriteria.map((criterion) => (
              <CriteriaCard key={criterion.criterionId} criterion={criterion} />
            ))}
          </div>
        </aside>
      )}
    </section>
  );
}
