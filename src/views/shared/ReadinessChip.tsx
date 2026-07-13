// src/views/shared/ReadinessChip.tsx
// Readiness status chip — functional status tokens ONLY (spec §14.1):
// READY/PARTIALLY_READY/NOT_READY colors carry meaning and never come
// from the brand group.

import type { ReadinessStatus } from '../../domain/types';
import { getStatusTokens } from '../../theme/tokens';

export function ReadinessChip({ status }: { status: ReadinessStatus }) {
  const t = getStatusTokens(status);
  return (
    <span
      data-testid="readiness-chip"
      style={{
        backgroundColor: t.fill,
        color: t.onFill,
        borderRadius: '999px',
        padding: '0.15rem 0.6rem',
        fontWeight: 600,
        fontSize: '0.8rem',
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  );
}
