// src/views/PipelineView/ChecksPanel.tsx
// Drill-down for one stage (ratified D-C): data-presence-driven. Renders
// only when the stage carries checkResults rows; groups by checkName in
// first-appearance order; a group expands inline to its record table.
// observedValue renders VERBATIM: never parsed, truncated, or
// re-formatted. Stages without rows produce no panel and no copy.

import { useState } from 'react';
import type { CheckResultView, PipelineStageView } from '../../domain/types';
import { tokens } from '../../theme/tokens';

// 'Observed value' is the only wide column: it takes the remaining
// table width while the compact columns hug their content (nowrap), so
// Score and Threshold values sit unambiguously under their own headers
// (demo-align R2).
const COLUMNS = [
  { label: 'Patient', wide: false },
  { label: 'Variable', wide: false },
  { label: 'Status', wide: false },
  { label: 'Score', wide: false },
  { label: 'Threshold', wide: false },
  { label: 'Observed value', wide: true },
  { label: 'Priority', wide: false },
] as const;

function groupByCheckName(
  rows: CheckResultView[],
): Array<{ checkName: string; rows: CheckResultView[] }> {
  const order: string[] = [];
  const byName = new Map<string, CheckResultView[]>();
  for (const row of rows) {
    const bucket = byName.get(row.checkName);
    if (bucket) {
      bucket.push(row);
    } else {
      byName.set(row.checkName, [row]);
      order.push(row.checkName);
    }
  }
  return order.map((checkName) => ({ checkName, rows: byName.get(checkName)! }));
}

export function ChecksPanel({ stage }: { stage: PipelineStageView }) {
  const rows = stage.checkResults ?? [];
  if (rows.length === 0) return null;
  const groups = groupByCheckName(rows);

  return (
    <section
      data-testid={`checks-panel-${stage.stageId}`}
      style={{
        border: `1px solid ${tokens.neutral.border}`,
        backgroundColor: tokens.neutral.surface,
        borderRadius: '8px',
        padding: '0.9rem 1.1rem',
        marginTop: '1rem',
      }}
    >
      <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: tokens.brand.ink }}>
        Check results: {stage.label}
      </h3>
      {groups.map((group) => (
        <CheckGroup key={group.checkName} checkName={group.checkName} rows={group.rows} />
      ))}
    </section>
  );
}

function CheckGroup({ checkName, rows }: { checkName: string; rows: CheckResultView[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      data-testid={`check-group-${checkName}`}
      style={{
        border: `1px solid ${tokens.neutral.border}`,
        backgroundColor: tokens.neutral.light,
        borderRadius: '4px',
        padding: '0.35rem 0.6rem',
        marginBottom: '0.3rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span
          style={{
            flex: 1,
            fontFamily: tokens.typography.mono.family,
            fontSize: '0.8rem',
            color: tokens.brand.ink,
          }}
        >
          {checkName}
        </span>
        <span
          data-testid={`check-count-${checkName}`}
          style={{
            border: `1px solid ${tokens.neutral.border}`,
            backgroundColor: tokens.neutral.surface,
            borderRadius: '999px',
            padding: '0.05rem 0.5rem',
            fontSize: '0.75rem',
            color: tokens.brand.ink,
          }}
        >
          {rows.length}
        </span>
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          style={{
            border: `1px solid ${tokens.neutral.border}`,
            backgroundColor: tokens.neutral.surface,
            color: tokens.brand.ink,
            borderRadius: '4px',
            padding: '0.15rem 0.6rem',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        >
          {expanded ? 'Hide records' : 'Show records'}
        </button>
      </div>

      {expanded && (
        <div style={{ overflowX: 'auto', marginTop: '0.4rem' }}>
          <table
            data-testid={`records-${checkName}`}
            style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.75rem' }}
          >
            <thead>
              <tr>
                {COLUMNS.map((column) => (
                  <th
                    key={column.label}
                    style={{
                      textAlign: 'left',
                      padding: '0.2rem 0.5rem',
                      borderBottom: `1px solid ${tokens.neutral.border}`,
                      color: tokens.neutral.gray,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      width: column.wide ? '100%' : undefined,
                    }}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.checkName}:${row.patientId}`}>
                  <td style={compactCellStyle}>{row.patientId}</td>
                  <td style={compactCellStyle}>{row.variableName}</td>
                  <td style={compactCellStyle}>{row.status}</td>
                  {/* Binary checks carry no numeric score: render an
                      explicit dash, never a blank cell (R2). */}
                  <td style={compactCellStyle}>{row.score ?? '-'}</td>
                  <td style={compactCellStyle}>{row.threshold}</td>
                  <td style={cellStyle} data-testid={`obs-${row.checkName}-${row.patientId}`}>
                    {row.observedValue}
                  </td>
                  <td style={compactCellStyle}>{row.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const cellStyle = {
  padding: '0.2rem 0.5rem',
  borderBottom: `1px solid ${tokens.neutral.border}`,
  color: tokens.brand.ink,
  verticalAlign: 'top',
} as const;

const compactCellStyle = {
  ...cellStyle,
  whiteSpace: 'nowrap',
} as const;
