// scripts/export_fixtures.mjs
// The fixture-export step (fx-2, Demo UI/UX Specification §8.3): serializes
// engine truth (Neon, read-only SELECTs) combined with the authored content
// map (scripts/fixture_content.mjs) into src/data/fixtures/session-{a,b,c}.json
// conforming to the §7.3 ReadinessData contract plus the ratified additive
// fields (blocker.recommendationType, blocker.bugId).
//
// Division of labor (restate nothing):
//   engine tables  → counts, statuses, scores, pathway results, routing
//   config tables  → display names, categories
//   content map    → recommendationType, four-facts templates, evidence
//                    renderers, criteria, pipeline copy, display band/order
//
// DETERMINISM: no timestamps, no minted UUIDs, no Date.now/Math.random;
// every array sorted by stated keys; two consecutive runs are byte-identical.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import {
  BAND,
  USE_CASE_META,
  CHECK_CONTENT,
  CRITERIA,
  PIPELINE_STAGES,
} from './fixture_content.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, '../src/data/fixtures');

const DATASET_STATE = { A: 'clean', B: 'buggy', C: 'remediated' };

// Care-team blocked-reason strings (demo-align Task 4): check_id to
// plain-language reason, LOCKED verbatim. A blocking check with no
// entry here is a hard stop (throw), never an invented string.
const BLOCKED_REASONS = {
  device_patient_linkage_cgm: 'device not linked',
  fitness_recency_a1c: 'A1C stale',
  layer1_notnull_fields_smoking: 'smoking status never captured',
  layer1_notnull_fields_encounters: 'record gap at the handoff',
  device_temporal_density_cgm_14d: 'device wear gaps',
  device_derived_metric_consistency_cgm: "device metrics don't reconcile",
  layer2_ranges_numeric_a1c: 'implausible A1C value',
  layer2_value_standards: 'invalid diagnosis code',
  layer3_mapped_values: 'invalid medication code',
  layer5_date_concordance: "encounter dates don't match",
  layer5_date_concordance_a1c: "A1C dates don't match",
};

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`export_fixtures: non-numeric numeric column value ${JSON.stringify(value)}`);
  return n;
}

function byString(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

// Assert a set of rows carries exactly one distinct value for a field —
// never pick silently on disagreement.
function singleValued(rows, field, context) {
  const values = [...new Set(rows.map((r) => r[field]))];
  if (values.length !== 1) {
    throw new Error(
      `export_fixtures: ${context}: field ${field} is not single-valued (got ${JSON.stringify(values)})`,
    );
  }
  return values[0];
}

function interpolate(template, replacements) {
  let out = template;
  for (const [key, value] of Object.entries(replacements)) {
    out = out.replaceAll(`{${key}}`, String(value));
  }
  return out;
}

async function main() {
  if (!process.env.CKM_DIRECT) {
    throw new Error('export_fixtures: CKM_DIRECT is not set');
  }
  const client = new pg.Client({ connectionString: process.env.CKM_DIRECT });
  await client.connect();

  try {
    const sessions = (
      await client.query('SELECT session_id, dataset_state FROM demo_sessions ORDER BY dataset_state')
    ).rows;

    const specs = (
      await client.query(
        'SELECT use_case_name, display_name, use_case_category FROM use_case_specifications ORDER BY use_case_name',
      )
    ).rows;
    const specByName = new Map(specs.map((s) => [s.use_case_name, s]));
    for (const name of Object.keys(USE_CASE_META)) {
      if (!specByName.has(name)) {
        throw new Error(`export_fixtures: USE_CASE_META names '${name}' but no use_case_specifications row exists`);
      }
    }

    const ucrRows = (
      await client.query(
        `SELECT demo_session_id, patient_id, use_case_name, overall_status, fitness_score,
                required_variables, blocking_variables, partial_variables
         FROM use_case_readiness`,
      )
    ).rows;

    const pathwayRows = (
      await client.query(
        `SELECT demo_session_id, patient_id, use_case_name, pathway_result, active_pathway_id
         FROM use_case_pathway_results`,
      )
    ).rows;

    const checkRows = (
      await client.query(
        `SELECT demo_session_id, check_name, patient_id, variable_name, check_scope,
                priority, status, score, threshold, observed_value
         FROM check_results`,
      )
    ).rows;

    const workItems = (
      await client.query(
        `SELECT w.demo_session_id, cr.check_name, w.phenotype, w.responsible_role,
                w.use_case_name, w.status
         FROM remediation_work_items w
         JOIN check_results cr ON cr.check_result_id = w.check_result_id`,
      )
    ).rows;

    fs.mkdirSync(FIXTURES_DIR, { recursive: true });

    for (const { session_id: sessionId, dataset_state: label } of sessions) {
      const datasetState = DATASET_STATE[label];
      if (!datasetState) throw new Error(`export_fixtures: unknown dataset_state ${JSON.stringify(label)}`);

      const sUcr = ucrRows.filter((r) => r.demo_session_id === sessionId);
      const sPathway = pathwayRows.filter((r) => r.demo_session_id === sessionId);
      const sChecks = checkRows.filter((r) => r.demo_session_id === sessionId);
      const sWorkItems = workItems.filter((r) => r.demo_session_id === sessionId);

      // ---- blockers: one per check_name with >=1 FAIL row this session ----
      const failRows = sChecks.filter((r) => r.status === 'FAIL');
      const failByCheck = new Map();
      for (const row of failRows) {
        if (!failByCheck.has(row.check_name)) failByCheck.set(row.check_name, []);
        failByCheck.get(row.check_name).push(row);
      }

      const blockers = [];
      for (const [checkName, fails] of failByCheck) {
        const content = CHECK_CONTENT[checkName];
        if (!content) {
          throw new Error(`export_fixtures: FAILing check '${checkName}' has no CHECK_CONTENT entry`);
        }
        const allRowsForCheck = sChecks.filter((r) => r.check_name === checkName);
        const checkContext = `session ${label}, check ${checkName}`;
        const checkScope = singleValued(allRowsForCheck, 'check_scope', checkContext);
        const priority = singleValued(allRowsForCheck, 'priority', checkContext);
        const threshold = toNumber(singleValued(allRowsForCheck, 'threshold', checkContext));

        const itemsForCheck = sWorkItems.filter((w) => w.check_name === checkName);
        if (itemsForCheck.length === 0) {
          throw new Error(`export_fixtures: ${checkContext}: FAILing check has no work items`);
        }
        const phenotype = singleValued(itemsForCheck, 'phenotype', checkContext);
        const responsibleRole = singleValued(itemsForCheck, 'responsible_role', checkContext);
        const blockedUseCaseName = singleValued(itemsForCheck, 'use_case_name', checkContext);
        const blockedSpec = specByName.get(blockedUseCaseName);
        if (!blockedSpec) {
          throw new Error(`export_fixtures: ${checkContext}: blocked use case '${blockedUseCaseName}' not in config`);
        }

        let recommendationType = content.recommendationType;
        if (recommendationType && typeof recommendationType === 'object') {
          recommendationType = recommendationType[label];
          if (!recommendationType) {
            throw new Error(`export_fixtures: ${checkContext}: no recommendationType for session ${label}`);
          }
        }

        const exampleRow = [...fails].sort((a, b) => byString(a.patient_id, b.patient_id))[0];
        const whatFailedTemplate = content.overrides?.[label]?.whatFailed ?? content.whatFailed;
        const whatUnlocks = content.overrides?.[label]?.whatUnlocks ?? content.whatUnlocks;
        const interpolations = {
          failCount: fails.length,
          cohortSize: allRowsForCheck.length,
        };
        if (whatFailedTemplate.includes('{evidenceExample}')) {
          interpolations.evidenceExample = content.renderEvidence(exampleRow.observed_value);
        }
        const whatFailed = `${interpolate(whatFailedTemplate, interpolations)} Check: ${checkName}`;

        blockers.push({
          blockerId: `blk_${checkName}`,
          recommendationId: `rec_${checkName}`,
          checkName,
          checkScope,
          priority,
          threshold,
          phenotype,
          blockedUseCaseName,
          responsibleRole,
          capabilityBlocked: blockedSpec.display_name,
          recommendationType,
          bugId: content.bugId,
          whatFailed,
          whatUnlocks,
          status: 'FAIL',
          observedValue: null,
        });
      }
      blockers.sort((a, b) => {
        const orderDelta =
          USE_CASE_META[a.blockedUseCaseName].displayOrder - USE_CASE_META[b.blockedUseCaseName].displayOrder;
        return orderDelta !== 0 ? orderDelta : byString(a.checkName, b.checkName);
      });

      // ---- useCases (sorted by displayOrder) ----
      const useCases = Object.entries(USE_CASE_META)
        .sort((a, b) => a[1].displayOrder - b[1].displayOrder)
        .map(([useCaseName, meta]) => {
          const rows = sUcr.filter((r) => r.use_case_name === useCaseName);
          if (rows.length === 0) {
            throw new Error(`export_fixtures: session ${label}: no use_case_readiness rows for ${useCaseName}`);
          }
          const counts = {
            ready: rows.filter((r) => r.overall_status === 'READY').length,
            partiallyReady: rows.filter((r) => r.overall_status === 'PARTIALLY_READY').length,
            notReady: rows.filter((r) => r.overall_status === 'NOT_READY').length,
          };
          const fraction = counts.ready / rows.length;
          const overallStatus =
            fraction === BAND.readyAt
              ? 'READY'
              : fraction >= BAND.partiallyReadyAt
                ? 'PARTIALLY_READY'
                : 'NOT_READY';

          const union = (field) => {
            const set = new Set();
            for (const row of rows) for (const v of row[field] ?? []) set.add(v);
            return [...set].sort(byString);
          };

          const spec = specByName.get(useCaseName);
          return {
            useCaseName,
            displayName: spec.display_name,
            category: spec.use_case_category,
            implementationState: meta.implementationState,
            overallStatus,
            fitnessScore: null,
            pathwayResult: null,
            activePathwayId: null,
            requiredVariables: union('required_variables'),
            blockingVariables: union('blocking_variables'),
            partialVariables: union('partial_variables'),
            patientCounts: counts,
            blockerIds: blockers
              .filter((b) => b.blockedUseCaseName === useCaseName)
              .map((b) => b.blockerId)
              .sort(byString),
          };
        });

      // ---- pipeline stages with mechanical per-session statuses ----
      const openItems = sWorkItems.filter((w) => w.status === 'open').length;
      const allUseCasesReady = useCases.every((u) => u.overallStatus === 'READY');
      const pipeline = PIPELINE_STAGES.map((stage) => {
        let status;
        switch (stage.stageId) {
          case 'remediate':
            status = openItems > 0 ? 'attention' : 'complete';
            break;
          case 'rescore':
            status = datasetState === 'clean' || datasetState === 'remediated' ? 'complete' : 'pending';
            break;
          case 'unlock':
            status = allUseCasesReady
              ? 'complete'
              : datasetState === 'remediated'
                ? 'attention'
                : 'pending';
            break;
          default:
            status = 'complete';
        }
        const view = { stageId: stage.stageId, label: stage.label, description: stage.description, status };
        if (stage.stageId === 'score') {
          // All registry checks appear (demo-align Task 4): FAIL checks
          // keep their per-record detail exactly as before; PASS checks
          // carry a status-only entry and zero records. Check-level
          // status is FAIL iff the check has >=1 FAIL row this session.
          const passEntries = [...new Set(sChecks.map((r) => r.check_name))]
            .filter((checkName) => !failByCheck.has(checkName))
            .map((checkName) => ({ checkName, status: 'PASS' }));
          const failEntries = [...failRows]
            .sort((a, b) => byString(a.check_name, b.check_name) || byString(a.patient_id, b.patient_id))
            .map((r) => ({
              checkName: r.check_name,
              variableName: r.variable_name,
              status: r.status,
              score: toNumber(r.score),
              threshold: toNumber(r.threshold),
              observedValue: CHECK_CONTENT[r.check_name].renderEvidence(r.observed_value),
              priority: r.priority,
              patientId: r.patient_id,
            }));
          view.checkResults = [...passEntries, ...failEntries].sort(
            (a, b) => byString(a.checkName, b.checkName) || byString(a.patientId ?? '', b.patientId ?? ''),
          );
        }
        return view;
      });

      // ---- patientRows: use_case_readiness ⋈ use_case_pathway_results, total ----
      const pathwayByKey = new Map(
        sPathway.map((r) => [`${r.patient_id}|${r.use_case_name}`, r]),
      );
      if (sPathway.length !== sUcr.length) {
        throw new Error(
          `export_fixtures: session ${label}: pathway rows (${sPathway.length}) != readiness rows (${sUcr.length}) — join not total`,
        );
      }
      // blockedReasons support (demo-align Task 4): map each FAILing
      // check to its owning use case (from work items, the same source
      // the blockers use) and index FAIL rows per patient.
      const useCaseByCheck = new Map();
      for (const w of sWorkItems) {
        const existing = useCaseByCheck.get(w.check_name);
        if (existing && existing !== w.use_case_name) {
          throw new Error(
            `export_fixtures: session ${label}: check ${w.check_name} maps to two use cases (${existing}, ${w.use_case_name})`,
          );
        }
        useCaseByCheck.set(w.check_name, w.use_case_name);
      }
      const failsByPatient = new Map();
      for (const row of failRows) {
        if (!failsByPatient.has(row.patient_id)) failsByPatient.set(row.patient_id, []);
        failsByPatient.get(row.patient_id).push(row);
      }

      const patientRows = sUcr
        .map((r) => {
          const pathway = pathwayByKey.get(`${r.patient_id}|${r.use_case_name}`);
          if (!pathway) {
            throw new Error(
              `export_fixtures: session ${label}: no pathway row for (${r.patient_id}, ${r.use_case_name}) — join not total`,
            );
          }
          const row = {
            patientId: r.patient_id,
            useCaseName: r.use_case_name,
            overallStatus: r.overall_status,
            fitnessScore: toNumber(r.fitness_score),
            pathwayResult: pathway.pathway_result,
            activePathwayId: pathway.active_pathway_id,
          };
          if (r.overall_status !== 'READY') {
            // Deduplicated at the check grain, ordered by check_name
            // (deterministic source order).
            const blockingChecks = [
              ...new Set(
                (failsByPatient.get(r.patient_id) ?? [])
                  .filter((f) => useCaseByCheck.get(f.check_name) === r.use_case_name)
                  .map((f) => f.check_name),
              ),
            ].sort(byString);
            row.blockedReasons = blockingChecks.map((checkName) => {
              const reason = BLOCKED_REASONS[checkName];
              if (!reason) {
                throw new Error(
                  `export_fixtures: session ${label}: blocking check '${checkName}' has no BLOCKED_REASONS entry`,
                );
              }
              return reason;
            });
          }
          return row;
        })
        .sort((a, b) => byString(a.useCaseName, b.useCaseName) || byString(a.patientId, b.patientId));

      const data = {
        session: { demoSessionId: sessionId, label, datasetState },
        useCases,
        blockers,
        criteria: CRITERIA,
        pipeline,
        patientRows,
      };

      const outPath = path.join(FIXTURES_DIR, `session-${label.toLowerCase()}.json`);
      fs.writeFileSync(outPath, `${JSON.stringify(data, null, 2)}\n`);

      // ---- per-session summary ----
      const scoreStage = pipeline.find((s) => s.stageId === 'score');
      console.log(`\n=== Session ${label} (${datasetState}) → ${path.relative(process.cwd(), outPath)} ===`);
      console.log(
        `useCases=${useCases.length} blockers=${blockers.length} criteria=${CRITERIA.length} ` +
          `pipelineStages=${pipeline.length} scoreCheckResults=${scoreStage.checkResults.length} patientRows=${patientRows.length}`,
      );
      for (const u of useCases) {
        const total = u.patientCounts.ready + u.patientCounts.partiallyReady + u.patientCounts.notReady;
        console.log(
          `  ${u.useCaseName.padEnd(34)} ${u.overallStatus.padEnd(16)} readyFraction=${(u.patientCounts.ready / total).toFixed(4)} ` +
            `counts=${JSON.stringify(u.patientCounts)}`,
        );
      }
      for (const b of blockers) {
        console.log(`  ${b.blockerId.padEnd(42)} ${b.recommendationType}`);
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(`export_fixtures failed: ${err.message}`);
  process.exit(1);
});
