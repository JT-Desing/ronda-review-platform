import test from 'node:test';
import assert from 'node:assert/strict';
import { groupTimelineComments } from './timeline.js';
test('agrupa comentarios del mismo cuadro y conserva todos los hilos',()=>{
  const groups=groupTimelineComments([{id:'a',versionId:'v',timeSeconds:1},{id:'b',versionId:'v',timeSeconds:1.02},{id:'c',versionId:'v',timeSeconds:2},{id:'other',versionId:'other',timeSeconds:1}],10,'v');
  assert.equal(groups.length,2); assert.deepEqual(groups[0].comments.map(c=>c.id),['a','b']); assert.equal(groups[1].percent,20);
});
test('excluye tiempos inválidos y admite los extremos',()=>{
  assert.deepEqual(groupTimelineComments([],0,'v'),[]);
  const groups=groupTimelineComments([-1,0,10,11,NaN].map((timeSeconds,id)=>({id,versionId:'v',timeSeconds})),10,'v');
  assert.deepEqual(groups.map(g=>g.percent),[0,100]);
});
test('seleccionar archivo sin comentarios no muestra los de otra pieza',()=>{
  const comments=[{id:'old',versionId:'file-a',timeSeconds:1}];
  assert.deepEqual(groupTimelineComments(comments,10,'file-b'),[]);
  assert.equal(groupTimelineComments(comments,10,'file-a')[0].comments[0].id,'old');
});
