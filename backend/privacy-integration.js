import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import http from 'node:http';
import { Pool } from 'pg';
import { migrate } from './migration-runner.js';
import { createApp } from './app.js';
import { PRIVACY_POLICY_VERSION } from './privacy.js';
const admin = new Pool({ connectionString: process.env.DATABASE_URL });
const name = `ronda_privacy_qa_${randomUUID().replaceAll('-', '')}`;
const url = new URL(process.env.DATABASE_URL); url.pathname = '/' + name;
const origin = 'https://privacy-qa.invalid';
let pool, server;
try {
  await admin.query(`CREATE DATABASE "${name}"`);
  pool = new Pool({ connectionString: url.href });
  // The forced DROP below ends idle connections (57P01); anything else must still fail the run.
  pool.on('error', error => { if (error.code !== '57P01') throw error; });
  await migrate(pool);
  server = http.createServer(createApp({ pool, origin }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (path, method = 'GET', input, cookie) => fetch(base + path, { method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, ...(input === undefined ? {} : { body: JSON.stringify(input) }) });
  const register = async (email, extra = {}) => {
    const response = await call('/api/auth/register', 'POST', { email, name: 'QA', password: randomUUID() + randomUUID(), ...extra });
    return { body: await response.json(), cookie: response.headers.get('set-cookie').split(';')[0] };
  };
  const stored = async email => (await pool.query('SELECT privacy_version,privacy_accepted_at FROM users WHERE email=$1', [email])).rows[0];

  // Accepted at signup: version and date are stored as proof.
  const accepted = await register('acepta@example.invalid', { acceptPrivacy: true });
  assert.equal(accepted.body.user.privacyAccepted, true);
  const proof = await stored('acepta@example.invalid');
  assert.equal(proof.privacy_version, PRIVACY_POLICY_VERSION); assert.ok(proof.privacy_accepted_at);

  // Without acceptance (old accounts, Google, API): the app asks before use.
  const pending = await register('pendiente@example.invalid');
  assert.equal(pending.body.user.privacyAccepted, false);
  assert.equal((await stored('pendiente@example.invalid')).privacy_accepted_at, null);
  assert.equal((await call('/api/account/privacy', 'POST', { acceptPrivacy: 'on' }, pending.cookie)).status, 400);
  assert.equal((await call('/api/account/privacy', 'POST', { acceptPrivacy: true })).status, 401);
  assert.equal((await call('/api/account/privacy', 'POST', { acceptPrivacy: true }, pending.cookie)).status, 200);
  assert.equal((await (await call('/api/auth/session', 'GET', undefined, pending.cookie)).json()).user.privacyAccepted, true);
  assert.equal((await stored('pendiente@example.invalid')).privacy_version, PRIVACY_POLICY_VERSION);

  // A later policy version asks again.
  await pool.query("UPDATE users SET privacy_version='0.9' WHERE email='acepta@example.invalid'");
  assert.equal((await (await call('/api/auth/session', 'GET', undefined, accepted.cookie)).json()).user.privacyAccepted, false);
  console.log('PASS privacy: signup proof, pending acceptance, explicit consent only, re-consent on a new version.');
} finally {
  await new Promise(resolve => server ? server.close(resolve) : resolve());
  await pool?.end();
  await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await admin.end();
}
