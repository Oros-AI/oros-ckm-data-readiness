// src/data/provider.gate.test.ts
// Increment 1 gate: the provider serves the engine-exported fixtures and
// the fixtures conform to the contract. Every assertion is locked against
// engine truth (gate_fx_precheck.txt / gate_fx2_gate.txt) — a failure here
// means the data or the contract drifted, never that the test needs
// adjusting.

import { beforeAll, describe, expect, it } from 'vitest';
import type { ReadinessData } from '../domain/types';
import { getReadinessData, getReadinessDataFrom } from './provider';

const SESSIONS = ['A', 'B', 'C'] as const;

let A: ReadinessData;
let B: ReadinessData;
let C: ReadinessData;

beforeAll(async () => {
  [A, B, C] = await Promise.all(SESSIONS.map((s) => getReadinessData(s)));
});

const bySession = () => [
  { label: 'A' as const, data: A },
  { label: 'B' as const, data: B },
  { label: 'C' as const, data: C },
];

describe('provider gate — Increment 1', () => {
  it('A1: resolves for A/B/C with exactly the top-level keys', () => {
    for (const { data } of bySession()) {
      expect(Object.keys(data).sort()).toEqual(
        ['blockers', 'criteria', 'patientRows', 'pipeline', 'session', 'useCases'].sort(),
      );
    }
  });

  it('A2: session meta labels, datasetState, demoSessionId', () => {
    expect(A.session.label).toBe('A');
    expect(B.session.label).toBe('B');
    expect(C.session.label).toBe('C');
    expect(A.session.datasetState).toBe('clean');
    expect(B.session.datasetState).toBe('buggy');
    expect(C.session.datasetState).toBe('remediated');
    for (const { data } of bySession()) {
      expect(typeof data.session.demoSessionId).toBe('string');
      expect(data.session.demoSessionId.length).toBeGreaterThan(0);
    }
    expect(B.session.demoSessionId).toBe('a40afd78-0ded-4481-8a7d-04811f4f28ed');
  });

  it('A3: exactly 4 use cases per session in workflow order', () => {
    for (const { data } of bySession()) {
      expect(data.useCases.map((u) => u.useCaseName)).toEqual([
        'diabetes_risk_stratification',
        'hypertension_risk_stratification',
        'care_coordination',
        'vbc_reporting',
      ]);
    }
  });

  it('A4: overallStatus + patientCounts, exact', () => {
    const counts = (ready: number, partiallyReady: number, notReady: number) => ({
      ready,
      partiallyReady,
      notReady,
    });
    expect(A.useCases.map((u) => [u.overallStatus, u.patientCounts])).toEqual([
      ['READY', counts(36, 0, 0)],
      ['READY', counts(35, 0, 0)],
      ['READY', counts(49, 0, 0)],
      ['READY', counts(49, 0, 0)],
    ]);
    expect(B.useCases.map((u) => [u.overallStatus, u.patientCounts])).toEqual([
      ['NOT_READY', counts(30, 6, 0)],
      ['NOT_READY', counts(29, 0, 6)],
      ['PARTIALLY_READY', counts(44, 0, 5)],
      ['NOT_READY', counts(40, 0, 9)],
    ]);
    expect(C.useCases.map((u) => [u.overallStatus, u.patientCounts])).toEqual([
      ['PARTIALLY_READY', counts(33, 3, 0)],
      ['NOT_READY', counts(29, 0, 6)],
      ['READY', counts(49, 0, 0)],
      ['PARTIALLY_READY', counts(46, 0, 3)],
    ]);
  });

  it('A5: population fitnessScore is null everywhere', () => {
    for (const { data } of bySession()) {
      for (const u of data.useCases) expect(u.fitnessScore).toBeNull();
    }
  });

  it('A6: blocker counts A 0 / B 11 / C 6', () => {
    expect(A.blockers.length).toBe(0);
    expect(B.blockers.length).toBe(11);
    expect(C.blockers.length).toBe(6);
  });

  it('A7: B blocker IDs in exact order', () => {
    expect(B.blockers.map((b) => b.blockerId)).toEqual([
      'blk_device_derived_metric_consistency_cgm',
      'blk_device_patient_linkage_cgm',
      'blk_device_temporal_density_cgm_14d',
      'blk_fitness_recency_a1c',
      'blk_layer2_ranges_numeric_a1c',
      'blk_layer5_date_concordance_a1c',
      'blk_layer1_notnull_fields_smoking',
      'blk_layer2_value_standards',
      'blk_layer3_mapped_values',
      'blk_layer1_notnull_fields_encounters',
      'blk_layer5_date_concordance',
    ]);
  });

  it('A8: C blocker IDs in exact order', () => {
    expect(C.blockers.map((b) => b.blockerId)).toEqual([
      'blk_device_patient_linkage_cgm',
      'blk_device_temporal_density_cgm_14d',
      'blk_fitness_recency_a1c',
      'blk_layer5_date_concordance_a1c',
      'blk_layer1_notnull_fields_smoking',
      'blk_layer5_date_concordance',
    ]);
  });

  it('A9: recommendationType taxonomy — B split, C all route (Bug 5 flip)', () => {
    const aiInB = new Set([
      'blk_layer2_ranges_numeric_a1c',
      'blk_layer5_date_concordance_a1c',
      'blk_layer2_value_standards',
      'blk_layer3_mapped_values',
      'blk_layer5_date_concordance',
    ]);
    for (const b of B.blockers) {
      expect(b.recommendationType).toBe(
        aiInB.has(b.blockerId) ? 'ai_suggested_fix' : 'route_to_stakeholder',
      );
    }
    for (const b of C.blockers) {
      expect(b.recommendationType).toBe('route_to_stakeholder');
    }
  });

  it('A10: B bugId map', () => {
    const expected: Record<string, string> = {
      blk_device_derived_metric_consistency_cgm: 'bug_6',
      blk_device_patient_linkage_cgm: 'bug_1',
      blk_device_temporal_density_cgm_14d: 'bug_2',
      blk_fitness_recency_a1c: 'bug_8',
      blk_layer2_ranges_numeric_a1c: 'bug_9',
      blk_layer5_date_concordance_a1c: 'bug_5',
      blk_layer1_notnull_fields_smoking: 'bug_3',
      blk_layer2_value_standards: 'bug_4',
      blk_layer3_mapped_values: 'bug_4',
      blk_layer1_notnull_fields_encounters: 'bug_7',
      blk_layer5_date_concordance: 'bug_5',
    };
    for (const b of B.blockers) {
      expect(b.bugId).toBe(expected[b.blockerId]);
    }
  });

  it('A11: criteria — 6 per session; one "all", five diabetes', () => {
    for (const { data } of bySession()) {
      expect(data.criteria.length).toBe(6);
      const all = data.criteria.filter((c) => c.appliesToUseCase === 'all');
      const diabetes = data.criteria.filter(
        (c) => c.appliesToUseCase === 'diabetes_risk_stratification',
      );
      expect(all.length).toBe(1);
      expect(diabetes.length).toBe(5);
    }
  });

  it('A12: pipeline stage ids, exact order, every session', () => {
    for (const { data } of bySession()) {
      expect(data.pipeline.map((s) => s.stageId)).toEqual([
        'ingest',
        'parse',
        'normalize',
        'score',
        'readiness_report',
        'remediate',
        'rescore',
        'unlock',
      ]);
    }
  });

  it('A13: score-stage checkResults - all 13 checks; FAIL rows A 0, B 46, C 27; PASS entries status-only', () => {
    // Task 4 (demo-align): the score stage carries every registry
    // check. FAIL checks keep per-record rows; PASS checks carry one
    // status-only entry with zero records.
    const scoreResults = (data: ReadinessData) =>
      data.pipeline.find((s) => s.stageId === 'score')?.checkResults ?? [];
    expect(scoreResults(A).length).toBe(13);
    expect(scoreResults(B).length).toBe(48);
    expect(scoreResults(C).length).toBe(34);
    const failRows = (data: ReadinessData) => scoreResults(data).filter((r) => r.status === 'FAIL');
    expect(failRows(A).length).toBe(0);
    expect(failRows(B).length).toBe(46);
    expect(failRows(C).length).toBe(27);
    for (const { data } of bySession()) {
      const distinctChecks = new Set(scoreResults(data).map((r) => r.checkName));
      expect(distinctChecks.size).toBe(13);
      for (const row of scoreResults(data)) {
        if (row.status === 'PASS') {
          expect(row.patientId).toBeUndefined();
          expect(row.score).toBeUndefined();
        } else {
          expect(row.status).toBe('FAIL');
          expect(row.patientId).toBeDefined();
        }
      }
    }
  });

  it('A14: patientRows 169 per session; diabetes-B quintet exact', () => {
    for (const { data } of bySession()) {
      expect(data.patientRows?.length).toBe(169);
    }
    const diabetesB = (B.patientRows ?? []).filter(
      (r) => r.useCaseName === 'diabetes_risk_stratification',
    );
    const row = (patientId: string) => {
      const found = diabetesB.find((r) => r.patientId === patientId);
      expect(found).toBeDefined();
      return found;
    };
    expect(row('PAT000012')).toMatchObject({
      overallStatus: 'READY',
      pathwayResult: 'primary_pass',
      activePathwayId: 'cgm_primary',
    });
    expect(row('PAT000050')).toMatchObject({
      overallStatus: 'READY',
      pathwayResult: 'primary_pass',
      activePathwayId: 'cgm_primary',
    });
    expect(row('PAT000041')).toMatchObject({
      overallStatus: 'READY',
      pathwayResult: 'fallback_pass',
      activePathwayId: 'a1c_fallback',
    });
    expect(row('PAT000022')).toMatchObject({
      overallStatus: 'PARTIALLY_READY',
      fitnessScore: 0.8,
      pathwayResult: 'no_valid_pathway',
    });
    expect(row('PAT000023')).toMatchObject({
      overallStatus: 'PARTIALLY_READY',
      fitnessScore: 0.76,
      pathwayResult: 'no_valid_pathway',
    });
  });

  it("A15: neon branch rejects with 'not implemented'", async () => {
    await expect(getReadinessDataFrom('neon', 'B')).rejects.toThrow(/not implemented/);
  });
});
