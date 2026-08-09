// src/views/CareTeamView/CareTeamView.tsx
// The Care Team View (demo-align Task 4): a workflow-facing patient
// list for one selected use case. Readiness status and blocked-reason
// strings ONLY: no risk scores, no clinical values, no check scores,
// nothing vendor-specific, nothing pathway-mechanical. Rows come from
// the session fixture's patientRows; blockedReasons are the locked
// exporter-derived strings, rendered verbatim. The persistent
// "illustrative composite" label keeps the synthetic nature of the
// panel on screen at all times.

import { useEffect, useState } from 'react';
import type { ReadinessData } from '../../domain/types';
import { getReadinessData } from '../../data/provider';
import type { SessionId } from '../../state/demoState';
import { tokens } from '../../theme/tokens';
import { orderUseCases, WORKED_EXAMPLE_USE_CASE } from '../UseCaseView/useCaseOrder';

export function CareTeamView({ session }: { session: SessionId }) {
  const [data, setData] = useState<ReadinessData | null>(null);
  // The selector resets to the default use case on session switch,
  // consistent with the collapsed-state resets elsewhere (Item 6, R1).
  const [selectedUseCase, setSelectedUseCase] = useState<string>(WORKED_EXAMPLE_USE_CASE);

  useEffect(() => {
    let alive = true;
    setData(null);
    setSelectedUseCase(WORKED_EXAMPLE_USE_CASE);
    getReadinessData(session).then((d) => {
      if (alive) setData(d);
    });
    return () => {
      alive = false;
    };
  }, [session]);

  if (!data) return null;

  const useCases = orderUseCases(data.useCases);
  const active = useCases.find((u) => u.useCaseName === selectedUseCase) ?? useCases[0];
  // Render-order comparator only (presentation rider): non-READY rows
  // first so the work list leads, stable by patient ID within each
  // group. No data changes.
  const rows = (data.patientRows ?? [])
    .filter((r) => r.useCaseName === active.useCaseName)
    .sort((a, b) => {
      const readyRank = (s: string) => (s === 'READY' ? 1 : 0);
      const rankDelta = readyRank(a.overallStatus) - readyRank(b.overallStatus);
      if (rankDelta !== 0) return rankDelta;
      return a.patientId < b.patientId ? -1 : a.patientId > b.patientId ? 1 : 0;
    });
  const total =
    active.patientCounts.ready + active.patientCounts.partiallyReady + active.patientCounts.notReady;
  const notYetReady = total - active.patientCounts.ready;

  return (
    <section data-testid="care-team-view">
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '0.75rem',
          flexWrap: 'wrap',
          marginBottom: '0.75rem',
        }}
      >
        <div role="group" aria-label="Use case" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {useCases.map((useCase) => (
            <button
              key={useCase.useCaseName}
              type="button"
              data-testid={`care-team-usecase-${useCase.useCaseName}`}
              aria-pressed={useCase.useCaseName === active.useCaseName}
              onClick={() => setSelectedUseCase(useCase.useCaseName)}
              style={{
                border: `1px solid ${useCase.useCaseName === active.useCaseName ? tokens.brand.green : tokens.neutral.border}`,
                backgroundColor:
                  useCase.useCaseName === active.useCaseName
                    ? tokens.brand.greenTint1
                    : tokens.neutral.surface,
                color: tokens.brand.ink,
                borderRadius: '4px',
                padding: '0.25rem 0.7rem',
                fontSize: '0.8rem',
                fontWeight: useCase.useCaseName === active.useCaseName ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {useCase.displayName}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: '0.75rem',
          flexWrap: 'wrap',
          margin: '0 0 0.2rem',
        }}
      >
        <h2
          data-testid="care-team-header"
          style={{ margin: 0, fontSize: '1.1rem', color: tokens.brand.ink }}
        >
          This workflow can serve {active.patientCounts.ready} of {total} patients today
        </h2>
        {/* Persistent honesty label: these are synthetic patients.
            Plain text, no chip treatment (disclaimer rider). */}
        <span
          data-testid="illustrative-composite"
          style={{
            color: tokens.neutral.gray,
            fontSize: '0.75rem',
            fontStyle: 'italic',
            whiteSpace: 'nowrap',
            marginLeft: 'auto',
          }}
        >
          illustrative composite
        </span>
      </div>
      <p
        data-testid="care-team-count-line"
        style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: tokens.neutral.gray }}
      >
        {notYetReady === 0 ? 'All patients ready' : `${notYetReady} not yet ready`}
      </p>

      <ul data-testid="care-team-rows" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {rows.map((row) => {
          const ready = row.overallStatus === 'READY';
          return (
            <li
              key={row.patientId}
              data-testid={`care-team-row-${row.patientId}`}
              data-status={row.overallStatus}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '0.75rem',
                padding: '0.25rem 0.5rem',
                borderBottom: `1px solid ${tokens.neutral.border}`,
                backgroundColor: ready ? tokens.neutral.surface : tokens.neutral.light,
                color: ready ? tokens.brand.ink : tokens.neutral.gray,
              }}
            >
              <span style={{ fontFamily: tokens.typography.mono.family, fontSize: '0.8rem' }}>
                {row.patientId}
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {row.overallStatus}
              </span>
              {!ready && (row.blockedReasons ?? []).length > 0 && (
                <span
                  data-testid={`care-team-reasons-${row.patientId}`}
                  style={{ fontSize: '0.8rem' }}
                >
                  {(row.blockedReasons ?? []).join(', ')}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
