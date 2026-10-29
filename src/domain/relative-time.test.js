import test from 'node:test';
import assert from 'node:assert/strict';
import { relativeTime } from './relative-time.js';

test('relative time reads in minutes, hours and days', () => {
  const now = Date.parse('2026-10-29T12:00:00Z');
  assert.equal(relativeTime('2026-10-29T11:59:40Z', now), 'ahora');
  assert.equal(relativeTime('2026-10-29T11:55:00Z', now), 'hace 5 min');
  assert.equal(relativeTime('2026-10-29T09:00:00Z', now), 'hace 3 h');
  assert.equal(relativeTime('2026-10-28T10:00:00Z', now), 'ayer');
  assert.equal(relativeTime('2026-10-25T12:00:00Z', now), 'hace 4 días');
  assert.equal(relativeTime('no es fecha', now), '');
});
