// src/views/UseCaseView/UseCaseView.tsx
// The use-case front door (spec §2.1): population-level capability cards
// rendered from the provider's ReadinessData — list-driven, no hard-coded
// use cases or outcomes. Data flows ONLY through getReadinessData;
// patientRows are never consumed here (front door stays population-level,
// spec §7.2).

import { useEffect, useState } from 'react';
import type { ReadinessData } from '../../domain/types';
import { getReadinessData } from '../../data/provider';
import type { Decision, SessionId } from '../../state/demoState';
import { tokens } from '../../theme/tokens';
import { CapabilityCard } from './CapabilityCard';
import { CriteriaCard } from '../shared/CriteriaCard';
import { orderUseCases, WORKED_EXAMPLE_USE_CASE } from './useCaseOrder';

// Session C carries this header line in the capabilities view, visible
// without interaction (demo-align Item 4). Copy is LOCKED verbatim.
const SESSION_C_HEADER_LINE =
  'What remains open is real work - this screen is the work list.';

interface UseCaseViewProps {
  session: SessionId;
  expandedBlockerId: string | null;
  onToggleBlocker: (blockerId: string) => void;
  decisions: Record<string, Decision>;
  onOpenDrawer: (blockerId: string) => void;
}

export function UseCaseView({
  session,
  expandedBlockerId,
  onToggleBlocker,
  decisions,
  onOpenDrawer,
}: UseCaseViewProps) {
  const [data, setData] = useState<ReadinessData | null>(null);
  // Site-band derivation box is collapsed by default (demo-align R1),
  // same treatment as configured criteria; re-collapses on session
  // switch. Content inside is unchanged.
  const [showSiteBand, setShowSiteBand] = useState(false);

  useEffect(() => {
    let alive = true;
    setData(null);
    setShowSiteBand(false);
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
      {session === 'C' && (
        <p
          data-testid="session-c-header-line"
          style={{
            margin: '0 0 1rem',
            fontSize: '0.95rem',
            fontWeight: 600,
            color: tokens.brand.ink,
          }}
        >
          {SESSION_C_HEADER_LINE}
        </p>
      )}
      {orderUseCases(data.useCases).map((useCase) => (
        <CapabilityCard
          key={useCase.useCaseName}
          useCase={useCase}
          workedExample={useCase.useCaseName === WORKED_EXAMPLE_USE_CASE}
          blockers={useCase.blockerIds.flatMap((id) => {
            const blocker = blockersById.get(id);
            return blocker ? [blocker] : [];
          })}
          criteria={data.criteria.filter((c) => c.appliesToUseCase === useCase.useCaseName)}
          expandedBlockerId={expandedBlockerId}
          onToggleBlocker={onToggleBlocker}
          session={session}
          decisions={decisions}
          onOpenDrawer={onOpenDrawer}
        />
      ))}

      {siteBandCriteria.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          <button
            type="button"
            data-testid="toggle-site-band"
            aria-expanded={showSiteBand}
            onClick={() => setShowSiteBand((current) => !current)}
            style={{
              border: `1px solid ${tokens.neutral.border}`,
              backgroundColor: tokens.neutral.surface,
              color: tokens.brand.ink,
              borderRadius: '4px',
              padding: '0.25rem 0.7rem',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            {showSiteBand ? 'Hide site-level label derivation' : 'Show site-level label derivation'}
          </button>
          {showSiteBand && (
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
        </div>
      )}
    </section>
  );
}
