import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../app.js';

// In-memory stand-in for auth_attempts; windows never expire within a test.
function fakePool() {
  const attempts = new Map();
  return { async query(sql, params = []) {
    if (sql.includes('auth_attempts')) {
      const key = params[0];
      attempts.set(key, (attempts.get(key) ?? 0) + 1);
      return { rows: [{ attempts: attempts.get(key) }] };
    }
    return { rows: [] };
  } };
}

async function startApp(t) {
  const origin = 'https://ronda.test';
  const server = http.createServer(createApp({ pool: fakePool(), origin }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  return (ip, email) => fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json', 'X-Ronda-Client-IP': ip },
    body: JSON.stringify({ email, password: 'wrong-password-123' }),
  }).then(response => response.status);
}

test('one client address cannot lock everyone out of login', async t => {
  const login = await startApp(t);
  for (let i = 0; i < 30; i++) assert.equal(await login('203.0.113.1', `user${i}@example.com`), 401);
  assert.equal(await login('203.0.113.1', 'next@example.com'), 429);
  assert.equal(await login('198.51.100.7', 'someone@example.com'), 401);
});

test('failed attempts from one address do not lock the account elsewhere', async t => {
  const login = await startApp(t);
  for (let i = 0; i < 10; i++) assert.equal(await login('203.0.113.1', 'victim@example.com'), 401);
  assert.equal(await login('203.0.113.1', 'victim@example.com'), 429);
  assert.equal(await login('198.51.100.7', 'victim@example.com'), 401);
});
