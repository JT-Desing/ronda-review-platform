import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, token, digest } from './security.js';
test('passwords are salted and verified', async () => {
  const first = await hashPassword('long-password-123');
  assert.notEqual(first, await hashPassword('long-password-123'));
  assert.equal(await verifyPassword('long-password-123', first), true);
  assert.equal(await verifyPassword('wrong-password', first), false);
});
test('session tokens are random and stored as digests', () => {
  const value = token();
  assert.notEqual(value, token());
  assert.equal(digest(value).length, 64);
  assert.notEqual(value, digest(value));
});
