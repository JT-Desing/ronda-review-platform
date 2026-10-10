import test from 'node:test';
import assert from 'node:assert/strict';
import { presentProject, projectOverview } from './project-presentation.js';
test('project presentation uses only its own assets and comments without inventing approvals', () => {
  const state = { projects: { a: {id:'a',name:'A',activeVersionId:'v'} }, assets:[{id:'1',projectId:'a'},{id:'2',projectId:'b'}], versions:{v:{id:'v',projectId:'a',reviewerIds:['u'],decisions:{}}, other:{id:'other',projectId:'b'}}, comments:{one:{versionId:'v',status:'open'},two:{versionId:'other',status:'open'}} };
  const project = presentProject(state,state.projects.a);
  assert.equal(project.assets.length,1); assert.equal(project.pending,1); assert.equal(project.status,'in_review');
  assert.equal(projectOverview(state).approved,0);
  assert.equal(presentProject(state,{id:'b'}).status,'draft');
});
test('actual review decisions and blockers control the displayed state', () => {
  const state={projects:{},assets:[],versions:{v:{id:'v',projectId:'a',reviewerIds:['u'],decisions:{u:'approved'}}},comments:{}};
  assert.equal(presentProject(state,{id:'a',activeVersionId:'v'}).status,'approved');
  state.comments={c:{versionId:'v',status:'open',priority:'blocking'}};
  assert.equal(presentProject(state,{id:'a',activeVersionId:'v'}).status,'in_review');
});
