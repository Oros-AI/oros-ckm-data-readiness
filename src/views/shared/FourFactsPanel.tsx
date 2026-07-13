// src/views/shared/FourFactsPanel.tsx
// The four-facts blocker panel (spec §6.3) — rendered purely from the
// Blocker record, one component, zero per-bug branching. whatFailed and
// whatUnlocks render VERBATIM, never reworded, trimmed, or reformatted.
// The exporter already appends "Check: <check_name>" to whatFailed at the
// export boundary, so the Check line arrives inside the verbatim string —
// appending it again here would double it.
// The recommendation affordance opens the RemediationDrawer (mounted once
// in App, Increment 3b) — this button is the drawer's ONLY invocation
// site in src/.

import type { Blocker } from '../../domain/types';
import { tokens } from '../../theme/tokens';

const factHeaderStyle = {
  fontSize: '0.7rem',
  fontWeight: 600,
  letterSpacing: '0.06em',
  color: tokens.neutral.gray,
  margin: '0.75rem 0 0.15rem',
} as const;

interface FourFactsPanelProps {
  blocker: Blocker;
  // Optional so the panel stays renderable standalone (G2-13); App wires it.
  onOpenDrawer?: (blockerId: string) => void;
}

export function FourFactsPanel({ blocker, onOpenDrawer }: FourFactsPanelProps) {
  return (
    <div
      data-testid="four-facts-panel"
      style={{
        border: `1px solid ${tokens.neutral.border}`,
        backgroundColor: tokens.neutral.surface,
        borderRadius: '6px',
        padding: '0.75rem 1rem',
        margin: '0.5rem 0',
      }}
    >
      <p style={{ margin: 0, fontSize: '0.85rem' }}>
        Phenotype: <strong>{blocker.phenotype}</strong>
      </p>

      <p style={factHeaderStyle}>1. WHAT FAILED</p>
      <p style={{ margin: 0 }}>{blocker.whatFailed}</p>

      <p style={factHeaderStyle}>2. CAPABILITY BLOCKED</p>
      <p style={{ margin: 0 }}>{blocker.capabilityBlocked}</p>

      <p style={factHeaderStyle}>3. RESPONSIBLE ROLE</p>
      <p style={{ margin: 0 }}>{blocker.responsibleRole}</p>

      <p style={factHeaderStyle}>4. WHAT UNLOCKS AFTER REMEDIATION</p>
      <p style={{ margin: 0 }}>{blocker.whatUnlocks}</p>

      <button
        type="button"
        data-testid={`open-drawer-${blocker.blockerId}`}
        onClick={() => onOpenDrawer?.(blocker.blockerId)}
        style={{
          marginTop: '0.75rem',
          border: `1px solid ${tokens.brand.green}`,
          backgroundColor: tokens.brand.greenTint1,
          color: tokens.brand.ink,
          borderRadius: '4px',
          padding: '0.3rem 0.7rem',
          cursor: 'pointer',
        }}
      >
        Open remediation recommendation →
      </button>
    </div>
  );
}
