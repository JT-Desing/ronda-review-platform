import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import http from 'node:http';
import { Pool } from 'pg';
import { migrate } from './migration-runner.js';
import { createApp } from './app.js';
const admin = new Pool({ connectionString: process.env.DATABASE_URL });
const name = `ronda_workspace_qa_${randomUUID().replaceAll('-', '')}`;
const url = new URL(process.env.DATABASE_URL); url.pathname = '/' + name;
const origin = 'https://workspace-qa.invalid';
let pool, server;
try {
  await admin.query(`CREATE DATABASE "${name}"`);
  pool = new Pool({ connectionString: url.href }); await migrate(pool);
  server = http.createServer(createApp({ pool, origin }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function call(path, method = 'GET', input, account) {
    return fetch(base + path, { method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(account ? { Cookie: account.cookie } : {}) }, ...(input === undefined ? {} : { body: JSON.stringify(input) }) });
  }
  const users = [];
  for (let i = 0; i < 3; i++) {
    const response = await call('/api/auth/register', 'POST', { email: `workspace-${i}@example.invalid`, name: `QA ${i}`, password: randomUUID() + randomUUID() });
    assert.equal(response.status, 200);
    users.push({ ...(await response.json()).user, cookie: response.headers.get('set-cookie').split(';')[0] });
  }
  const [owner, invited, outsider] = users;
  assert.equal((await call('/api/workspaces')).status, 401);
  const workspace = (await (await call('/api/workspaces', 'GET', undefined, owner)).json()).workspaces[0];
  const path = `/api/workspaces/${workspace.id}`;
  assert.equal((await call(path, 'GET', undefined, outsider)).status, 404);
  const response = await call(path + '/invitations', 'POST', { email: invited.email, role: 'reviewer' }, owner);
  assert.equal(response.status, 201); const invitation = await response.json();
  assert.equal((await call(path + '/invitations', 'POST', { email: invited.email, role: 'reviewer' }, owner)).status, 409);
  const detail = await (await call(path, 'GET', undefined, owner)).json();
  assert.ok(!JSON.stringify(detail).includes(invitation.token));
  assert.equal((await call('/api/workspace-invitations/accept', 'POST', { token: invitation.token }, outsider)).status, 403);
  assert.equal((await call('/api/workspace-invitations/accept', 'POST', { token: invitation.token }, invited)).status, 200);
  assert.equal((await call('/api/workspace-invitations/accept', 'POST', { token: invitation.token }, invited)).status, 404);
  assert.equal((await call(path, 'GET', undefined, invited)).status, 200);
  assert.equal((await call(path + '/invitations', 'POST', { email: outsider.email, role: 'admin' }, invited)).status, 403);
  assert.equal((await call(`${path}/members/${owner.id}`, 'PATCH', { role: 'admin' }, invited)).status, 403);
  assert.equal((await call(`${path}/members/${owner.id}`, 'DELETE', undefined, owner)).status, 409);
  assert.equal((await call(`${path}/members/${owner.id}`, 'PATCH', { role: 'reviewer' }, owner)).status, 409);
  assert.equal((await call(`${path}/members/${invited.id}`, 'PATCH', { role: 'owner' }, owner)).status, 400);
  assert.equal((await call(`${path}/members/${invited.id}`, 'PATCH', { role: 'admin' }, owner)).status, 200);
  const race = await Promise.all([
    call(`${path}/members/${owner.id}`, 'PATCH', { role: 'reviewer' }, owner),
    call(`${path}/members/${invited.id}`, 'PATCH', { role: 'reviewer' }, invited),
  ]);
  assert.equal(race.filter(result => result.status === 200).length, 1);
  const realAdmin = (await pool.query("SELECT user_id FROM workspace_members WHERE workspace_id=$1 AND role='admin'", [workspace.id])).rows[0].user_id;
  const manager = users.find(user => user.id === realAdmin), other = manager.id === owner.id ? invited : owner;
  assert.equal((await call(`${path}/members/${other.id}`, 'DELETE', undefined, manager)).status, 200);
  assert.equal((await call(path, 'GET', undefined, other)).status, 404);
  const revoked = await (await call(path + '/invitations', 'POST', { email: other.email, role: 'editor' }, manager)).json();
  assert.equal((await call(`${path}/invitations/${revoked.invitation.id}`, 'DELETE', undefined, manager)).status, 200);
  assert.equal((await call('/api/workspace-invitations/accept', 'POST', { token: revoked.token }, other)).status, 404);
  const expired = await (await call(path + '/invitations', 'POST', { email: other.email, role: 'editor' }, manager)).json();
  await pool.query("UPDATE workspace_invitations SET expires_at=now()-interval '1 second' WHERE id=$1", [expired.invitation.id]);
  assert.equal((await call('/api/workspace-invitations/accept', 'POST', { token: expired.token }, other)).status, 404);
  const audit = await (await call(path, 'GET', undefined, manager)).json();
  assert.ok(audit.events.some(event => event.action === 'member.role_changed'));
  assert.ok(audit.events.some(event => event.action === 'invitation.accepted'));
  for (let i = 0; i < 19; i++) assert.equal((await call(path + '/invitations', 'POST', { email: `capacity-${i}@example.invalid`, role: 'reviewer' }, manager)).status, 201);
  assert.equal((await call(path + '/invitations', 'POST', { email: 'over-capacity@example.invalid', role: 'reviewer' }, manager)).status, 409);
  console.log('PASS isolated workspace registration, invitations, token safety, email match, expiry/revoke/replay, role boundaries, concurrent last-admin protection, removal and history.');
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  if (pool) await pool.end();
  await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
  await admin.end();
}
