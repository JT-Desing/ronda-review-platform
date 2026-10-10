import test from 'node:test';
import assert from 'node:assert/strict';
import { annotationVisibleAt } from './annotations.js';

test('video muestra la figura solo en su fotograma, incluidos límites decimales',()=>{
  const mark={timeSeconds:522/24};
  assert.equal(annotationVisibleAt(mark,522/24),true);
  assert.equal(annotationVisibleAt(mark,522/24+.02),true);
  assert.equal(annotationVisibleAt(mark,523/24),false);
  assert.equal(annotationVisibleAt(mark,521/24),false);
  assert.equal(annotationVisibleAt(mark,38),false);
});
test('imágenes conservan figuras y video no inventa tiempos ausentes',()=>{
  assert.equal(annotationVisibleAt({},38,true),true);
  assert.equal(annotationVisibleAt({},38),false);
  assert.equal(annotationVisibleAt({timeSeconds:0},0),true);
});
