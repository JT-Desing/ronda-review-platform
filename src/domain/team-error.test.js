import test from 'node:test';
import assert from 'node:assert/strict';
import {teamErrorCanRetry} from './team-error.js';

test('team errors offer retry only for transient/network failures', () => {
  for (const status of [0, 408, 425, 429, 500, 503]) assert.equal(teamErrorCanRetry({status}), true, `${status} should offer retry`);
  for (const status of [400, 401, 403, 404, 409, 422]) assert.equal(teamErrorCanRetry({status}), false, `${status} should not offer retry`);
  assert.equal(teamErrorCanRetry(new TypeError('fetch failed')), true);
});
