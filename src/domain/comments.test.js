import test from 'node:test';
import assert from 'node:assert/strict';
import { getCommentEmptyState } from './comments.js';

test('distingue una revisión nueva de una búsqueda sin resultados',()=>{
  assert.equal(getCommentEmptyState({total:0,filter:'Todos',search:''}).kind,'empty');
  const search=getCommentEmptyState({total:4,filter:'Todos',search:'logo'});
  assert.equal(search.kind,'search');
  assert.equal(search.action,'Limpiar búsqueda');
});

test('ofrece volver a todos cuando un filtro no tiene comentarios',()=>{
  const state=getCommentEmptyState({total:3,filter:'Resueltos',search:''});
  assert.equal(state.kind,'filter');
  assert.equal(state.action,'Ver todos');
});
