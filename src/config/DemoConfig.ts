// src/config/DemoConfig.ts
// Demo-wide switchable-abstraction flags (Demo UI/UX Specification §4, §8).
// Increment 1 carried the data-provider flag; Increment 3a added
// AGENT_MODE; Increment 4b adds LEAD_VIEW (the view the demo opens on:
// the use-case front door is the honest lead, spec §2.3).

export const DATA_SOURCE: 'fixtures' | 'neon' = 'fixtures';

export const AGENT_MODE: 'live' | 'scripted' = 'scripted';

export const LEAD_VIEW: 'use_case' | 'pipeline' = 'use_case';
