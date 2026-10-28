import test from 'node:test';
import assert from 'node:assert/strict';
import {documentMarkToViewport,normalizeWebReviewMetrics,selectionToDocumentMark,viewportMarkToDocument} from './web-review-bridge.js';

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

test('selected text and its line highlights are anchored in document coordinates across scroll',()=>{
  const selected=selectionToDocumentMark({quote:'  Texto   seleccionado ',rects:[{left:100,top:25,width:80,height:20},{left:100,top:50,width:90,height:20}]},metrics,'#f2bd5c');
  assert.equal(selected.tool,'selection');
  assert.equal(selected.textQuote,'Texto seleccionado');
  assert.deepEqual(selected.points,[{x:7/60,y:0.23375}]);
  assert.deepEqual(selected.selectionRects,[{x:1/12,y:0.23125,width:1/15,height:.005},{x:1/12,y:.2375,width:.075,height:.005}]);
  const later={...metrics,scrollY:920};
  const visible=documentMarkToViewport(selected,later);
  assert.equal(visible.points[0].y,.01875);
  assert.equal(visible.selectionRects[0].y,.00625);
});

test('selection bridge ignores empty or malformed text ranges',()=>{
  assert.equal(selectionToDocumentMark({quote:' ',rects:[{left:1,top:1,width:1,height:1}]},metrics),null);
  assert.equal(selectionToDocumentMark({quote:'hello',rects:[]},metrics),null);
});
