import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import http from 'node:http';
import { Pool } from 'pg';
import { migrate } from './migration-runner.js';
import { createApp } from './app.js';
const admin = new Pool({ connectionString: process.env.DATABASE_URL });
const name = `ronda_project_qa_${randomUUID().replaceAll('-', '')}`;
const url = new URL(process.env.DATABASE_URL); url.pathname = '/' + name;
const origin = 'https://project-qa.invalid';
let pool, server, base;
async function start() {
  server = http.createServer(createApp({ pool, origin }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
}
async function call(path, method = 'GET', input, account) {
  return fetch(base + path, { method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(account ? { Cookie: account.cookie } : {}) }, ...(input === undefined ? {} : { body: JSON.stringify(input) }) });
}
try {
  await admin.query(`CREATE DATABASE "${name}"`);
  pool = new Pool({ connectionString: url.href }); await migrate(pool); await start();
  const users = [];
  for (let i = 0; i < 4; i++) {
    const response = await call('/api/auth/register', 'POST', { email: `project-${i}@example.invalid`, name: `QA ${i}`, password: randomUUID() + randomUUID() });
    assert.equal(response.status, 200);
    users.push({ ...(await response.json()).user, cookie: response.headers.get('set-cookie').split(';')[0] });
  }
  const [owner, editor, reviewer, outsider] = users;
  const workspace = (await (await call('/api/workspaces', 'GET', undefined, owner)).json()).workspaces[0];
  const workspacePath = `/api/workspaces/${workspace.id}`;
  for (const [member, role] of [[editor, 'editor'], [reviewer, 'reviewer']]) {
    const invite = await (await call(workspacePath + '/invitations', 'POST', { email: member.email, role }, owner)).json();
    assert.equal((await call('/api/workspace-invitations/accept', 'POST', { token: invite.token }, member)).status, 200);
  }
  const privateData = { 'ronda-state:v1': JSON.stringify({ projects: { secret: { name: 'Private only' } }, comments: { private: 'Do not share' } }) };
  await pool.query('INSERT INTO account_data(user_id,data,revision) VALUES($1,$2,8)', [owner.id, privateData]);
  const privateFile = randomUUID();
  await pool.query('INSERT INTO files(id,user_id,name,mime,size) VALUES($1,$2,$3,$4,1)', [privateFile, owner.id, 'private.html', 'text/html']);
  const path = workspacePath + '/projects';
  assert.equal((await call(path)).status, 401);
  assert.equal((await call(path, 'GET', undefined, outsider)).status, 404);
  const input = { name: 'Shared QA', client: 'Synthetic', requestId: randomUUID() };
  assert.equal((await call(path, 'POST', input, reviewer)).status, 403);
  assert.equal((await call(path, 'POST', null, owner)).status, 400);
  const created = await call(path, 'POST', input, editor); assert.equal(created.status, 201);
  const project = (await created.json()).project;
  assert.equal((await (await call(path, 'POST', input, editor)).json()).project.id, project.id);
  const projectPath = `${path}/${project.id}`;
  const listing = await (await call(path, 'GET', undefined, reviewer)).json();
  assert.equal(listing.projects[0].name, 'Shared QA');
  const detail = await (await call(projectPath, 'GET', undefined, reviewer)).json();
  assert.ok(!JSON.stringify(detail).includes('Private only'));
  assert.equal((await call('/api/files/' + privateFile, 'GET', undefined, reviewer)).status, 404);
  assert.equal((await call(projectPath, 'GET', undefined, outsider)).status, 404);
  const otherWorkspace = (await (await call('/api/workspaces', 'GET', undefined, outsider)).json()).workspaces[0];
  assert.equal((await call(`/api/workspaces/${otherWorkspace.id}/projects/${project.id}`, 'GET', undefined, outsider)).status, 404);
  assert.equal((await call(projectPath, 'PATCH', { name: 'forged', client: '', revision: 0, role: 'admin' }, reviewer)).status, 403);
  const updates = await Promise.all([owner, editor].map((user, index) => call(projectPath, 'PATCH', { name: `Edited ${index}`, client: '', revision: 0 }, user)));
  assert.equal(updates.filter(result => result.status === 200).length, 1);
  assert.equal(updates.filter(result => result.status === 409).length, 1);
  const commentInput = { text: 'Team feedback', requestId: randomUUID(), authorId: owner.id };
  const comments = await Promise.all([call(projectPath + '/comments', 'POST', commentInput, reviewer), call(projectPath + '/comments', 'POST', commentInput, reviewer)]);
  const ids = await Promise.all(comments.map(result => result.json()));
  assert.equal(ids[0].id, ids[1].id);
  assert.equal((await pool.query('SELECT author_id FROM shared_project_comments WHERE id=$1', [ids[0].id])).rows[0].author_id, reviewer.id);
  assert.equal((await call(projectPath + '/comments', 'POST', { text: 'Other feedback', requestId: randomUUID() }, owner)).status, 201);
  const commentPath = `${projectPath}/comments/${ids[0].id}`;
  assert.equal((await call(commentPath, 'PATCH', { status: 'resolved', revision: 0 }, reviewer)).status, 403);
  assert.equal((await call(commentPath, 'PATCH', { status: 'resolved', revision: 0 }, editor)).status, 200);
  assert.equal((await call(commentPath, 'PATCH', { status: 'open', revision: 0 }, owner)).status, 409);
  assert.equal((await call(projectPath + '/comments', 'POST', { text: 'Outsider', requestId: randomUUID() }, outsider)).status, 404);
  await new Promise(resolve => server.close(resolve)); server = null;
  await pool.end(); pool = new Pool({ connectionString: url.href }); await start();
  const persisted = await (await call(projectPath, 'GET', undefined, reviewer)).json();
  assert.equal(persisted.comments.length, 2);
  assert.equal(persisted.comments.find(item => item.id === ids[0].id).status, 'resolved');
  assert.equal((await call(`${workspacePath}/members/${reviewer.id}`, 'DELETE', undefined, owner)).status, 200);
  assert.equal((await call(projectPath, 'GET', undefined, reviewer)).status, 404);
  assert.equal((await call(projectPath + '/comments', 'POST', { text: 'Removed', requestId: randomUUID() }, reviewer)).status, 404);
  const original = (await pool.query('SELECT data,revision FROM account_data WHERE user_id=$1', [owner.id])).rows[0];
  assert.deepEqual(original, { data: privateData, revision: 8 });
  console.log('PASS real invitations, shared project/comment visibility across accounts, reviewer limits, cross-workspace isolation, private file/snapshot preservation, idempotency, concurrent revision conflict, server persistence and immediate access revocation.');
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  if (pool) await pool.end();
  await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
  await admin.end();
}
