import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from './app.js';

test('composition root preserves health, anonymous session, auth boundaries and safe errors', async t => {
  let failing = false;
  const pool = { async query() { if (failing) throw new Error('private database secret'); return { rows: [] }; } };
  const server = http.createServer(createApp({ pool, origin: 'https://ronda.test' }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base + '/api/health')).status, 200);
  assert.deepEqual(await (await fetch(base + '/api/auth/session')).json(), { user: null });
  assert.equal((await fetch(base + '/api/data')).status, 401);
  assert.equal((await fetch(base + '/api/files/11111111-1111-1111-1111-111111111111')).status, 401);
  assert.equal((await fetch(base + '/api/auth/login', { method: 'POST', headers: { Origin: 'https://other.test' } })).status, 403);
  assert.equal((await fetch(base + '/missing')).status, 404);
  failing = true;
  const error = await fetch(base + '/api/health');
  assert.equal(error.status, 500);
  assert.ok(!(await error.text()).includes('secret'));
});
