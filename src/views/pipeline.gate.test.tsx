/** @vitest-environment jsdom */
// Increment 4a gate (G4a-1..G4a-5 rendered assertions; G4a-6..G4a-9 are
// grep evidence in the gate script). Locked against the committed
// fixtures via getReadinessData; expected values are planning-thread
// literals. A failure means the view or the data drifted, never that the
// test needs adjusting.

import { afterEach, describe, expect, it } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from '@testing-library/react';
import App from '../App';
import { AiAssistStrip, PipelineView } from './PipelineView/PipelineView';
import { StageArc } from './PipelineView/StageArc';
import { getReadinessData } from '../data/provider';
import type { PipelineStageView } from '../domain/types';
import { LEAD_VIEW } from '../config/DemoConfig';
import { useDemoState } from '../state/demoState';

afterEach(cleanup);

const SESSIONS = ['A', 'B', 'C'] as const;
type Session = (typeof SESSIONS)[number];

const STAGE_ORDER = [
  'ingest',
  'parse',
  'normalize',
  'score',
  'readiness_report',
  'remediate',
  'rescore',
  'unlock',
];
const STAGE_LABELS = [
  'Ingest',
  'Parse',
  'Normalize',
  'Score',
  'Readiness report',
  'Remediate',
  'Re-score',
  'Unlock',
];

const B_GROUPS: Record<string, number> = {
  device_derived_metric_consistency_cgm: 3,
  device_patient_linkage_cgm: 5,
  device_temporal_density_cgm_14d: 8,
  fitness_recency_a1c: 3,
  layer1_notnull_fields_encounters: 3,
  layer1_notnull_fields_smoking: 6,
  layer2_ranges_numeric_a1c: 3,
  layer2_value_standards: 2,
  layer3_mapped_values: 3,
  layer5_date_concordance: 6,
  layer5_date_concordance_a1c: 4,
};
const C_GROUPS: Record<string, number> = {
  device_patient_linkage_cgm: 5,
  device_temporal_density_cgm_14d: 8,
  fitness_recency_a1c: 3,
  layer1_notnull_fields_smoking: 6,
  layer5_date_concordance: 3,
  layer5_date_concordance_a1c: 2,
};

async function renderView(session: Session) {
  render(<PipelineView session={session} />);
  await screen.findByTestId('pipeline-view');
}

function stageNodes(): HTMLElement[] {
  return [...document.querySelectorAll('[data-testid^="stage-"]')] as HTMLElement[];
}

function renderedGroups(): Array<{ checkName: string; count: number }> {
  return ([...document.querySelectorAll('[data-testid^="check-group-"]')] as HTMLElement[]).map(
    (el) => {
      const checkName = (el.getAttribute('data-testid') ?? '').replace(/^check-group-/, '');
      const count = Number(
        within(el).getByTestId(`check-count-${checkName}`).textContent,
      );
      return { checkName, count };
    },
  );
}

describe('pipeline view gate - Increment 4a (G4a-1..G4a-5)', () => {
  it('G4a-1: stage order and fixture labels, every session', async () => {
    for (const session of SESSIONS) {
      const data = await getReadinessData(session);
      await renderView(session);
      const nodes = stageNodes();
      expect(nodes.map((n) => n.getAttribute('data-testid'))).toEqual(
        STAGE_ORDER.map((s) => `stage-${s}`),
      );
      expect(data.pipeline.map((s) => s.label)).toEqual(STAGE_LABELS);
      nodes.forEach((node, i) => {
        expect(node.textContent).toContain(data.pipeline[i].label);
      });
      cleanup();
    }
  });

  it('G4a-2: status matrix per session', async () => {
    const expected: Record<Session, string[]> = {
      A: Array(8).fill('complete'),
      B: [
        'complete',
        'complete',
        'complete',
        'complete',
        'complete',
        'attention',
        'pending',
        'pending',
      ],
      C: [
        'complete',
        'complete',
        'complete',
        'complete',
        'complete',
        'attention',
        'complete',
        'attention',
      ],
    };
    for (const session of SESSIONS) {
      await renderView(session);
      expect(stageNodes().map((n) => n.getAttribute('data-status'))).toEqual(expected[session]);
      cleanup();
    }
  });

  it('G4a-3 (amended inc5-a, per D3): the arc carries exactly one annotation, at Score; AI-assist re-homed to the strip; unknown stageId unannotated', async () => {
    await renderView('B');

    // Arc region: exactly one annotation chip, at Score, no AI-assist mark.
    const arc = screen.getByTestId('pipeline-arc');
    const arcAnnotations = arc.querySelectorAll('[data-testid^="annotation-"]');
    expect(arcAnnotations).toHaveLength(1);
    expect(arcAnnotations[0].getAttribute('data-testid')).toBe('annotation-score');
    expect(arcAnnotations[0].textContent).toContain('Deterministic core');
    expect(arcAnnotations[0].textContent).toContain('No AI in scoring.');
    expect(arc.textContent).not.toContain('AI-assist');

    // The AI-assist marks now live in the strip (asserted fully in G5a-2/3).
    const strip = screen.getByTestId('ai-assist-strip');
    expect(within(strip).getByTestId('strip-entry-normalize')).toBeTruthy();
    expect(within(strip).getByTestId('strip-entry-remediate')).toBeTruthy();

    for (const stageId of ['ingest', 'parse', 'normalize', 'readiness_report', 'remediate', 'rescore', 'unlock']) {
      expect(arc.querySelector(`[data-testid="annotation-${stageId}"]`)).toBeNull();
    }
    cleanup();

    // Synthetic stage, constructed in-test (never a fixture edit).
    const synthetic: PipelineStageView = {
      stageId: 'synthetic_stage',
      label: 'Synthetic',
      status: 'complete',
    };
    render(<StageArc stages={[synthetic]} />);
    expect(screen.getByTestId('stage-synthetic_stage')).toBeTruthy();
    expect(screen.queryByTestId('annotation-synthetic_stage')).toBeNull();
  });

  it('G4a-4: drill-down groups and counts - B 11/46, C 6/27, A none', async () => {
    await renderView('B');
    expect(document.querySelectorAll('[data-testid^="checks-panel-"]')).toHaveLength(1);
    const bGroups = renderedGroups();
    expect(Object.fromEntries(bGroups.map((g) => [g.checkName, g.count]))).toEqual(B_GROUPS);
    expect(bGroups.reduce((sum, g) => sum + g.count, 0)).toBe(46);
    cleanup();

    await renderView('C');
    expect(document.querySelectorAll('[data-testid^="checks-panel-"]')).toHaveLength(1);
    const cGroups = renderedGroups();
    expect(Object.fromEntries(cGroups.map((g) => [g.checkName, g.count]))).toEqual(C_GROUPS);
    expect(cGroups.reduce((sum, g) => sum + g.count, 0)).toBe(27);
    cleanup();

    await renderView('A');
    expect(document.querySelectorAll('[data-testid^="checks-panel-"]')).toHaveLength(0);
    expect(renderedGroups()).toHaveLength(0);
    expect(screen.queryAllByText('Show records')).toHaveLength(0);
  });

  it('G4a-5: expanding a group renders its records; observed value equals the fixture value', async () => {
    const data = await getReadinessData('B');
    const scoreStage = data.pipeline.find((s) => (s.checkResults ?? []).length > 0);
    expect(scoreStage).toBeDefined();
    const fixtureRows = (scoreStage!.checkResults ?? []).filter(
      (r) => r.checkName === 'layer3_mapped_values',
    );
    expect(fixtureRows.length).toBe(3);

    await renderView('B');
    const group = screen.getByTestId('check-group-layer3_mapped_values');
    fireEvent.click(within(group).getByText('Show records'));

    const table = within(group).getByTestId('records-layer3_mapped_values');
    expect(table.querySelectorAll('tbody tr')).toHaveLength(3);

    // Data-driven comparison: the rendered cell equals the fixture value.
    const row = fixtureRows[0];
    const cell = within(group).getByTestId(`obs-${row.checkName}-${row.patientId}`);
    expect(cell.textContent).toBe(String(row.observedValue));

    expect(within(group).getByText('Hide records')).toBeTruthy();
  });
});

// Increment 4b: view toggle + LEAD_VIEW wiring. The initialView seam is
// the useDemoState parameter (R3; App passes no argument), so the
// pipeline-initial branch is exercised at the hook level and rendered
// content is asserted through App + the toggle.
const PIPELINE_CAPTION = 'Pre-computed results from the scoring engine, presented stage by stage.';

async function openAppB() {
  render(<App />);
  // Session-explicit since inc5-c (the default session moved to A, D5).
  fireEvent.click(screen.getByTestId('session-B'));
  await screen.findAllByTestId('capability-card');
}

describe('view toggle gate - Increment 4b (G4b-1..G4b-4)', () => {
  it("G4b-1: LEAD_VIEW === 'use_case'", () => {
    expect(LEAD_VIEW).toBe('use_case');
  });

  it('G4b-2: initialView seam + rendered content per view', async () => {
    // Hook seam: default follows LEAD_VIEW; explicit parameter wins.
    const defaulted = renderHook(() => useDemoState());
    expect(defaulted.result.current.view).toBe('use_case');
    const explicit = renderHook(() => useDemoState('pipeline'));
    expect(explicit.result.current.view).toBe('pipeline');

    // Rendered: use_case lead shows cards, no pipeline caption.
    await openAppB();
    expect(screen.getAllByTestId('capability-card')).toHaveLength(4);
    expect(screen.queryByText(PIPELINE_CAPTION)).toBeNull();

    // Rendered: pipeline view shows the approved caption, no cards.
    fireEvent.click(screen.getByTestId('view-pipeline'));
    expect(await screen.findByText(PIPELINE_CAPTION)).toBeTruthy();
    expect(screen.queryAllByTestId('capability-card')).toHaveLength(0);
  });

  it('G4b-3: toggle both directions; session survives toggle; view survives session switch', async () => {
    await openAppB();

    // Session C, then toggle to pipeline: session selection survives.
    fireEvent.click(screen.getByTestId('session-C'));
    await screen.findAllByTestId('capability-card');
    fireEvent.click(screen.getByTestId('view-pipeline'));
    await screen.findByText(PIPELINE_CAPTION);
    expect(screen.getByTestId('session-C').getAttribute('aria-pressed')).toBe('true');
    // C signature: rescore complete, unlock attention.
    expect(screen.getByTestId('stage-rescore').getAttribute('data-status')).toBe('complete');
    expect(screen.getByTestId('stage-unlock').getAttribute('data-status')).toBe('attention');

    // View survives a session switch (R2): C -> B, still pipeline.
    fireEvent.click(screen.getByTestId('session-B'));
    expect(await screen.findByText(PIPELINE_CAPTION)).toBeTruthy();
    expect(screen.queryAllByTestId('capability-card')).toHaveLength(0);
    expect(screen.getByTestId('view-pipeline').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('stage-rescore').getAttribute('data-status')).toBe('pending');

    // Toggle back: capabilities render again.
    fireEvent.click(screen.getByTestId('view-use_case'));
    expect(await screen.findAllByTestId('capability-card')).toHaveLength(4);
    expect(screen.queryByText(PIPELINE_CAPTION)).toBeNull();
  });

  it('G4b-4: R1 behavioral - toggling to pipeline closes the drawer and never opens it', async () => {
    await openAppB();

    // Open the drawer from the four-facts affordance.
    fireEvent.click(await screen.findByTestId('blocker-blk_layer3_mapped_values'));
    fireEvent.click(screen.getByTestId('open-drawer-blk_layer3_mapped_values'));
    expect(await screen.findByTestId('remediation-drawer')).toBeTruthy();

    // Toggle to pipeline: drawer closed.
    fireEvent.click(screen.getByTestId('view-pipeline'));
    await screen.findByText(PIPELINE_CAPTION);
    expect(screen.queryByTestId('remediation-drawer')).toBeNull();

    // Toggle back: drawer stays closed; expandedBlockerId untouched (R1),
    // so the four-facts panel is still expanded.
    fireEvent.click(screen.getByTestId('view-use_case'));
    await screen.findAllByTestId('capability-card');
    expect(screen.queryByTestId('remediation-drawer')).toBeNull();
    expect(screen.getByTestId('four-facts-panel')).toBeTruthy();

    // Hook grain: selectView never opens the drawer.
    const { result } = renderHook(() => useDemoState());
    act(() => result.current.selectView('pipeline'));
    expect(result.current.openDrawerBlockerId).toBeNull();
    act(() => result.current.selectView('use_case'));
    expect(result.current.openDrawerBlockerId).toBeNull();
  });
});

describe('arc layout + legend gate - Increment 4b2 (G4b2-1..G4b2-3)', () => {
  it('G4b2-1: legend renders the three approved words once, every session; only in pipeline view', async () => {
    for (const session of SESSIONS) {
      await renderView(session);
      const legends = screen.getAllByTestId('status-legend');
      expect(legends).toHaveLength(1);
      const legend = within(legends[0]);
      expect(legend.getByText('Complete')).toBeTruthy();
      expect(legend.getByText('Needs attention')).toBeTruthy();
      expect(legend.getByText('Pending')).toBeTruthy();
      expect(legends[0].querySelectorAll('li')).toHaveLength(3);
      cleanup();
    }

    // Only in the pipeline view: absent on the use-case lead, present
    // after the toggle.
    await openAppB();
    expect(screen.queryByTestId('status-legend')).toBeNull();
    fireEvent.click(screen.getByTestId('view-pipeline'));
    await screen.findByText(PIPELINE_CAPTION);
    expect(screen.getAllByTestId('status-legend')).toHaveLength(1);
  });

  it('G4b2-2: legend dots share the stage token mapping (DOM color equality per status)', async () => {
    await renderView('B');
    const color = (testId: string) => (screen.getByTestId(testId) as HTMLElement).style.backgroundColor;
    // B signature stages: ingest complete, remediate attention, rescore pending.
    expect(color('legend-dot-complete')).toBe(color('node-dot-ingest'));
    expect(color('legend-dot-attention')).toBe(color('node-dot-remediate'));
    expect(color('legend-dot-pending')).toBe(color('node-dot-rescore'));
    expect(color('legend-dot-complete')).not.toBe(color('legend-dot-attention'));
    expect(color('legend-dot-attention')).not.toBe(color('legend-dot-pending'));
  });

  it('G4b2-3: arc style contract - nowrap flex with horizontal scroll (JSDOM cannot measure layout; visual confirmation follows)', async () => {
    await renderView('A');
    const arc = screen.getByTestId('pipeline-arc') as HTMLElement;
    expect(arc.style.display).toBe('flex');
    expect(arc.style.flexWrap).toBe('nowrap');
    expect(arc.style.overflowX).toBe('auto');
  });
});

// inc5-a: annotation restructure. Strip literals below are the locked
// approved copy; a mismatch means the authored surface drifted.
const STRIP_TITLE_LOCKED = 'Where AI assists in this pipeline';
const STRIP_FRAMING_LOCKED =
  'The deterministic pipeline is the source of truth. AI assists at these two stages, a person approves every change, and scoring itself uses no AI.';

describe('annotation restructure gate - Increment 5a (G5a-1..G5a-6)', () => {
  it('G5a-1: exactly one annotation chip in the arc, at Score, copy verbatim, sessions A/B/C', async () => {
    for (const session of SESSIONS) {
      await renderView(session);
      const arc = screen.getByTestId('pipeline-arc');
      const arcAnnotations = arc.querySelectorAll('[data-testid^="annotation-"]');
      expect(arcAnnotations).toHaveLength(1);
      expect(arcAnnotations[0].getAttribute('data-testid')).toBe('annotation-score');
      expect(arcAnnotations[0].textContent).toBe('Deterministic coreNo AI in scoring.');
      expect(arc.textContent).not.toContain('AI-assist');
      cleanup();
    }
  });

  it('G5a-2: strip renders title, both entries, and framing sentence verbatim (scripted mode)', async () => {
    await renderView('B');
    const strip = screen.getByTestId('ai-assist-strip');
    const q = within(strip);
    expect(q.getByText(STRIP_TITLE_LOCKED)).toBeTruthy();
    expect(q.getByTestId('strip-entry-normalize').textContent).toBe(
      'Normalize: AI-assist Architectural',
    );
    expect(q.getByTestId('strip-entry-remediate').textContent).toBe(
      'Remediate: AI-assist Demonstrated (stub)',
    );
    expect(q.getByText(STRIP_FRAMING_LOCKED)).toBeTruthy();
    expect(strip.querySelectorAll('li')).toHaveLength(2);
  });

  it('G5a-3: the Remediate entry state derives from AGENT_MODE (badge mechanism, as the old in-arc assertion)', async () => {
    await renderView('B');
    const remediateEntry = within(screen.getByTestId('strip-entry-remediate'));
    expect(remediateEntry.getByText('Demonstrated (stub)')).toBeTruthy();
    const normalizeEntry = within(screen.getByTestId('strip-entry-normalize'));
    expect(normalizeEntry.getByText('Architectural')).toBeTruthy();
  });

  it('G5a-4: strip absent from the use-case view', async () => {
    await openAppB();
    expect(screen.queryByTestId('ai-assist-strip')).toBeNull();
    fireEvent.click(screen.getByTestId('view-pipeline'));
    await screen.findByText(PIPELINE_CAPTION);
    expect(screen.getByTestId('ai-assist-strip')).toBeTruthy();
  });

  it('G5a-6: unknown stageId renders unannotated in BOTH slots, no error', async () => {
    const synthetic: PipelineStageView = {
      stageId: 'synthetic_stage',
      label: 'Synthetic',
      status: 'complete',
    };
    render(<StageArc stages={[synthetic]} />);
    expect(screen.getByTestId('stage-synthetic_stage')).toBeTruthy();
    expect(screen.queryByTestId('annotation-synthetic_stage')).toBeNull();
    cleanup();

    render(<AiAssistStrip stages={[synthetic]} />);
    expect(screen.queryByTestId('ai-assist-strip')).toBeNull();
    expect(screen.queryByTestId('strip-entry-synthetic_stage')).toBeNull();
  });
});
