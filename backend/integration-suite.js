// Runs the database integration scripts against a disposable PostgreSQL server
// (CI service container or a local QA container), never a production database.
// Scripts built on reviewFixture get their own labelled QA container (needs
// Docker); the others create and drop their own database from DATABASE_URL.
// Not included: integration.js and data-integration.js need a running API on
// port 3000, and shared-review-backup-integration.js needs a labelled Docker
// QA container for pg_dump. Run those on the PC as described in ARCHITECTURE.md.
import { spawnSync } from 'node:child_process';

const FIXTURE_SCRIPTS = [
  'shared-link-integration.js', 'shared-media-integration.js', 'shared-comment-integration.js',
  'shared-decision-integration.js', 'shared-version-integration.js', 'shared-review-flow-integration.js',
  'shared-review-model-integration.js', 'shared-cleanup-integration.js',
  'comment-audio-integration.js', 'team-management-integration.js', 'project-trash-integration.js',
];
// workspace-integration.js is out until it is rewritten for 4f5eada: workspace
// detail and member management are now superadmin-only (platform-view-policy.js),
// and the script still expects team admins to use them.
const SELF_MANAGED_SCRIPTS = ['migration-integration.js', 'shared-project-integration.js'];

const adminUrl = process.env.DATABASE_URL;
if (!adminUrl || process.env.RONDA_ALLOW_INTEGRATION !== '1') {
  console.error('Set DATABASE_URL to a disposable server and RONDA_ALLOW_INTEGRATION=1.');
  process.exit(2);
}
const run = (script, env, args = []) => spawnSync(process.execPath, [script, ...args], { stdio: 'inherit', env: { ...process.env, ...env } }).status === 0;
const failed = [];

// reviewFixture only accepts a labelled QA container (qa-db-target.js), so each
// fixture script runs through shared-review-qa-runner.js, which creates one.
for (const script of FIXTURE_SCRIPTS) if (!run('shared-review-qa-runner.js', {}, [script])) failed.push(script);
for (const script of SELF_MANAGED_SCRIPTS) if (!run(script, {})) failed.push(script);

if (failed.length) { console.error(`FAIL ${failed.length} integration script(s): ${failed.join(', ')}`); process.exit(1); }
console.log(`PASS ${FIXTURE_SCRIPTS.length + SELF_MANAGED_SCRIPTS.length} integration scripts.`);
