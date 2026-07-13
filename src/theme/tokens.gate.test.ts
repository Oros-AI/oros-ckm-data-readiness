// src/theme/tokens.gate.test.ts
// Increment 2 token gate (G2-1..G2-5). Node environment — no DOM needed.
//
// Expected values are planning-thread LITERALS from the Drive-canonical
// tokens doc, written here verbatim — deliberately NOT derived from the
// repo JSON copy, so this test verifies that copy against the canonical
// record rather than circularly against itself. (Also keeps the G2-6
// sole-importer grep clean: only theme/tokens.ts may reference the JSON.)

import { describe, expect, it } from 'vitest';
import * as themeTokens from './tokens';
import { getStatusTokens, tokens } from './tokens';

describe('token gate — Increment 2 (G2-1..G2-5)', () => {
  it('G2-1: tokens.brand exact — values and no other keys', () => {
    expect(tokens.brand).toEqual({
      ink: '#1A2420',
      green: '#117757',
      gold: '#CB983F',
      goldText: '#8A5E1E',
      goldTint: '#FBF3E6',
      greenTint1: '#E9F2EC',
      greenTint2: '#F4F8F5',
    });
  });

  it('G2-2: tokens.status and tokens.neutral exact — values and no other keys', () => {
    expect(tokens.status).toEqual({
      ready: '#2F9E44',
      readyText: '#23763A',
      partiallyReady: '#D97706',
      partiallyReadyText: '#A35C05',
      notReady: '#C0392B',
      notReadyText: '#A03024',
      onStatusFill: '#FFFFFF',
    });
    expect(tokens.neutral).toEqual({
      gray: '#5C6660',
      light: '#F4F6F5',
      surface: '#FFFFFF',
      border: '#D9DEDB',
      muted: '#C8CECB',
    });
  });

  it('G2-3: getStatusTokens returns exactly the three triplets', () => {
    expect(getStatusTokens('READY')).toEqual({
      fill: '#2F9E44',
      text: '#23763A',
      onFill: '#FFFFFF',
    });
    expect(getStatusTokens('PARTIALLY_READY')).toEqual({
      fill: '#D97706',
      text: '#A35C05',
      onFill: '#FFFFFF',
    });
    expect(getStatusTokens('NOT_READY')).toEqual({
      fill: '#C0392B',
      text: '#A03024',
      onFill: '#FFFFFF',
    });
  });

  it('G2-4: status values are disjoint from brand values', () => {
    const brandValues = new Set(Object.values(tokens.brand));
    const overlap = Object.values(tokens.status).filter((v) => brandValues.has(v));
    expect(overlap).toEqual([]);
  });

  it('G2-5: no logoGradient export — not on the module, not on tokens', () => {
    expect('logoGradient' in themeTokens).toBe(false);
    expect('logoGradient' in tokens).toBe(false);
  });
});
