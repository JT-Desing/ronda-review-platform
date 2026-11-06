import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { migrate } from './migration-runner.js';
import { publishOutboxBatch, outboxBacklog } from './event-outbox.js';

// Isolated database: created and dropped here, never a production one.
const admin = new Pool({ connectionString: process.env.DATABASE_URL });
const name = `ronda_outbox_qa_${randomUUID().replaceAll('-', '')}`;
const url = new URL(process.env.DATABASE_URL);
url.pathname = '/' + name;
let qa;
try {
  await admin.query(`CREATE DATABASE "${name}"`);
  qa = new Pool({ connectionString: url.href });
  await migrate(qa);
  const user = (await qa.query("INSERT INTO users(email,name,password_hash) VALUES('outbox@example.invalid','Fixture','x') RETURNING id")).rows[0].id;
  const space = (await qa.query("INSERT INTO workspaces(name) VALUES('Outbox QA') RETURNING id")).rows[0].id;
  const project = randomUUID();
  const log = (action, details) => qa.query('INSERT INTO workspace_events(workspace_id,actor_id,action,details) VALUES($1,$2,$3,$4) RETURNING id', [space, user, action, details]);

  // A rolled-back change leaves no event behind: same transaction as the write.
  const tx = await qa.connect();
  await tx.query('BEGIN');
  await tx.query("INSERT INTO workspace_events(workspace_id,actor_id,action) VALUES($1,$2,'qa.rolled_back')", [space, user]);
  await tx.query('ROLLBACK');
  tx.release();

  const first = (await log('workspace.created', { name: 'Outbox QA' })).rows[0].id;
  await log('project.created', { projectId: project, name: 'P' });
  await log('project.comment_created', { projectId: 'not-a-uuid' });
  const rows = (await qa.query('SELECT event_id,event_type,aggregate_type,aggregate_id FROM event_outbox ORDER BY seq')).rows;
  assert.deepEqual(rows.map(r => [r.event_type, r.aggregate_type]), [['workspace.created', 'workspace'], ['project.created', 'project'], ['project.comment_created', 'workspace']]);
  assert.equal(rows[0].event_id, first);
  assert.equal(rows[1].aggregate_id, project);
  assert.equal((await outboxBacklog(qa)).pending, 3);

  // A failing handler keeps the event pending with a delay; the others are published in order.
  const seen = [];
  const result = await publishOutboxBatch(qa, async event => { if (event.type === 'project.created') throw new Error('consumer down'); seen.push(event.type); });
  assert.deepEqual(result, { published: 2, failed: 1 });
  assert.deepEqual(seen, ['workspace.created', 'project.comment_created']);
  const failed = (await qa.query("SELECT attempts,last_error,available_at>now() AS delayed FROM event_outbox WHERE event_type='project.created'")).rows[0];
  assert.deepEqual(failed, { attempts: 1, last_error: 'consumer down', delayed: true });
  assert.deepEqual(await publishOutboxBatch(qa, () => assert.fail('delayed event delivered early')), { published: 0, failed: 0 });

  // Two publishers at once never take the same row.
  await qa.query('UPDATE event_outbox SET available_at=now()');
  for (let i = 0; i < 20; i++) await log('qa.bulk', { i });
  const delivered = [];
  const take = () => publishOutboxBatch(qa, async event => { delivered.push(event.eventId); await new Promise(r => setTimeout(r, 5)); }, { limit: 11 });
  await Promise.all([take(), take()]);
  assert.equal(delivered.length, 21);
  assert.equal(new Set(delivered).size, 21);
  assert.equal((await outboxBacklog(qa)).pending, 0);

  // Deleting the workspace erases its history table rows but not undelivered outbox rows.
  await log('qa.last', {});
  await qa.query('DELETE FROM workspaces WHERE id=$1', [space]);
  assert.equal((await qa.query('SELECT count(*)::int AS n FROM workspace_events')).rows[0].n, 0);
  assert.equal((await outboxBacklog(qa)).pending, 1);
  console.log('PASS outbox: same-transaction capture, aggregate mapping, retry with backoff, concurrent publishers without duplicates, survives workspace deletion.');
} finally {
  if (qa) await qa.end();
  await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
  await admin.end();
}
