// src/views/UseCaseView/CapabilityCard.tsx
// One front-door capability card, rendered from a UseCaseSummary (spec
// §2.1, §7.2). Population grain only: no fitness number (fitnessScore is
// null by design at this level) and nothing pathway-related (the fixture
// carries null; mechanical pathway ids are never rendered raw).

import type { Blocker, ConfiguredCriterion, UseCaseSummary } from '../../domain/types';
import { tokens } from '../../theme/tokens';
import { ReadinessChip } from '../shared/ReadinessChip';
import { ImplementationBadge } from '../shared/ImplementationBadge';
import { FourFactsPanel } from '../shared/FourFactsPanel';
import { CriteriaCard } from '../shared/CriteriaCard';

interface CapabilityCardProps {
  useCase: UseCaseSummary;
  blockers: Blocker[]; // this card's blockerIds, resolved by the view
  criteria: ConfiguredCriterion[]; // criteria applying to exactly this use case
  expandedBlockerId: string | null;
  onToggleBlocker: (blockerId: string) => void;
}

export function CapabilityCard({
  useCase,
  blockers,
  criteria,
  expandedBlockerId,
  onToggleBlocker,
}: CapabilityCardProps) {
  return (
    <article
      data-testid="capability-card"
      data-usecase={useCase.useCaseName}
      style={{
        border: `1px solid ${tokens.neutral.border}`,
        backgroundColor: tokens.neutral.surface,
        borderRadius: '8px',
        padding: '1rem 1.25rem',
        marginBottom: '1rem',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', color: tokens.brand.ink }}>
          {useCase.displayName}
        </h2>
        <ImplementationBadge state={useCase.implementationState} />
        <ReadinessChip status={useCase.overallStatus} />
      </header>

      <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: tokens.neutral.gray }}>
        Patients: <span data-testid="count-ready">{useCase.patientCounts.ready}</span> ready ·{' '}
        <span data-testid="count-partially-ready">{useCase.patientCounts.partiallyReady}</span>{' '}
        partially ready ·{' '}
        <span data-testid="count-not-ready">{useCase.patientCounts.notReady}</span> not ready
      </p>

      {blockers.length > 0 && (
        <section data-testid="blockers-section" style={{ marginTop: '0.75rem' }}>
          <h3 style={{ margin: '0 0 0.35rem', fontSize: '0.8rem', color: tokens.neutral.gray }}>
            Blockers
          </h3>
          {blockers.map((blocker) => (
            <div key={blocker.blockerId}>
              <button
                type="button"
                data-testid={`blocker-${blocker.blockerId}`}
                aria-expanded={expandedBlockerId === blocker.blockerId}
                onClick={() => onToggleBlocker(blocker.blockerId)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  border: `1px solid ${tokens.neutral.border}`,
                  backgroundColor: tokens.neutral.light,
                  color: tokens.brand.ink,
                  borderRadius: '4px',
                  padding: '0.35rem 0.6rem',
                  marginBottom: '0.3rem',
                  cursor: 'pointer',
                }}
              >
                {blocker.phenotype}
              </button>
              {expandedBlockerId === blocker.blockerId && <FourFactsPanel blocker={blocker} />}
            </div>
          ))}
        </section>
      )}

      {criteria.length > 0 && (
        <section data-testid="criteria-section" style={{ marginTop: '0.75rem' }}>
          <h3 style={{ margin: '0 0 0.35rem', fontSize: '0.8rem', color: tokens.neutral.gray }}>
            Configured criteria
          </h3>
          <div style={{ display: 'grid', gap: '0.4rem' }}>
            {criteria.map((criterion) => (
              <CriteriaCard key={criterion.criterionId} criterion={criterion} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
