import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { body } from './http.js';

const request = (parts, type = 'application/json') => Object.assign(Readable.from(parts.map(part => Buffer.from(part))), { headers: { 'content-type': type } });

test('multibyte characters split across chunks are decoded intact', async () => {
  const bytes = Buffer.from(JSON.stringify({ name: 'Ñandú ✓' }));
  assert.deepEqual(await body(request([bytes.subarray(0, 12), bytes.subarray(12)])), { name: 'Ñandú ✓' });
});

test('the limit counts bytes, not characters', async () => {
  await assert.rejects(body(request([JSON.stringify({ a: 'ñ'.repeat(10) })]), 20), { status: 413 });
  assert.deepEqual(await body(request([JSON.stringify({ a: 'ñ' })]), 20), { a: 'ñ' });
});

test('non-JSON requests and invalid JSON keep their status codes', async () => {
  await assert.rejects(body(request(['{}'], 'text/plain')), { status: 415 });
  await assert.rejects(body(request(['{nope'])), { status: 400 });
});
