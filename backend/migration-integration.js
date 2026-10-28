import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { migrate, readMigrations } from './migration-runner.js';

// Always isolated: production tables are never changed by this test.
const admin = new Pool({ connectionString: process.env.DATABASE_URL });
const name = `ronda_migration_qa_${randomUUID().replaceAll('-', '')}`;
const url = new URL(process.env.DATABASE_URL);
url.pathname = '/' + name;
let qa;
try {
  await admin.query(`CREATE DATABASE "${name}"`);
  qa = new Pool({ connectionString: url.href });
  const files = await readMigrations();
  const results = await Promise.all([migrate(qa, files), migrate(qa, files)]);
  assert.equal(results.flat().length, files.length);
  const user = (await qa.query("INSERT INTO users(email,name,password_hash) VALUES('migration@example.invalid','Fixture','not-a-real-password') RETURNING id")).rows[0];
  await qa.query('INSERT INTO account_data(user_id,data,revision) VALUES($1,$2,7)', [user.id, { fixture: 'preserve' }]);
  assert.deepEqual(await migrate(qa, files), []);
  assert.equal((await qa.query('SELECT revision FROM account_data WHERE user_id=$1', [user.id])).rows[0].revision, 7);
  await assert.rejects(migrate(qa, [{ ...files[0], checksum: 'modified' }]));
  const broken = { name: '9999_failure.sql', checksum: 'fixture', sql: 'CREATE TABLE qa_rollback(id integer); SELECT nonexistent_fixture();' };
  await assert.rejects(migrate(qa, [...files, broken]));
  assert.equal((await qa.query("SELECT to_regclass('qa_rollback') AS table_name")).rows[0].table_name, null);
  assert.equal((await qa.query('SELECT count(*)::integer AS count FROM schema_migrations')).rows[0].count, files.length);
  // Adoption of a legacy schema: remove only QA ledger, preserving QA rows.
  await qa.query('DROP TABLE schema_migrations');
  // Keep baseline only as a legacy-schema simulation; additive new tables remain.
  assert.deepEqual(await migrate(qa, files.slice(0, 1)), ['0001_baseline.sql']);
  assert.deepEqual((await qa.query('SELECT data,revision FROM account_data WHERE user_id=$1', [user.id])).rows[0], { data: { fixture: 'preserve' }, revision: 7 });
  console.log('PASS fresh database, concurrent migration, idempotency, drift rejection, atomic rollback and legacy adoption with data preserved.');
} finally {
  if (qa) await qa.end();
  await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
  await admin.end();
}
