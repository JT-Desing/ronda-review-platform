import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';
import { handleAccountData } from './account-data.js';

async function put(data) {
  let status, payload;
  const req = Readable.from([Buffer.from(JSON.stringify({ revision: 0, data }))]);
  req.headers = { 'content-type': 'application/json' };
  req.method = 'PUT';
  const res = { writeHead(code) { status = code; }, end(value) { payload = JSON.parse(value); } };
  const saved = [];
  const pool = { async query(sql, values) {
    if (sql.startsWith('UPDATE account_data')) { saved.push(values[0]); return { rows: [{ revision: 1 }] }; }
    return { rows: [] };
  } };
  await handleAccountData({ req, res, path: '/api/data', account: { id: 'qa-user' }, pool });
  return { status, payload, saved };
}

test('personal-only onboarding preference is accepted and persisted with account data', async () => {
  const result = await put({ 'ronda-onboarding:v1': JSON.stringify('personal') });
  assert.equal(result.status, 200);
  assert.equal(result.payload.revision, 1);
  assert.deepEqual(result.saved, [{ 'ronda-onboarding:v1': JSON.stringify('personal') }]);
});

test('the guided tour flag is saved with account data', async () => {
  const result = await put({ 'ronda-tour:v1': JSON.stringify('done') });
  assert.equal(result.status, 200);
  assert.deepEqual(result.saved, [{ 'ronda-tour:v1': JSON.stringify('done') }]);
});

test('account data still rejects unknown preference keys', async () => {
  const result = await put({ 'unrecognized:v1': JSON.stringify('personal') });
  assert.equal(result.status, 400);
  assert.equal(result.payload.error, 'Datos inválidos.');
  assert.deepEqual(result.saved, []);
});
