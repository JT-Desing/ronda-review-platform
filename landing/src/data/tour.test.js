import test from 'node:test';
import assert from 'node:assert/strict';
import { chapters, chapterAt, clock } from './tour.js';

test('los capítulos van en orden y arrancan en cero', () => {
  assert.equal(chapters[0].time, 0);
  const times = chapters.map((c) => c.time);
  assert.deepEqual(times, [...times].sort((a, b) => a - b));
});

test('ubica el capítulo de un instante', () => {
  assert.equal(chapterAt(0), 0);
  assert.equal(chapterAt(40), 2);
  assert.equal(chapterAt(999), chapters.length - 1);
});

test('formatea minutos y segundos', () => {
  assert.equal(clock(0), '0:00');
  assert.equal(clock(62), '1:02');
  assert.equal(clock(82.7), '1:22');
});
