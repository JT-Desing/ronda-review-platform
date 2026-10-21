// Runs the database integration scripts against a disposable PostgreSQL server
// (CI service container or a local QA container), never a production database.
// Scripts built on reviewFixture get their own empty ronda_qa_* database; the
// others create and drop their own from DATABASE_URL.
// Not included: integration.js and data-integration.js need a running API on
// port 3000, and shared-review-backup-integration.js needs a labelled Docker
// QA container for pg_dump. Run those on the PC as described in ARCHITECTURE.md.
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const FIXTURE_SCRIPTS = [
  'shared-link-integration.js', 'shared-media-integration.js', 'shared-comment-integration.js',
  'shared-decision-integration.js', 'shared-version-integration.js', 'shared-review-flow-integration.js',
  'shared-review-model-integration.js', 'shared-cleanup-integration.js',
  'comment-audio-integration.js', 'team-management-integration.js', 'project-trash-integration.js',
];
const SELF_MANAGED_SCRIPTS = ['migration-integration.js', 'workspace-integration.js', 'shared-project-integration.js'];

const adminUrl = process.env.DATABASE_URL;
if (!adminUrl || process.env.RONDA_ALLOW_INTEGRATION !== '1') {
  console.error('Set DATABASE_URL to a disposable server and RONDA_ALLOW_INTEGRATION=1.');
  process.exit(2);
}
const admin = new pg.Pool({ connectionString: adminUrl });
const run = (script, env) => spawnSync(process.execPath, [script], { stdio: 'inherit', env: { ...process.env, ...env } }).status === 0;
const failed = [];

for (const script of FIXTURE_SCRIPTS) {
  const name = `ronda_qa_${randomUUID().replaceAll('-', '')}`;
  const url = new URL(adminUrl); url.pathname = `/${name}`;
  await admin.query(`CREATE DATABASE ${name}`);
  try { if (!run(script, { RONDA_QA_DATABASE_URL: url.href })) failed.push(script); }
  finally { await admin.query(`DROP DATABASE ${name} WITH (FORCE)`); }
}
for (const script of SELF_MANAGED_SCRIPTS) if (!run(script, {})) failed.push(script);
await admin.end();

if (failed.length) { console.error(`FAIL ${failed.length} integration script(s): ${failed.join(', ')}`); process.exit(1); }
console.log(`PASS ${FIXTURE_SCRIPTS.length + SELF_MANAGED_SCRIPTS.length} integration scripts.`);
