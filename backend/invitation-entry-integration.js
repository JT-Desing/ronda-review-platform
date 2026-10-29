import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import http from 'node:http';
import { Pool } from 'pg';
import { migrate } from './migration-runner.js';
import { createApp } from './app.js';
const admin = new Pool({ connectionString: process.env.DATABASE_URL });
const name = `ronda_invite_qa_${randomUUID().replaceAll('-', '')}`;
const url = new URL(process.env.DATABASE_URL); url.pathname = '/' + name;
const origin = 'https://invite-qa.invalid';
let pool, server;
try {
  await admin.query(`CREATE DATABASE "${name}"`);
  pool = new Pool({ connectionString: url.href }); await migrate(pool);
  server = http.createServer(createApp({ pool, origin }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (path, method = 'GET', input, cookie) => fetch(base + path, { method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, ...(input === undefined ? {} : { body: JSON.stringify(input) }) });
  const json = async response => ({ status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] });
  const register = async (email, label) => json(await call('/api/auth/register', 'POST', { email, name: label, password: randomUUID() + randomUUID() }));
  const owner = await register('owner@example.invalid', 'Owner');
  const existing = await register('ya-existe@example.invalid', 'Ya Existe');
  const team = (await json(await call('/api/workspaces', 'POST', { name: 'Equipo Invitaciones', requestId: randomUUID(), plan: 'agencia' }, owner.cookie))).body.workspace.id;
  await pool.query("UPDATE workspaces SET plan_status='active' WHERE id=$1", [team]);
  const invite = async input => (await json(await call(`/api/workspaces/${team}/invitations`, 'POST', input, owner.cookie))).body;
  const preview = async value => json(await call('/api/workspace-invitations/preview', 'POST', { token: value }));

  // Name filled by the admin: one click creates the account, joins the team and signs in.
  const full = await invite({ email: 'Nueva@Example.invalid', name: '  Ana Revisora ', role: 'reviewer' });
  assert.equal(full.invitation.name, 'Ana Revisora');
  const shown = await preview(full.token);
  assert.equal(shown.status, 200);
  assert.deepEqual({ ...shown.body }, { email: 'nueva@example.invalid', role: 'reviewer', name: 'Ana Revisora', workspaceName: 'Equipo Invitaciones', accountExists: false, oneClick: true });
  const entered = await json(await call('/api/workspace-invitations/enter', 'POST', { token: full.token }));
  assert.equal(entered.status, 200); assert.equal(entered.body.workspaceId, team); assert.ok(entered.cookie);
  const session = await json(await call('/api/auth/session', 'GET', undefined, entered.cookie));
  assert.equal(session.body.user.email, 'nueva@example.invalid');
  const spaces = (await json(await call('/api/workspaces', 'GET', undefined, entered.cookie))).body.workspaces;
  assert.ok(spaces.some(space => space.id === team && space.role === 'reviewer'));
  assert.ok(spaces.some(space => space.kind === 'personal'));
  assert.equal((await call('/api/workspace-invitations/enter', 'POST', { token: full.token })).status, 404);
  assert.equal((await preview(full.token)).status, 404);

  // Email only: no one-click entry; the person registers with that address and accepts.
  const emailOnly = await invite({ email: 'solo-correo@example.invalid', role: 'editor' });
  assert.equal((await preview(emailOnly.token)).body.oneClick, false);
  assert.equal((await call('/api/workspace-invitations/enter', 'POST', { token: emailOnly.token })).status, 409);
  const registered = await register('solo-correo@example.invalid', 'Solo Correo');
  assert.equal((await call('/api/workspace-invitations/accept', 'POST', { token: emailOnly.token }, registered.cookie)).status, 200);

  // A name never signs in to an account that already exists.
  const taken = await invite({ email: 'ya-existe@example.invalid', name: 'Suplantación', role: 'admin' });
  const takenPreview = (await preview(taken.token)).body;
  assert.equal(takenPreview.accountExists, true); assert.equal(takenPreview.oneClick, false);
  const refused = await json(await call('/api/workspace-invitations/enter', 'POST', { token: taken.token }));
  assert.equal(refused.status, 409); assert.equal(refused.cookie, undefined);
  assert.equal((await call('/api/workspace-invitations/accept', 'POST', { token: taken.token }, existing.cookie)).status, 200);

  assert.equal((await preview('x'.repeat(43))).status, 404);
  assert.equal((await preview('corto')).status, 400);
  assert.equal((await call(`/api/workspace-invitations/preview?token=${full.token}`)).status, 405);
  assert.equal((await call(`/api/workspaces/${team}/invitations`, 'POST', { email: 'largo@example.invalid', name: 'n'.repeat(101), role: 'reviewer' }, owner.cookie)).status, 400);
  console.log('PASS invitation entry: one-click account with session, email-only registration, existing accounts protected, single use.');
} finally {
  await new Promise(resolve => server ? server.close(resolve) : resolve());
  await pool?.end();
  await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await admin.end();
}
