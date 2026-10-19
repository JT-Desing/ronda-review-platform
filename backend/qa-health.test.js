import test from 'node:test';
import assert from 'node:assert/strict';
import { qaHealth } from './qa-health.js';

test('QA health reports API/storage ready only after database connectivity succeeds', async () => {
  const result = await qaHealth({ query: async sql => { assert.equal(sql, 'SELECT 1'); } }, 'Admin QA');
  assert.deepEqual(result, {
    status: 200,
    body: { qa: true, api: true, persona: 'Admin QA', storage: 'isolated', mail: 'capture-only' },
  });
});

test('QA health distinguishes a running shell from an unavailable database', async () => {
  const result = await qaHealth({ query: async () => { throw Object.assign(new Error('private connection details'), { code: 'ECONNREFUSED' }); } }, 'Admin QA');
  assert.deepEqual(result, {
    status: 503,
    body: { qa: true, api: false, persona: 'Admin QA', storage: 'isolated', mail: 'capture-only' },
  });
  assert.equal(JSON.stringify(result).includes('private connection details'), false);
});
