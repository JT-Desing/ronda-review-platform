import assert from 'node:assert/strict';
import http from 'node:http';
import pg from 'pg';
import { migrate } from './migration-runner.js';
import { createApp } from './app.js';
import { digest } from './security.js';

const pool = new pg.Pool({ connectionString: process.env.RONDA_QA_DATABASE_URL });
const messages = [];
const origin = 'http://127.0.0.1';
const mailer = { enabled: true, async send(message) { messages.push(message); return { accepted: [message.to] }; } };
const server = http.createServer(createApp({ pool, origin, mailer }));
await migrate(pool);
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const base = `http://127.0.0.1:${server.address().port}`;
const post = (path, value, cookie) => fetch(base + path, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(value) });
async function waitForMessages(count) {
  const deadline = Date.now() + 1500;
  while (messages.length < count && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(messages.length, count, 'captured QA mail should finish asynchronously');
}
function tokenFromMessage(message) {
  const link = new URL(message.text.match(/http:\/\/[^\s]+/)[0]);
  assert.equal(link.search, '', 'the bearer token must not appear in the HTTP request URL');
  return new URLSearchParams(link.hash.slice(1)).get('reset');
}

try {
  const register = await post('/api/auth/register', { name: 'Reset QA', email: `reset-${crypto.randomUUID()}@ronda.example.invalid`, password: 'initial-secure-password-2026' });
  assert.equal(register.status, 200);
  const user = (await register.json()).user;
  assert.ok(!('password_hash' in user));
  const sessionCookie = register.headers.get('set-cookie').split(';', 1)[0];

  const unknown = await post('/api/auth/password-reset/request', { email: 'unknown@ronda.example.invalid' });
  const known = await post('/api/auth/password-reset/request', { email: user.email });
  await waitForMessages(1);
  const repeated = await post('/api/auth/password-reset/request', { email: user.email });
  await waitForMessages(2);
  assert.equal(unknown.status, 202);
  assert.equal(known.status, 202);
  assert.equal(repeated.status, 202);
  assert.deepEqual(await unknown.json(), await known.json());
  assert.equal(messages.length, 2);
  assert.equal(messages[0].to, user.email);
  const firstToken = tokenFromMessage(messages[0]);
  const resetToken = tokenFromMessage(messages[1]);
  assert.ok(resetToken);
  const saved = await pool.query('SELECT token_hash,used_at FROM password_reset_tokens WHERE user_id=$1 ORDER BY created_at', [user.id]);
  assert.equal(saved.rows.length, 2);
  assert.equal(saved.rows[0].token_hash, digest(firstToken));
  assert.notEqual(saved.rows[0].token_hash, firstToken);
  assert.ok(saved.rows[0].used_at, 'a newer request revokes the older link');
  assert.equal(saved.rows[1].token_hash, digest(resetToken));

  const superseded = await post('/api/auth/password-reset/complete', { token: firstToken, password: 'superseded-secure-password-2026' });
  assert.equal(superseded.status, 400);

  const completed = await post('/api/auth/password-reset/complete', { token: resetToken, password: 'replacement-secure-password-2026' });
  assert.equal(completed.status, 200);
  assert.deepEqual(await completed.json(), { ok: true });
  const session = await fetch(base + '/api/auth/session', { headers: { Cookie: sessionCookie } });
  assert.deepEqual(await session.json(), { user: null });
  const replay = await post('/api/auth/password-reset/complete', { token: resetToken, password: 'another-secure-password-2026' });
  assert.equal(replay.status, 400);

  const oldLogin = await post('/api/auth/login', { email: user.email, password: 'initial-secure-password-2026' });
  const newLogin = await post('/api/auth/login', { email: user.email, password: 'replacement-secure-password-2026' });
  assert.equal(oldLogin.status, 401);
  assert.equal(newLogin.status, 200);

  const expiredRequest = await post('/api/auth/password-reset/request', { email: user.email });
  await waitForMessages(3);
  assert.equal(expiredRequest.status, 202);
  const expiredToken = tokenFromMessage(messages.at(-1));
  await pool.query("UPDATE password_reset_tokens SET expires_at=now()-interval '1 minute' WHERE token_hash=$1", [digest(expiredToken)]);
  const expired = await post('/api/auth/password-reset/complete', { token: expiredToken, password: 'expired-secure-password-2026' });
  assert.equal(expired.status, 400);

  const raceRegister = await post('/api/auth/register', { name: 'Reset Race QA', email: `reset-race-${crypto.randomUUID()}@ronda.example.invalid`, password: 'race-initial-secure-password-2026' });
  assert.equal(raceRegister.status, 200);
  const raceUser = (await raceRegister.json()).user;
  const raceRequested = await post('/api/auth/password-reset/request', { email: raceUser.email });
  assert.equal(raceRequested.status, 202);
  await waitForMessages(4);
  const raceToken = tokenFromMessage(messages.at(-1));
  const [raceComplete, raceReplacement] = await Promise.all([
    fetch(base + '/api/auth/password-reset/complete', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ token: raceToken, password: 'race-replacement-secure-password-2026' }), signal: AbortSignal.timeout(5000) }),
    fetch(base + '/api/auth/password-reset/request', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: raceUser.email }), signal: AbortSignal.timeout(5000) }),
  ]);
  assert.ok([200, 400].includes(raceComplete.status), `concurrent completion should finish or safely lose to a newer request, got ${raceComplete.status}`);
  assert.equal(raceReplacement.status, 202, 'a concurrent fresh request should complete without SQL deadlock');
  await waitForMessages(5);
  console.log('PASS password reset request, anti-enumeration, latest-link-only, captured mail, one-use expiry, session revocation and login');
} finally {
  await new Promise(resolve => server.close(resolve));
  await pool.end();
}
