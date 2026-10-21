import test from 'node:test';
import assert from 'node:assert/strict';
import { LOOP, STEPS, CURSOR, CLICKS, COMMENT_TEXT, stateAt, cursorAt, stamp, strokePoint, strokePath } from './walkthrough.js';

test('sigue el orden real: subir, revisar, anotar, publicar, resolver y aprobar', () => {
  assert.equal(stateAt(0.5).scene, 'grid');
  assert.equal(stateAt(0.5).upload, 0);
  assert.equal(stateAt(2.25).upload, 0.5);
  assert.equal(stateAt(3.2).uploaded, true);
  assert.equal(stateAt(5).scene, 'review');
  assert.equal(stateAt(6).playing, true);
  assert.equal(stateAt(9).pen, false);
  assert.equal(stateAt(9.2).pen, true);
  assert.equal(stateAt(11).pin, 'draft');
  assert.equal(stateAt(11).popover, true);
  assert.equal(stateAt(12.7).typed, COMMENT_TEXT.length);
  assert.equal(stateAt(13.5).comment, 'open');
  assert.equal(stateAt(13.5).pending, 1);
  assert.equal(stateAt(13.5).popover, false);
  assert.equal(stateAt(15).comment, 'resolved');
  assert.equal(stateAt(15).approved, false);
  assert.equal(stateAt(16.2).approved, true);
});

test('el video se detiene en el fotograma comentado', () => {
  assert.equal(stateAt(5).video, 0);
  assert.equal(stateAt(9).video, 6.5);
  assert.deepEqual(stamp(6.5), { time: '00:00:06', frame: 156 });
});

test('solo se aprueba con el comentario resuelto', () => {
  for (let t = 0; t < LOOP; t += 0.05) {
    const s = stateAt(t);
    if (s.approved) assert.equal(s.comment, 'resolved');
  }
});

test('el ciclo vuelve a empezar', () => {
  assert.deepEqual(stateAt(LOOP + 1), stateAt(1));
});

test('cada paso tiene un instante quieto dentro de su tramo', () => {
  STEPS.forEach((step, i) => {
    assert.equal(stateAt(step.show).step, i);
  });
});

test('el cursor llega a cada clic y recorre el trazo de forma lineal', () => {
  const times = CURSOR.map(([t]) => t);
  assert.deepEqual(times, [...times].sort((a, b) => a - b));
  for (const c of CLICKS) {
    const { from, to } = cursorAt(c);
    assert.equal(from, to, `clic en ${c}s sin cursor quieto`);
  }
  const mid = cursorAt(10.1);
  assert.equal(mid.from, 'stroke:0');
  assert.ok(Math.abs(mid.k - 0.5) < 1e-9);
});

test('el trazo empieza donde va el pin y da un poco más de una vuelta', () => {
  const [x, y] = strokePoint(0);
  assert.equal(Math.round(x), 640);
  assert.equal(Math.round(y), 262);
  assert.match(strokePath(4), /^M640\.0 262\.0L/);
});
