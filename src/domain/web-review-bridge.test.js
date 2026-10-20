import test from 'node:test';
import assert from 'node:assert/strict';
import {documentMarkToViewport,normalizeWebReviewMetrics,viewportMarkToDocument} from './web-review-bridge.js';

const metrics={scrollX:0,scrollY:900,viewportWidth:1200,viewportHeight:800,documentWidth:1200,documentHeight:4000};

test('normalizes only finite, bounded bridge viewport data',()=>{
  assert.deepEqual(normalizeWebReviewMetrics(metrics),metrics);
  assert.equal(normalizeWebReviewMetrics({...metrics,documentHeight:NaN}),null);
  assert.equal(normalizeWebReviewMetrics({...metrics,documentWidth:1}),null);
});

test('stores annotation points in document coordinates and restores them in the scrolled viewport',()=>{
  const mark={tool:'arrow',points:[{x:.25,y:.5},{x:.75,y:.75}]};
  const saved=viewportMarkToDocument(mark,metrics);
  assert.equal(saved.coordinateSpace,'document');
  assert.deepEqual(saved.points,[{x:.25,y:.325},{x:.75,y:.375}]);
  assert.deepEqual(saved.documentSize,{width:1200,height:4000});
  assert.deepEqual(documentMarkToViewport(saved,metrics).points,mark.points);
});

test('legacy viewport annotations are left unchanged',()=>{
  const mark={tool:'type',points:[{x:.2,y:.3}]};
  assert.deepEqual(documentMarkToViewport(mark,metrics),mark);
});
