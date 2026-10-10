import test from 'node:test';
import assert from 'node:assert/strict';
import { migrate, migrateWithRetry, readMigrations } from './migration-runner.js';

test('only transient startup failures retry with bounded exponential backoff', async () => {
  let calls = 0;
  const waits = [];
  assert.deepEqual(await migrateWithRetry({}, {
    run: async () => { if (++calls < 3) throw Object.assign(new Error('offline'), { code: 'ECONNREFUSED' }); return []; },
    wait: async value => waits.push(value),
  }), []);
  assert.deepEqual(waits, [500, 1000]);
  calls = 0;
  await assert.rejects(migrateWithRetry({}, { run: async () => { calls++; throw new Error('history mismatch'); }, wait: async () => {} }));
  assert.equal(calls, 1);
  calls = 0;
  await assert.rejects(migrateWithRetry({}, { run: async () => { calls++; throw Object.assign(new Error('offline'), { code: 'ECONNREFUSED' }); }, wait: async () => {} }));
  assert.equal(calls, 5);
});

function fake(applied = [], failSql = null) {
  const calls = [];
  let released = false;
  const client = { async query(sql) {
    calls.push(sql);
    if (sql === failSql) throw new Error('fixture failure');
    return { rows: sql.startsWith('SELECT name,checksum') ? applied : [] };
  }, release() { released = true; } };
  return { pool: { async connect() { return client; } }, calls, get released() { return released; } };
}
test('immutable migration files load in order', async () => {
  const migrations = await readMigrations();
  assert.equal(migrations[0].name, '0001_baseline.sql');
  assert.match(migrations[0].checksum, /^[a-f0-9]{64}$/);
});
test('applied migrations are not rerun', async () => {
  const files = await readMigrations();
  const db = fake(files);
  assert.deepEqual(await migrate(db.pool, files), []);
  assert.ok(!db.calls.includes(files[0].sql));
  assert.equal(db.calls.at(-1), 'COMMIT');
  assert.ok(db.released);
});
test('modified or missing history fails closed and rolls back', async () => {
  const files = await readMigrations();
  for (const history of [[{ name: files[0].name, checksum: 'modified' }], [{ name: 'missing.sql', checksum: 'missing' }]]) {
    const db = fake(history);
    await assert.rejects(migrate(db.pool, files), /history mismatch/);
    assert.equal(db.calls.at(-1), 'ROLLBACK');
    assert.ok(db.released);
  }
});
test('SQL failure cannot record a completed migration', async () => {
  const files = await readMigrations();
  const db = fake([], files[0].sql);
  await assert.rejects(migrate(db.pool, files), /fixture failure/);
  assert.equal(db.calls.at(-1), 'ROLLBACK');
  assert.ok(!db.calls.some(sql => sql.startsWith('INSERT INTO schema_migrations')));
  assert.ok(db.released);
});
