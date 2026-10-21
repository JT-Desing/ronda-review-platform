import test from 'node:test';
import assert from 'node:assert/strict';
import { timecode, initialComments, canApprove, openCount, visibleAnnotations, pointsToPath, strokeLength } from './review-demo.js';

test('timecode usa minutos, segundos y fotogramas a 24 fps', () => {
  assert.equal(timecode(0), '00:00:00');
  assert.equal(timecode(6.5), '00:06:12');
  assert.equal(timecode(19.999), '00:19:23');
  assert.equal(timecode(-3), '00:00:00');
  assert.equal(timecode(99), '00:20:00');
});

test('no se aprueba mientras haya comentarios abiertos', () => {
  const comments = initialComments();
  assert.equal(openCount(comments), 2);
  assert.equal(canApprove(comments), false);
  comments.forEach((comment) => { comment.resolved = true; });
  assert.equal(canApprove(comments), true);
});

test('la anotación solo se ve cerca de su instante', () => {
  const comments = initialComments();
  assert.deepEqual(visibleAnnotations(comments, 6).map((c) => c.id), ['c2']);
  assert.deepEqual(visibleAnnotations(comments, 12), []);
});

test('convierte puntos en un trazo y mide su largo', () => {
  assert.equal(pointsToPath([[0, 0], [3, 4]]), 'M0 0L3 4');
  assert.equal(pointsToPath([]), '');
  assert.equal(strokeLength([[0, 0], [3, 4], [3, 10]]), 11);
});
