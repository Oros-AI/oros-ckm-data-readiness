// src/views/shared/CriteriaCard.tsx
// One configured criterion (spec §9): shown as configured and owned by the
// local team, versioned and revisable — never asserted by the platform as
// universal truth.

import type { ConfiguredCriterion } from '../../domain/types';
import { tokens } from '../../theme/tokens';

export function CriteriaCard({ criterion }: { criterion: ConfiguredCriterion }) {
  return (
    <div
      data-testid={`criterion-${criterion.criterionId}`}
      style={{
        border: `1px solid ${tokens.neutral.border}`,
        backgroundColor: tokens.brand.greenTint2,
        borderRadius: '6px',
        padding: '0.5rem 0.75rem',
        fontSize: '0.85rem',
      }}
    >
      <p style={{ margin: 0 }}>
        <strong>{criterion.label}</strong>
      </p>
      <p style={{ margin: '0.15rem 0 0', color: tokens.neutral.gray }}>
        Value: {criterion.value} · Configured · {criterion.configVersion} · {criterion.ownedBy} ·{' '}
        {criterion.tier}
      </p>
    </div>
  );
}
