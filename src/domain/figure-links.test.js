import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRondaState, persistRondaState } from '../state/migration.js';

test('conserva comentarios iguales vinculados a figuras distintas', () => {
  const state = normalizeRondaState({ comments: { a: { id:'a',text:'Cambiar',frame:24,annotationId:'one',annotationContext:'asset-a' }, b: { id:'b',text:'Cambiar',frame:24,annotationId:'two',annotationContext:'asset-a' } } });
  assert.equal(Object.keys(state.comments).length,2);
});
test('persiste geometría y vínculo opcional sin perder identificadores', () => {
  let saved; const storage={setItem:(_key,value)=>saved=value};
  const state={annotations:{asset:[{id:'one',tool:'square',points:[{x:.1,y:.2},{x:.5,y:.6}],timeSeconds:1}]},comments:{a:{id:'a',annotationId:'one',annotationContext:'asset'},b:{id:'b',annotationId:null}}};
  assert.equal(persistRondaState(storage,'test',state).ok,true);
  assert.deepEqual(JSON.parse(saved),state);
});
