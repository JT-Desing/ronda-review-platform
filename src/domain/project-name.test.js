import test from 'node:test';
import assert from 'node:assert/strict';
import {renameProject} from './project-name.js';
const state={projects:{p:{id:'p',name:'Anterior',client:'Cliente',activeVersionId:'v'}},assets:[{id:'a'}],comments:{c:{text:'Comentario'}}};
test('rename trims name while preserving project identity, files and comments',()=>{
  const next=renameProject(state,{id:'p',name:'  Campaña nueva  '});
  assert.equal(next.projects.p.name,'Campaña nueva');
  assert.equal(next.projects.p.id,'p');
  assert.equal(next.projects.p.activeVersionId,'v');
  assert.equal(next.projects.p.client,'Cliente');
  assert.equal(next.assets,state.assets);
  assert.equal(next.comments,state.comments);
  assert.equal(state.projects.p.name,'Anterior');
});
test('invalid names and missing projects do not modify state',()=>{
  for(const name of ['', '  ', 'x'.repeat(101),null]) assert.equal(renameProject(state,{id:'p',name}),state);
  assert.equal(renameProject(state,{id:'missing',name:'Nuevo'}),state);
});
