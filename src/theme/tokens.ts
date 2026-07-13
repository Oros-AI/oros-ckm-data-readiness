// src/theme/tokens.ts
// The typed token surface for the view build (Demo UI/UX Spec §14.1).
//
// SOLE importer of ./tokens.json in src/ — views import from theme/tokens,
// never the JSON. tokens.json mirrors the Drive-canonical "Oros Brand —
// Design Tokens v0.1" (LOCKED 2026-07-12) and is never edited directly;
// changes flow Drive first, repo second.
//
// Token separation rule (§14.1): tokens.brand (INK/GREEN/GOLD + tints) and
// tokens.status (readiness red/amber/green) are different groups with
// different jobs — never crossed. brand.green is never READY; brand.gold
// is never PARTIAL.
//
// logoGradient is deliberately NOT exported: the gradient exists only
// inside the logo mark; the SVG masters carry it internally, and exporting
// it here would invite decorative misuse.

import type { ReadinessStatus } from '../domain/types';
import raw from './tokens.json';

export interface BrandTokens {
  ink: string;
  green: string;
  gold: string;
  goldText: string;
  goldTint: string;
  greenTint1: string;
  greenTint2: string;
}

export interface NeutralTokens {
  gray: string;
  light: string;
  surface: string;
  border: string;
  muted: string;
}

export interface StatusTokens {
  ready: string;
  readyText: string;
  partiallyReady: string;
  partiallyReadyText: string;
  notReady: string;
  notReadyText: string;
  onStatusFill: string;
}

export interface TypographyFace {
  family: string;
  weights: number[];
}

export interface TypographyTokens {
  heading: TypographyFace;
  body: TypographyFace;
  mono: TypographyFace;
}

export interface LogoTokens {
  masters: string[];
  usage: {
    fullLockup: string;
    cornerMark: string;
    minSymbolPx: number;
  };
}

export interface Tokens {
  brand: BrandTokens;
  neutral: NeutralTokens;
  status: StatusTokens;
  typography: TypographyTokens;
  logo: LogoTokens;
}

// Regrouped from the JSON's color.* nesting; $meta/$note documentation keys
// are deliberately not re-exported (fields picked explicitly below).
export const tokens: Tokens = {
  brand: {
    ink: raw.color.brand.ink,
    green: raw.color.brand.green,
    gold: raw.color.brand.gold,
    goldText: raw.color.brand.goldText,
    goldTint: raw.color.brand.goldTint,
    greenTint1: raw.color.brand.greenTint1,
    greenTint2: raw.color.brand.greenTint2,
  },
  neutral: {
    gray: raw.color.neutral.gray,
    light: raw.color.neutral.light,
    surface: raw.color.neutral.surface,
    border: raw.color.neutral.border,
    muted: raw.color.neutral.muted,
  },
  status: {
    ready: raw.color.status.ready,
    readyText: raw.color.status.readyText,
    partiallyReady: raw.color.status.partiallyReady,
    partiallyReadyText: raw.color.status.partiallyReadyText,
    notReady: raw.color.status.notReady,
    notReadyText: raw.color.status.notReadyText,
    onStatusFill: raw.color.status.onStatusFill,
  },
  typography: {
    heading: { family: raw.typography.heading.family, weights: raw.typography.heading.weights },
    body: { family: raw.typography.body.family, weights: raw.typography.body.weights },
    mono: { family: raw.typography.mono.family, weights: raw.typography.mono.weights },
  },
  logo: {
    masters: raw.logo.masters,
    usage: {
      fullLockup: raw.logo.usage.fullLockup,
      cornerMark: raw.logo.usage.cornerMark,
      minSymbolPx: raw.logo.usage.minSymbolPx,
    },
  },
};

// Functional readiness colors — reserved strictly for readiness status,
// never decoration (§14.1). Exhaustive over ReadinessStatus: a new status
// value is a compile error here, never a silent fallback.
export function getStatusTokens(status: ReadinessStatus): {
  fill: string;
  text: string;
  onFill: string;
} {
  switch (status) {
    case 'READY':
      return {
        fill: tokens.status.ready,
        text: tokens.status.readyText,
        onFill: tokens.status.onStatusFill,
      };
    case 'PARTIALLY_READY':
      return {
        fill: tokens.status.partiallyReady,
        text: tokens.status.partiallyReadyText,
        onFill: tokens.status.onStatusFill,
      };
    case 'NOT_READY':
      return {
        fill: tokens.status.notReady,
        text: tokens.status.notReadyText,
        onFill: tokens.status.onStatusFill,
      };
    default: {
      const exhaustive: never = status;
      throw new Error(`getStatusTokens: unknown readiness status ${String(exhaustive)}`);
    }
  }
}
