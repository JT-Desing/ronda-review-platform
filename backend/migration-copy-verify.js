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
    const result = await copy.query(
      'SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position',
      ['public', table],
    );
    snapshot[table] = result.rows.map(({ column_name }) => column_name);
  }
  return snapshot;
}
async function fingerprintRows(columnsByTable) {
  const snapshot = {};
  for (const [table, columns] of Object.entries(columnsByTable)) {
    const identifier = value => `"${value.replaceAll('"', '""')}"`;
    const selected = columns.map(identifier).join(', ');
    const result = await copy.query(`SELECT ${selected} FROM ${identifier(table)}`);
    const rows = result.rows.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
    snapshot[table] = { hash: createHash('sha256').update(JSON.stringify(rows)).digest('hex'), count: rows.length };
  }
  return snapshot;
}
try {
  const columnsBefore = await fingerprint();
  const before = await fingerprintRows(columnsBefore);
  await migrate(copy);
  const columnsAfter = await fingerprint();
  const after = await fingerprintRows(columnsBefore);
  for (const table of Object.keys(columnsBefore)) {
    assert.ok(columnsAfter[table], `pre-existing table ${table} was removed`);
    assert.deepEqual(after[table], before[table], `pre-existing rows changed in ${table}`);
  }
  for (const table of Object.keys(columnsAfter)) {
    if (!columnsBefore[table]) {
      const result = await copy.query(`SELECT COUNT(*)::int AS count FROM "${table.replaceAll('"', '""')}"`);
      assert.equal(result.rows[0].count, 0, `new table ${table} must start empty`);
    }
  }
  assert.deepEqual(await migrate(copy), []);
  console.log('PASS restored PC database copy migrated twice; all existing application rows unchanged.');
} finally {
  await copy.end();
  await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
  await admin.end();
}
