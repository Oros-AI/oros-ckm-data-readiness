// src/components/RemediationDrawer/RemediationDrawer.tsx
// The remediation recommendation drawer (Demo UI/UX Spec §10, §5 shell).
// Shell structure follows the old wizard drawer: fixed right-side panel
// with no backdrop (the page stays interactive), flex column with header,
// scrollable body, footer with the honesty label. All styling comes from
// theme tokens; no raw color literals, no dynamic class interpolation.
//
// Data flows only from getReadinessData (the blocker) and
// getRecommendation (the authored body): no side channels. The pending
// state is neutral; nothing implies live computation. Approve/Reject
// exist only for ai_suggested_fix recommendations; route_to_stakeholder
// renders the responsible role with action-required framing and no
// decision affordance. Mounted once in App; opened only from the
// four-facts panel affordance.

import { useEffect, useState } from 'react';
import type { Blocker, Recommendation } from '../../domain/types';
import { getReadinessData } from '../../data/provider';
import { getRecommendation } from '../../recommendations/getRecommendation';
import { AGENT_MODE } from '../../config/DemoConfig';
import { keyDecision } from '../../state/demoState';
import type { Decision, SessionId } from '../../state/demoState';
import { tokens } from '../../theme/tokens';
import { ImplementationBadge } from '../../views/shared/ImplementationBadge';

interface RemediationDrawerProps {
  session: SessionId;
  blockerId: string | null; // null = closed, nothing renders
  decisions: Record<string, Decision>;
  onDecide: (recommendationId: string, decision: Decision) => void;
  onClose: () => void;
}

const sectionHeaderStyle = {
  fontSize: '0.7rem',
  fontWeight: 600,
  letterSpacing: '0.06em',
  color: tokens.neutral.gray,
  margin: '0.9rem 0 0.15rem',
} as const;

const bodyTextStyle = { margin: 0, fontSize: '0.9rem' } as const;

export function RemediationDrawer(props: RemediationDrawerProps) {
  if (props.blockerId === null) return null;
  return <OpenDrawer {...props} blockerId={props.blockerId} />;
}

function OpenDrawer({
  session,
  blockerId,
  decisions,
  onDecide,
  onClose,
}: RemediationDrawerProps & { blockerId: string }) {
  const [blocker, setBlocker] = useState<Blocker | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);

  useEffect(() => {
    let alive = true;
    setBlocker(null);
    setRecommendation(null);
    getReadinessData(session)
      .then((data) => {
        if (!alive) return null;
        const found = data.blockers.find((b) => b.blockerId === blockerId) ?? null;
        setBlocker(found);
        return found ? getRecommendation(found) : null;
      })
      .then((rec) => {
        if (alive && rec) setRecommendation(rec);
      });
    return () => {
      alive = false;
    };
  }, [session, blockerId]);

  const decision = recommendation
    ? decisions[keyDecision(session, recommendation.recommendationId)]
    : undefined;

  return (
    <aside
      data-testid="remediation-drawer"
      aria-label="Remediation recommendation"
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        height: '100%',
        width: '24rem',
        backgroundColor: tokens.neutral.surface,
        borderLeft: `1px solid ${tokens.neutral.border}`,
        boxShadow: `-4px 0 16px ${tokens.neutral.border}`,
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          backgroundColor: tokens.brand.ink,
          color: tokens.neutral.light,
          padding: '0.9rem 1.25rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.6rem',
        }}
      >
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Remediation recommendation</h2>
          {blocker && (
            <>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
                {blocker.capabilityBlocked}
              </p>
              <p
                style={{
                  margin: '0.15rem 0 0',
                  fontSize: '0.7rem',
                  fontFamily: tokens.typography.mono.family,
                  opacity: 0.85,
                }}
              >
                {blocker.checkName}
              </p>
            </>
          )}
        </div>
        <button
          type="button"
          aria-label="Close drawer"
          onClick={onClose}
          style={{
            border: 'none',
            background: 'none',
            color: tokens.neutral.light,
            fontSize: '1.1rem',
            lineHeight: 1,
            cursor: 'pointer',
            padding: '0.15rem',
          }}
        >
          ✕
        </button>
      </header>

      <div data-testid="drawer-body" style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
        {!(blocker && recommendation) && (
          <p style={{ margin: 0, color: tokens.neutral.gray }}>Loading recommendation…</p>
        )}

        {blocker && recommendation && (
          <>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              Phenotype: <strong>{blocker.phenotype}</strong> · Priority: {blocker.priority}
            </p>

            <p style={sectionHeaderStyle}>RECOMMENDED REMEDIATION</p>
            <p style={bodyTextStyle}>{recommendation.remediationPlainLanguage}</p>

            <p style={sectionHeaderStyle}>RATIONALE</p>
            <p style={bodyTextStyle}>{recommendation.rationale}</p>

            <p style={sectionHeaderStyle}>RESPONSIBLE ROLE</p>
            <p style={bodyTextStyle}>{recommendation.responsibleRole}</p>

            {recommendation.recommendationType === 'ai_suggested_fix' &&
              recommendation.proposedAction && (
                <section
                  data-testid="proposed-action"
                  style={{
                    border: `1px solid ${tokens.brand.green}`,
                    backgroundColor: tokens.brand.greenTint1,
                    borderRadius: '6px',
                    padding: '0.6rem 0.8rem',
                    marginTop: '1rem',
                  }}
                >
                  <p style={{ ...sectionHeaderStyle, margin: '0 0 0.15rem' }}>
                    SUGGESTED FIX, PENDING REVIEW
                  </p>
                  <p style={bodyTextStyle}>{recommendation.proposedAction.summary}</p>
                  {recommendation.proposedAction.proposedValue !== null && (
                    <p
                      style={{
                        margin: '0.4rem 0 0',
                        fontSize: '0.8rem',
                        fontFamily: tokens.typography.mono.family,
                      }}
                    >
                      {recommendation.proposedAction.proposedValue}
                    </p>
                  )}
                  <p style={{ ...bodyTextStyle, marginTop: '0.4rem' }}>
                    {recommendation.proposedAction.expectedOutcome}
                  </p>

                  {decision === undefined ? (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.7rem' }}>
                      <button
                        type="button"
                        onClick={() => onDecide(recommendation.recommendationId, 'approved')}
                        style={{
                          border: `1px solid ${tokens.brand.green}`,
                          backgroundColor: tokens.brand.green,
                          color: tokens.neutral.light,
                          borderRadius: '4px',
                          padding: '0.3rem 0.9rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => onDecide(recommendation.recommendationId, 'rejected')}
                        style={{
                          border: `1px solid ${tokens.neutral.border}`,
                          backgroundColor: tokens.neutral.surface,
                          color: tokens.brand.ink,
                          borderRadius: '4px',
                          padding: '0.3rem 0.9rem',
                          cursor: 'pointer',
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <p
                      data-testid="decision-confirmation"
                      style={{ ...bodyTextStyle, marginTop: '0.7rem', fontWeight: 600 }}
                    >
                      {decision === 'approved'
                        ? 'Approved. Routed as a versioned correction for review.'
                        : 'Rejected. No action recorded.'}
                    </p>
                  )}
                </section>
              )}

            {recommendation.recommendationType === 'route_to_stakeholder' && (
              <section data-testid="routed-action" style={{ marginTop: '1rem' }}>
                <p style={{ ...sectionHeaderStyle, margin: '0 0 0.15rem' }}>ACTION REQUIRED</p>
                <p style={bodyTextStyle}>
                  Routed as a work item to {recommendation.responsibleRole}.
                </p>
              </section>
            )}
          </>
        )}
      </div>

      <footer
        style={{
          borderTop: `1px solid ${tokens.neutral.border}`,
          padding: '0.6rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <span style={{ fontSize: '0.75rem', color: tokens.neutral.gray }}>
          Recommendation source
        </span>
        <ImplementationBadge state={AGENT_MODE === 'scripted' ? 'demonstrated_stub' : 'implemented'} />
      </footer>
    </aside>
  );
}
