#!/usr/bin/env node
/**
 * CKM Data Readiness — Session Reset
 * =====================================
 * Clears all data for a specific demo session from Tier 4 → Tier 1.
 * Deactivates the session record. Raw CSV files on disk are untouched.
 *
 * This enables unlimited demo resets without data corruption.
 *
 * Usage:
 *   node reset_session.js --session <session-uuid>
 *   node reset_session.js --session <session-uuid> --keep-session
 *
 * --keep-session (ext): preserve the demo_sessions row COMPLETELY untouched —
 * skips the is_active=FALSE deactivation, so the anchor row stays
 * byte-identical for a fixed-anchor reload (load_dataset.js --session).
 * The row is never deleted in either mode.
 *
 * To reset ALL sessions (full wipe):
 *   node reset_session.js --all
 *
 * Requires CKM_DIRECT environment variable (set in .env file).
 */

require('dotenv').config();
const { Client } = require('pg');

const args = process.argv.slice(2);
const sessionIdx = args.indexOf('--session');
const allFlag = args.includes('--all');
const keepSession = args.includes('--keep-session');

const CONNECTION = process.env.CKM_DIRECT;
if (!CONNECTION) {
  console.error('\nError: CKM_DIRECT environment variable not set.\n');
  process.exit(1);
}

if (!allFlag && sessionIdx === -1) {
  console.error('\nUsage:');
  console.error('  node reset_session.js --session <session-uuid>');
  console.error('  node reset_session.js --all\n');
  process.exit(1);
}

const SESSION_ID = allFlag ? null : args[sessionIdx + 1];

async function resetSession(client, sessionId, keep) {
  console.log(`\n  Resetting session: ${sessionId}`);

  // Delete in reverse tier order to respect FK constraints
  const deleteSteps = [
    // Tier 4
    ['use_case_readiness',        `DELETE FROM use_case_readiness WHERE demo_session_id = $1`],
    ['fhir_bundles',              `DELETE FROM fhir_bundles WHERE demo_session_id = $1`],
    // Tier 3
    ['use_case_pathway_results',  `DELETE FROM use_case_pathway_results WHERE demo_session_id = $1`],
    ['remediation_work_items',    `DELETE FROM remediation_work_items WHERE demo_session_id = $1`],
    ['patch_records',             `DELETE FROM patch_records WHERE demo_session_id = $1`],
    ['variable_readiness_scores', `DELETE FROM variable_readiness_scores WHERE demo_session_id = $1`],
    ['check_results',             `DELETE FROM check_results WHERE demo_session_id = $1`],
    // Tier 2
    ['normalized_fields',         `DELETE FROM normalized_fields WHERE demo_session_id = $1`],
    // Tier 1 (reverse load order)
    ['weight_readings',           `DELETE FROM weight_readings WHERE demo_session_id = $1`],
    ['bp_readings',               `DELETE FROM bp_readings WHERE demo_session_id = $1`],
    ['cgm_window_metadata',       `DELETE FROM cgm_window_metadata WHERE demo_session_id = $1`],
    ['cgm_readings',              `DELETE FROM cgm_readings WHERE demo_session_id = $1`],
    ['observations',              `DELETE FROM observations WHERE demo_session_id = $1`],
    ['medications',               `DELETE FROM medications WHERE demo_session_id = $1`],
    ['conditions',                `DELETE FROM conditions WHERE demo_session_id = $1`],
    ['encounters',                `DELETE FROM encounters WHERE demo_session_id = $1`],
    ['providers',                 `DELETE FROM providers WHERE demo_session_id = $1`],
    ['patients',                  `DELETE FROM patients WHERE demo_session_id = $1`],
  ];

  for (const [table, sql] of deleteSteps) {
    const result = await client.query(sql, [sessionId]);
    if (result.rowCount > 0) {
      console.log(`  ✓  ${table.padEnd(28)} ${result.rowCount} rows deleted`);
    }
  }

  if (keep) {
    // ext --keep-session: the demo_sessions row is left completely
    // untouched (no deactivation) — fixed-anchor reload path.
    console.log(`  ✓  demo_session row preserved untouched (--keep-session)`);
  } else {
    // Deactivate session
    await client.query(
      `UPDATE demo_sessions SET is_active = FALSE WHERE session_id = $1`,
      [sessionId]
    );
    console.log(`  ✓  demo_session deactivated`);
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   CKM Data Readiness — Session Reset    ║');
  console.log('╚════════════════════════════════════════╝');

  const client = new Client({ connectionString: CONNECTION });

  try {
    await client.connect();
    console.log('\n  ✓ Connected to Neon (ckm_readiness)');

    await client.query('BEGIN');

    if (allFlag) {
      // Reset all active sessions
      const sessions = await client.query(
        `SELECT session_id, dataset_state, created_at FROM demo_sessions WHERE is_active = TRUE`
      );

      if (sessions.rows.length === 0) {
        console.log('\n  No active sessions found. Nothing to reset.\n');
        await client.query('ROLLBACK');
        return;
      }

      console.log(`\n  Found ${sessions.rows.length} active session(s) to reset:`);
      for (const row of sessions.rows) {
        console.log(`  • ${row.session_id} (Dataset ${row.dataset_state}, created ${row.created_at.toISOString()})`);
      }

      for (const row of sessions.rows) {
        await resetSession(client, row.session_id, keepSession);
      }
    } else {
      // Verify session exists
      const check = await client.query(
        `SELECT session_id, dataset_state FROM demo_sessions WHERE session_id = $1`,
        [SESSION_ID]
      );
      if (check.rows.length === 0) {
        console.error(`\n  ❌ Session not found: ${SESSION_ID}\n`);
        await client.query('ROLLBACK');
        process.exit(1);
      }
      await resetSession(client, SESSION_ID, keepSession);
    }

    await client.query('COMMIT');
    console.log('\n  ✅ Reset complete. Ready for next demo load.\n');

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\n  ❌ Reset failed — transaction rolled back.');
    console.error(`  Error: ${err.message}\n`);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
