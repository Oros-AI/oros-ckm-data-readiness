// src/views/UseCaseView/CapabilityCard.tsx
// One front-door capability card, rendered from a UseCaseSummary (spec
// §2.1, §7.2). Population grain only: no fitness number (fitnessScore is
// null by design at this level) and nothing pathway-related (the fixture
// carries null; mechanical pathway ids are never rendered raw).

import { useEffect, useState } from 'react';
import type { Blocker, ConfiguredCriterion, UseCaseSummary } from '../../domain/types';
import { keyDecision } from '../../state/demoState';
import type { Decision, SessionId } from '../../state/demoState';
import { tokens } from '../../theme/tokens';
import { ReadinessChip } from '../shared/ReadinessChip';
import { ImplementationBadge } from '../shared/ImplementationBadge';
import { FourFactsPanel } from '../shared/FourFactsPanel';
import { CriteriaCard } from '../shared/CriteriaCard';

interface CapabilityCardProps {
  useCase: UseCaseSummary;
  workedExample?: boolean; // tags the demo's worked-example tile (Item 5)
  blockers: Blocker[]; // this card's blockerIds, resolved by the view
  criteria: ConfiguredCriterion[]; // criteria applying to exactly this use case
  expandedBlockerId: string | null;
  onToggleBlocker: (blockerId: string) => void;
  session: SessionId; // scopes decision keys (a B decision is invisible in C)
  decisions: Record<string, Decision>;
  onOpenDrawer: (blockerId: string) => void;
}

export function CapabilityCard({
  useCase,
  workedExample = false,
  blockers,
  criteria,
  expandedBlockerId,
  onToggleBlocker,
  session,
  decisions,
  onOpenDrawer,
}: CapabilityCardProps) {
  // Configured criteria are collapsed by default (demo-align R1), same
  // pattern as the check-results toggle; collapsed state re-applies on
  // session switch. Content inside is unchanged.
  const [showCriteria, setShowCriteria] = useState(false);
  useEffect(() => {
    setShowCriteria(false);
  }, [session]);

  // Cohort denominator (demo-align Item 2): the three status counts
  // partition the use case's evaluated cohort, so Y in "X of Y" is
  // derived from the data already on the card (diabetes 36,
  // hypertension 35, care coordination 49, vbc reporting 49), never
  // hardcoded.
  const cohortSize =
    useCase.patientCounts.ready +
    useCase.patientCounts.partiallyReady +
    useCase.patientCounts.notReady;

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
        {workedExample && (
          <span
            data-testid="worked-example-tag"
            style={{
              border: `1px solid ${tokens.brand.green}`,
              backgroundColor: tokens.brand.greenTint2,
              color: tokens.brand.green,
              borderRadius: '4px',
              padding: '0.1rem 0.45rem',
              fontSize: '0.7rem',
              whiteSpace: 'nowrap',
            }}
          >
            worked example
          </span>
        )}
        <ImplementationBadge state={useCase.implementationState} />
        <ReadinessChip status={useCase.overallStatus} />
      </header>

      <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: tokens.neutral.gray }}>
        Patients: <span data-testid="count-ready">{useCase.patientCounts.ready}</span> of{' '}
        {cohortSize} ready ·{' '}
        <span data-testid="count-partially-ready">{useCase.patientCounts.partiallyReady}</span> of{' '}
        {cohortSize} partially ready ·{' '}
        <span data-testid="count-not-ready">{useCase.patientCounts.notReady}</span> of {cohortSize}{' '}
        not yet ready
      </p>

      {blockers.length > 0 && (
        <section data-testid="blockers-section" style={{ marginTop: '0.75rem' }}>
          <h3 style={{ margin: '0 0 0.35rem', fontSize: '0.8rem', color: tokens.neutral.gray }}>
            Blockers
          </h3>
          {blockers.map((blocker) => {
            const decision = decisions[keyDecision(session, blocker.recommendationId)];
            return (
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
                  <span
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      gap: '0.5rem',
                    }}
                  >
                    <span>{blocker.phenotype}</span>
                    {decision && (
                      <span
                        data-testid={`decided-marker-${blocker.blockerId}`}
                        style={{
                          border: `1px solid ${tokens.neutral.border}`,
                          backgroundColor: tokens.neutral.surface,
                          color: tokens.brand.ink,
                          borderRadius: '4px',
                          padding: '0.05rem 0.4rem',
                          fontSize: '0.7rem',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Decided: {decision}
                      </span>
                    )}
                  </span>
                  {/* Uniform secondary line: distinguishes rows sharing a
                      phenotype (e.g. Bug 4's two checks), list-driven. */}
                  <span
                    data-testid={`blocker-checkname-${blocker.blockerId}`}
                    style={{
                      display: 'block',
                      fontFamily: tokens.typography.mono.family,
                      fontSize: '0.7rem',
                      color: tokens.neutral.gray,
                      marginTop: '0.1rem',
                    }}
                  >
                    {blocker.checkName}
                  </span>
                </button>
                {expandedBlockerId === blocker.blockerId && (
                  <FourFactsPanel blocker={blocker} onOpenDrawer={onOpenDrawer} />
                )}
              </div>
            );
          })}
        </section>
      )}

      {criteria.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <button
            type="button"
            data-testid="toggle-criteria"
            aria-expanded={showCriteria}
            onClick={() => setShowCriteria((current) => !current)}
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
            {showCriteria ? 'Hide configured criteria' : 'Show configured criteria'}
          </button>
          {showCriteria && (
            <section data-testid="criteria-section" style={{ marginTop: '0.5rem' }}>
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
        </div>
      )}
    </article>
  );
}
