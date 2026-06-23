// scoring/lib/db.js
// Shared Postgres pool for the deterministic scoring engine.
//
// Reads CKM_DIRECT from the environment (set in ~/.zshrc on Studio, or a local
// .env) — the direct, non-pooler connection to the ckm_readiness database. This
// mirrors the connection convention in scripts/reset_session.js and
// scripts/load_dataset.js. Do NOT introduce DATABASE_URL or POSTGRES_* here;
// CKM_DIRECT is the single source of truth for the DB connection.

import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const CONNECTION = process.env.CKM_DIRECT;
if (!CONNECTION) {
  console.error('\nError: CKM_DIRECT environment variable not set.');
  console.error('Set it in ~/.zshrc (Studio) or a local .env. Never hardcode credentials.\n');
  process.exit(1);
}

// One shared pool for the whole engine process.
export const pool = new Pool({ connectionString: CONNECTION });

/**
 * Run `fn` inside a single transaction. Commits on success; rolls back and
 * re-throws on any error. The callback receives a dedicated client checked out
 * of the pool, which is always released.
 *
 * @param {(client: import('pg').PoolClient) => Promise<T>} fn
 * @returns {Promise<T>}
 * @template T
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
