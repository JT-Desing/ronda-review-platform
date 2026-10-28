import test from 'node:test';import assert from 'node:assert/strict';
import {trashAsset,restoreAsset} from './asset-trash.js';
const a={id:'a',projectId:'p'},b={id:'b',projectId:'q'};
const state={assets:[a,b],projects:{p:{id:'p',activeVersionId:'asset-a-v1'},q:{id:'q'}},versions:{'asset-a-v1':{id:'asset-a-v1',projectId:'p',number:1}},comments:{c:{versionId:'asset-a-v1',text:'Conservar'}}};
test('trash removes only the scoped asset, preserves originals/comments, and restores after serialization',()=>{
  const removed=trashAsset(state,{id:'a',projectId:'p'},'now');
  assert.deepEqual(removed.assets,[b]);assert.equal(removed.projects.p.activeVersionId,null);
  assert.equal(removed.versions,state.versions);assert.equal(removed.comments,state.comments);
  const restored=restoreAsset(JSON.parse(JSON.stringify(removed)),{id:'a',projectId:'p'});
  assert.deepEqual(restored.assets,state.assets);assert.equal(restored.projects.p.activeVersionId,'asset-a-v1');
  assert.deepEqual(restored.trashedAssets,{});
});
test('wrong project, repeated trash and missing entries are safe no-ops',()=>{
  assert.equal(trashAsset(state,{id:'a',projectId:'q'}),state);
  const removed=trashAsset(state,{id:'a',projectId:'p'});
  assert.equal(trashAsset(removed,{id:'a',projectId:'p'}),removed);
  assert.equal(restoreAsset(removed,{id:'a',projectId:'q'}),removed);
});
test('removing last uploaded piece clears a legacy project reference too',()=>{
  const legacy={...state,projects:{...state.projects,p:{id:'p',activeVersionId:'legacy-reference'}}};
  assert.equal(trashAsset(legacy,{id:'a',projectId:'p'}).projects.p.activeVersionId,null);
});
