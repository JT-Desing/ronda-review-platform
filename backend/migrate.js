import { pool } from './database.js';
import { migrateWithRetry } from './migration-runner.js';
try {
  const applied = await migrateWithRetry(pool);
  console.log('migrations_ok', applied.length);
} catch (error) {
  console.error('migration_failed', error.code ?? 'history_or_schema_error');
  process.exitCode = 1;
} finally { await pool.end(); }
