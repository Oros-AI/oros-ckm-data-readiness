// src/views/shared/ImplementationBadge.tsx
// Three-state honesty badge (spec §12; CLAUDE.md §1.6 vocabulary).
// Brand/neutral tokens only — never the functional status group.

import type { ImplementationState } from '../../domain/types';
import { tokens } from '../../theme/tokens';

const LABELS: Record<ImplementationState, string> = {
  implemented: 'Implemented',
  demonstrated_stub: 'Demonstrated (stub)',
  architectural: 'Architectural',
};

export function ImplementationBadge({ state }: { state: ImplementationState }) {
  return (
    <span
      data-testid="impl-badge"
      style={{
        border: `1px solid ${tokens.neutral.border}`,
        backgroundColor: tokens.neutral.light,
        color: tokens.brand.ink,
        borderRadius: '4px',
        padding: '0.1rem 0.45rem',
        fontSize: '0.75rem',
        whiteSpace: 'nowrap',
      }}
    >
      {LABELS[state]}
    </span>
  );
}
