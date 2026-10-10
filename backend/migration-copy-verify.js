import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Pool } from 'pg';
import { migrate } from './migration-runner.js';
const name = 'ronda_migration_copy_qa';
const url = new URL(process.env.DATABASE_URL);
url.pathname = '/' + name;
const copy = new Pool({ connectionString: url.href });
const admin = new Pool({ connectionString: process.env.DATABASE_URL });
async function fingerprint() {
  const snapshot = {};
  const tables = (await copy.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'schema_migrations' ORDER BY tablename")).rows.map(row => row.tablename);
  for (const table of tables) {
    const result = await copy.query(`SELECT row_to_json(t)::text AS row FROM "${table.replaceAll('"', '""')}" t ORDER BY row_to_json(t)::text`);
    snapshot[table] = { hash: createHash('sha256').update(JSON.stringify(result.rows)).digest('hex'), count: result.rows.length };
  }
  return snapshot;
}
try {
  const before = await fingerprint();
  await migrate(copy);
  const after = await fingerprint();
  for (const table of Object.keys(before)) assert.deepEqual(after[table], before[table]);
  for (const table of Object.keys(after)) if (!before[table]) assert.equal(after[table].count, 0);
  assert.deepEqual(await migrate(copy), []);
  console.log('PASS restored PC database copy migrated twice; all existing application rows unchanged.');
} finally {
  await copy.end();
  await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
  await admin.end();
}
