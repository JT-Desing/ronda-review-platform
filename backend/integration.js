import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { Pool } from 'pg';
const base = 'http://127.0.0.1:3000';
const headers = { 'Content-Type': 'application/json', Origin: process.env.APP_ORIGIN };
const call = (path, input, extra = {}) => fetch(base + path, { method: 'POST', headers: { ...headers, ...extra }, body: JSON.stringify(input) });
const file = '/tmp/ronda-auth-qa.json';
if (process.argv[2] === 'prepare') {
  const email = `qa-${randomUUID()}@example.invalid`;
  const password = randomUUID() + randomUUID();
  const denied = await call('/api/auth/register', {}, { Origin: 'https://attacker.invalid' });
  assert.equal(denied.status, 403);
  const response = await call('/api/auth/register', { email, password, name: 'QA isolated account' });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie');
  assert.ok(cookie.includes('HttpOnly') && cookie.includes('Secure') && cookie.includes('SameSite=Lax'));
  const user = (await response.json()).user;
  assert.equal(user.email, email);
  assert.equal(user.password_hash, undefined);
  const wrong = await call('/api/auth/login', { email, password: 'wrong-password-123' });
  assert.equal(wrong.status, 401);
  const login = await call('/api/auth/login', { email, password });
  assert.equal(login.status, 200);
  writeFileSync(file, JSON.stringify({ cookie: cookie.split(';')[0], user }), { mode: 0o600 });
  console.log('PASS register, login, invalid password, origin and cookie checks. Ready for restart.');
} else {
  const { cookie, user } = JSON.parse(readFileSync(file, 'utf8'));
  const response = await fetch(base + '/api/auth/session', { headers: { Cookie: cookie } });
  assert.equal((await response.json()).user.id, user.id);
  const logout = await call('/api/auth/logout', {}, { Cookie: cookie });
  assert.equal(logout.status, 200);
  const ended = await fetch(base + '/api/auth/session', { headers: { Cookie: cookie } });
  assert.equal((await ended.json()).user, null);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  // Delete only the generated QA account and its exclusively owned workspace.
  await pool.query('DELETE FROM workspaces WHERE id IN (SELECT workspace_id FROM workspace_members WHERE user_id=$1)', [user.id]);
  await pool.query('DELETE FROM users WHERE id=$1 AND email=$2', [user.id, user.email]);
  await pool.end();
  unlinkSync(file);
  console.log('PASS session survived database/API restart; logout revoked session. QA account removed.');
}
