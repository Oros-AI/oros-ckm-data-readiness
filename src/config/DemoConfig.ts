// src/config/DemoConfig.ts
// Demo-wide switchable-abstraction flags (Demo UI/UX Specification §4, §8).
// Increment 1 carries only the data-provider flag; AGENT_MODE and LEAD_VIEW
// arrive in later increments.

export const DATA_SOURCE: 'fixtures' | 'neon' = 'fixtures';
