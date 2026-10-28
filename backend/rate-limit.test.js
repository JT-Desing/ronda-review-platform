import test from 'node:test';
import assert from 'node:assert/strict';
import { clientAddress, rateLimiter } from './rate-limit.js';

test('clientAddress prefers the proxy header and falls back to the socket', () => {
  assert.equal(clientAddress({ headers: { 'x-ronda-client-ip': ' 203.0.113.1 ' } }), '203.0.113.1');
  assert.equal(clientAddress({ headers: {}, socket: { remoteAddress: '10.0.0.2' } }), '10.0.0.2');
  assert.equal(clientAddress({ headers: { 'x-ronda-client-ip': '' } }), 'unknown');
});

test('rateLimiter allows up to max attempts per key and window', async () => {
  const calls = [];
  const pool = { async query(sql, params) { calls.push(params); return { rows: [{ attempts: calls.length }] }; } };
  const allow = rateLimiter(pool);
  assert.equal(await allow('k', 2, 60), true);
  assert.equal(await allow('k', 2, 60), true);
  assert.equal(await allow('k', 2, 60), false);
  assert.deepEqual(calls[0], ['k', 60]);
});
