import test from 'node:test';
import assert from 'node:assert/strict';
import { completePasswordReset, deliverPasswordReset, requestPasswordReset } from './password-reset.js';
import { digest, verifyPassword } from './security.js';

function requestPool({ user = { id: 'user-qa' }, ipAttempts = 1, globalAttempts = 1 } = {}) {
  const calls = [];
  const pool = {
    calls,
    async query(sql, values = []) {
      calls.push([sql, values]);
      if (sql.startsWith('INSERT INTO auth_attempts')) return { rows: [{ attempts: values[0] === 'password-reset-global' ? globalAttempts : ipAttempts }] };
      return { rows: [] };
    },
    async connect() { return { query: async (sql, values = []) => {
      calls.push([sql, values]);
      if (sql.startsWith('SELECT id FROM users')) return { rows: user ? [user] : [] };
      return { rows: [] };
    }, release() {} }; },
  };
  return pool;
}

test('unknown addresses run the same bounded DB path but never receive an email payload', async () => {
  const pool = requestPool({ user: null });
  const result = await requestPasswordReset({ pool, origin: 'https://ronda.test', requestAddress: '127.0.0.1', email: 'Nobody@Example.invalid', minimumDelay: false });
  assert.deepEqual(result, { accepted: true });
  assert.ok(pool.calls.some(([sql]) => sql === 'SELECT id FROM users WHERE email=$1 FOR UPDATE'));
  assert.ok(pool.calls.some(([sql]) => sql.startsWith('INSERT INTO password_reset_tokens')));
  assert.equal(pool.calls.at(-1)[0], 'COMMIT');
  assert.equal(pool.calls[6][1][1], null);
  assert.match(pool.calls[6][0], /CASE WHEN \$2::uuid IS NULL THEN now\(\) ELSE NULL END/);
});

test('known accounts get a random fragment link while only its digest is stored', async () => {
  const pool = requestPool();
  const result = await requestPasswordReset({ pool, origin: 'https://ronda.test', requestAddress: '127.0.0.1', email: ' User@Example.invalid ', minimumDelay: false });
  const { delivery } = result;
  const resetLink = new URL(delivery.message.text.match(/https:\/\/[^\s]+/)[0]);
  const value = new URLSearchParams(resetLink.hash.slice(1)).get('reset');
  assert.equal(resetLink.origin, 'https://ronda.test');
  assert.equal(resetLink.search, '', 'the bearer token is not sent in the HTTP request URL');
  assert.match(value, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(delivery.message.to, 'user@example.invalid');
  assert.match(delivery.message.html,/Crear contraseña nueva/);
  assert.match(delivery.message.html,/30 minutos/);
  assert.match(delivery.message.html,/href="https:\/\/ronda\.test\/#reset=/);
  assert.match(delivery.message.html,/src="cid:ronda-mark@ronda"/);
  assert.equal(delivery.message.attachments[0].cid,'ronda-mark@ronda');
  assert.equal(pool.calls[6][1][0], digest(value));
  assert.notEqual(pool.calls[6][1][0], value);
  assert.match(pool.calls[6][0], /now\(\)\+\$3::interval/);
  assert.equal(pool.calls[6][1][2], '30 minutes');
  assert.ok(pool.calls.some(([sql]) => sql.includes('WHERE user_id=$1 AND used_at IS NULL')));
});

test('accounts created from an invitation get a welcome link that lasts three days', async () => {
  const pool = requestPool();
  const { delivery } = await requestPasswordReset({ pool, origin: 'https://ronda.test', email: 'nueva@example.invalid', minimumDelay: false, purpose: 'welcome' });
  assert.equal(delivery.message.subject, 'Crea tu contraseña de Ronda');
  assert.match(delivery.message.html, /3 días/);
  assert.match(delivery.message.text, /https:\/\/ronda\.test\/#reset=/);
  assert.equal(pool.calls[6][1][2], '3 days');
});

test('rate limits are applied before account lookup without a low global lockout threshold', async () => {
  const pool = requestPool({ ipAttempts: 101 });
  await assert.rejects(requestPasswordReset({ pool, origin: 'https://ronda.test', requestAddress: '127.0.0.1', email: 'person@example.invalid', minimumDelay: false }), { status: 429 });
  assert.equal(pool.calls.some(([sql]) => sql.startsWith('SELECT id FROM users')), false);
  assert.match(pool.calls[0][1][0], /^password-reset-ip:/);
  const globalPool = requestPool({ globalAttempts: 1001 });
  await assert.rejects(requestPasswordReset({ pool: globalPool, origin: 'https://ronda.test', requestAddress: '127.0.0.2', email: 'person@example.invalid', minimumDelay: false }), { status: 429 });
  assert.equal(globalPool.calls.some(([sql]) => sql.startsWith('SELECT id FROM users')), false);
  assert.equal(globalPool.calls[1][1][0], 'password-reset-global');
});

test('mail transport exceptions or a resolved rejection invalidate the token', async () => {
  for (const send of [async () => { throw new Error('private transport detail'); }, async () => ({ accepted: [], rejected: ['user@example.invalid'] })]) {
    const pool = requestPool();
    const { delivery } = await requestPasswordReset({ pool, origin: 'https://ronda.test', email: 'user@example.invalid', minimumDelay: false });
    assert.equal(await deliverPasswordReset({ pool, mailer: { async send() { return send(); } }, delivery }), false);
    assert.equal(pool.calls.at(-1)[0], 'UPDATE password_reset_tokens SET used_at=now() WHERE token_hash=$1 AND used_at IS NULL');
    assert.ok(!pool.calls.flat().some(value => String(value).includes('private transport detail')));
  }
});

test('accepted recipients remain valid; unrelated accepts do not count as delivery', async () => {
  const pool = requestPool();
  const { delivery } = await requestPasswordReset({ pool, origin: 'https://ronda.test', email: 'user@example.invalid', minimumDelay: false });
  assert.equal(await deliverPasswordReset({ pool, mailer: { async send() { return { accepted: ['USER@example.invalid'], rejected: [] }; } }, delivery }), true);
  const otherPool = requestPool();
  const unrelated = await requestPasswordReset({ pool: otherPool, origin: 'https://ronda.test', email: 'user@example.invalid', minimumDelay: false });
  assert.equal(await deliverPasswordReset({ pool: otherPool, mailer: { async send() { return { accepted: ['other@example.invalid'], rejected: [] }; } }, delivery: unrelated.delivery }), false);
});

test('one-time reset changes the password and revokes sessions and all other links transactionally', async () => {
  const value = 'a'.repeat(43), calls = [];
  let storedHash;
  let used = false;
  const client = {
    async query(sql, values = []) {
      calls.push([sql, values]);
      if (sql.startsWith('SELECT user_id FROM password_reset_tokens')) return { rows: used ? [] : [{ user_id: 'user-qa' }] };
      if (sql.startsWith('SELECT id FROM users WHERE id=$1 FOR UPDATE')) return { rows: [{ id: values[0] }] };
      if (sql.startsWith('UPDATE users SET password_hash')) storedHash = values[0];
      if (sql.startsWith('UPDATE password_reset_tokens SET used_at=now() WHERE user_id')) used = true;
      return { rows: [] };
    },
    release() { calls.push(['RELEASE', []]); },
  };
  const pool = { async connect() { return client; } };
  assert.deepEqual(await completePasswordReset({ pool, value, password: 'new-secure-password-2026' }), { ok: true });
  assert.ok(await verifyPassword('new-secure-password-2026', storedHash));
  assert.equal(calls[0][0], 'BEGIN');
  assert.ok(calls.some(([sql, values]) => sql.startsWith('SELECT user_id') && values[0] === digest(value)));
  assert.ok(calls.some(([sql, values]) => sql === 'UPDATE password_reset_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL' && values[0] === 'user-qa'));
  assert.ok(calls.some(([sql]) => sql === 'DELETE FROM sessions WHERE user_id=$1'));
  assert.ok(calls.findIndex(([sql]) => sql === 'SELECT id FROM users WHERE id=$1 FOR UPDATE') < calls.findIndex(([sql]) => sql.includes('password_reset_tokens WHERE token_hash=$1 AND user_id=$2') && sql.endsWith('FOR UPDATE')), 'account row is locked before reset-token row to match issuance lock order');
  assert.ok(calls.some(([sql]) => sql === 'COMMIT'));
  await assert.rejects(completePasswordReset({ pool, value, password: 'new-secure-password-2026' }), { status: 400 });
});

test('invalid token and invalid password are rejected before opening a transaction', async () => {
  let connects = 0;
  const pool = { async connect() { connects++; throw new Error('unexpected'); } };
  await assert.rejects(completePasswordReset({ pool, value: 'short', password: 'long-enough-password' }), { status: 400 });
  await assert.rejects(completePasswordReset({ pool, value: 'b'.repeat(43), password: 'short' }), { status: 400 });
  assert.equal(connects, 0);
});
