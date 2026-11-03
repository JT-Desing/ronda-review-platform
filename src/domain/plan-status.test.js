import test from 'node:test';
import assert from 'node:assert/strict';
import {planStatusNotice} from './plan-status.js';
test('active plans show nothing; pending and suspended explain what to do by role', () => {
  assert.equal(planStatusNotice('active','admin'), null);
  assert.equal(planStatusNotice(undefined,'admin'), null);
  assert.match(planStatusNotice('suspended','admin').text, /Renueva/);
  assert.match(planStatusNotice('suspended','reviewer').text, /administra/);
  assert.equal(planStatusNotice('pending','editor').title, 'Plan pendiente de activación');
});
