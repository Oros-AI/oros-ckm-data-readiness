// src/config/DemoConfig.ts
// Demo-wide switchable-abstraction flags (Demo UI/UX Specification §4, §8).
// Increment 1 carried the data-provider flag; Increment 3a adds AGENT_MODE.
// LEAD_VIEW arrives in a later increment.

export const DATA_SOURCE: 'fixtures' | 'neon' = 'fixtures';

export const AGENT_MODE: 'live' | 'scripted' = 'scripted';
