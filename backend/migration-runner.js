import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

export async function migrateWithRetry(pool, { run = migrate, wait = delay } = {}) {
  for (let attempt = 0; ; attempt++) {
    try { return await run(pool); }
    catch (error) {
      if (attempt >= 4 || !['ECONNREFUSED', 'ECONNRESET', '57P03'].includes(error.code)) throw error;
      await wait(500 * 2 ** attempt);
    }
  }
}

export async function readMigrations(directory = new URL('./migrations/', import.meta.url)) {
  const names = (await readdir(directory)).filter(name => name.endsWith('.sql')).sort();
  if (!names.length || names.some(name => !/^\d{4}_[a-z0-9_]+\.sql$/.test(name)) || new Set(names.map(name => name.slice(0, 4))).size !== names.length) throw new Error('Invalid migration sequence');
  return Promise.all(names.map(async name => {
    const sql = (await readFile(new URL(name, directory), 'utf8')).replace(/\r\n/g, '\n');
    return { name, sql, checksum: createHash('sha256').update(sql).digest('hex') };
  }));
}

export async function migrate(pool, migrations = undefined) {
  const files = migrations ?? await readMigrations();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '10s'");
    await client.query("SET LOCAL statement_timeout = '60s'");
    // Transaction-scoped lock serializes deploys and releases even on failure.
    await client.query('SELECT pg_advisory_xact_lock(72840119)');
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    const applied = (await client.query('SELECT name,checksum FROM schema_migrations ORDER BY name')).rows;
    for (let index = 0; index < applied.length; index++) {
      if (files[index]?.name !== applied[index].name || files[index]?.checksum !== applied[index].checksum) throw new Error('Migration history mismatch; restore immutable files');
    }
    const pending = files.slice(applied.length);
    for (const migration of pending) {
      await client.query(migration.sql);
      await client.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)', [migration.name, migration.checksum]);
    }
    await client.query('COMMIT');
    return pending.map(file => file.name);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { client.release(); }
}
