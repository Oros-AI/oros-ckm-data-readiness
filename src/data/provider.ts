// src/data/provider.ts
// The data-provider abstraction (Demo UI/UX Specification §4, §8.1):
// one function, two modes. The UI calls getReadinessData and never knows
// the source; DATA_SOURCE (src/config/DemoConfig.ts) selects it.
//
// The neon seam is deliberately the flag + this dispatch — no placeholder
// neon module exists in v0.1 (fixtures is the demo mode, §8.4).

import type { ReadinessData } from '../domain/types';
import { DATA_SOURCE } from '../config/DemoConfig';
import { fromFixtures } from './fixtures/index';

export async function getReadinessData(session: 'A' | 'B' | 'C'): Promise<ReadinessData> {
  return getReadinessDataFrom(DATA_SOURCE, session);
}

// Exists so the gate can exercise the neon branch without mocking the
// config module.
export async function getReadinessDataFrom(
  source: 'fixtures' | 'neon',
  session: 'A' | 'B' | 'C',
): Promise<ReadinessData> {
  if (source === 'neon') {
    throw new Error(
      "DATA_SOURCE='neon' is not implemented in v0.1 — fixtures is the demo mode (Demo UI/UX Spec §8.4)",
    );
  }
  return fromFixtures(session);
}
