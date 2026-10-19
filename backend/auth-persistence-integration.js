import assert from 'node:assert/strict';
import http from 'node:http';
import pg from 'pg';
import { migrate } from './migration-runner.js';
import { createApp } from './app.js';

const pool = new pg.Pool({ connectionString: process.env.RONDA_QA_DATABASE_URL });
const origin = 'https://ronda.qa.example.invalid';
let server;
let base;

async function startApi() {
  server = http.createServer(createApp({ pool, origin }));
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
}

async function stopApi() {
  if (!server) return;
  const current = server;
  server = undefined;
  await new Promise((resolve, reject) => current.close(error => error ? reject(error) : resolve()));
}

const post = (path, value, cookie) => fetch(base + path, {
  method: 'POST',
  headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
  body: JSON.stringify(value),
});

try {
  await migrate(pool);
  await startApi();
  const email = `auth-restart-${crypto.randomUUID()}@ronda.example.invalid`;
  const registered = await post('/api/auth/register', { name: 'Auth Restart QA', email, password: 'restart-persist-secure-password-2026' });
  assert.equal(registered.status, 200);
  const identity = (await registered.json()).user;
  assert.ok(identity?.id);
  assert.equal(identity.email, email);
  assert.equal('password_hash' in identity, false);
  const cookieHeader = registered.headers.get('set-cookie');
  assert.match(cookieHeader, /HttpOnly/);
  assert.match(cookieHeader, /SameSite=Lax/);
  assert.match(cookieHeader, /Secure/);
  const cookie = cookieHeader.split(';', 1)[0];

  await stopApi();
  await startApi();
  const session = await fetch(base + '/api/auth/session', { headers: { Cookie: cookie } });
  assert.equal(session.status, 200);
  assert.deepEqual((await session.json()).user, identity, 'server restart must not discard the persisted session');

  const logout = await post('/api/auth/logout', {}, cookie);
  assert.equal(logout.status, 200);
  const ended = await fetch(base + '/api/auth/session', { headers: { Cookie: cookie } });
  assert.deepEqual((await ended.json()).user, null, 'logout must revoke the session across the restarted API');
  console.log('PASS auth API restart preserves the DB session; logout revokes it; account response omits password hash.');
} finally {
  await stopApi();
  await pool.end();
}
