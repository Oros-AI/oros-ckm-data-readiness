// src/data/fixtures/index.ts
// Fixtures mode (Demo UI/UX Specification §8.2): the engine-exported
// session fixtures, statically imported so the demo has zero runtime
// fetch dependencies.
//
// THE one cast boundary of the increment: the compiler cannot verify JSON
// file content against the ReadinessData contract, so each import is cast
// 'as unknown as ReadinessData' exactly once, here. The provider gate test
// (src/data/provider.gate.test.ts) is the verification that the fixtures
// actually conform — no other casts exist anywhere in the increment.

import type { ReadinessData } from '../../domain/types';
import sessionA from './session-a.json';
import sessionB from './session-b.json';
import sessionC from './session-c.json';

const FIXTURES: Record<'A' | 'B' | 'C', ReadinessData> = {
  A: sessionA as unknown as ReadinessData,
  B: sessionB as unknown as ReadinessData,
  C: sessionC as unknown as ReadinessData,
};

export async function fromFixtures(session: 'A' | 'B' | 'C'): Promise<ReadinessData> {
  return FIXTURES[session];
}
