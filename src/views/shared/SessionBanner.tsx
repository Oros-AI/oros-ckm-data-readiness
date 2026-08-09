// src/views/shared/SessionBanner.tsx
// Persistent session banner (demo-align Item 1): visible at all times,
// naming the active session with its locked sublabel. The three label
// strings are LOCKED verbatim; rendering, layout, and placement float
// until visual approval. Color discipline: brand groups only, never the
// functional status group (READY/PARTIAL/NOT_READY colors carry
// readiness meaning and are never crossed with chrome). Session B uses
// the brand GOLD family with goldText for text (raw gold is never a
// text color); Sessions A and C use the brand GREEN family.

import type { SessionId } from '../../state/demoState';
import { tokens } from '../../theme/tokens';

// Locked copy, verbatim. "the reality" is narration only and is
// deliberately NOT part of any label.
const BANNER_LABELS: Record<SessionId, string> = {
  A: 'SESSION A - clean baseline',
  B: 'SESSION B - nine seeded defects',
  C: 'SESSION C - after one remediation pass',
};

export function SessionBanner({ session }: { session: SessionId }) {
  const goldFamily = session === 'B';
  return (
    <div
      data-testid="session-banner"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backgroundColor: goldFamily ? tokens.brand.goldTint : tokens.brand.greenTint1,
        color: goldFamily ? tokens.brand.goldText : tokens.brand.green,
        borderBottom: `2px solid ${goldFamily ? tokens.brand.gold : tokens.brand.green}`,
        padding: '0.45rem 1rem',
        fontWeight: 600,
        fontSize: '0.85rem',
        letterSpacing: '0.05em',
        textAlign: 'center',
      }}
    >
      {BANNER_LABELS[session]}
    </div>
  );
}
