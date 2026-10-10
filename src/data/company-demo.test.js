import test from 'node:test';
import assert from 'node:assert/strict';
import {createCompanyDemo} from './company-demo.js';
import {beginDemoSession,endDemoSession,demoSession} from '../state/demoSession.js';
test('demo uses valid original workspace relationships and isolated files',()=>{
  const state=createCompanyDemo(new Date(2026,9,9));
  assert.equal(state.assets.length,12);
  assert.equal(Object.keys(state.comments).length,296);
  for(const c of Object.values(state.comments)){assert.ok(state.projects[c.projectId]);assert.ok(state.versions[c.versionId]);assert.ok(state.members[c.authorId]);}
  beginDemoSession(state);assert.equal(demoSession().files.size,12);
  assert.equal(JSON.parse(demoSession().data['ronda-pauta:v1']).campaigns.length,3);
  endDemoSession();assert.equal(demoSession(),null);
  state.projects['project-amara'].name='Changed';assert.notEqual(createCompanyDemo().projects['project-amara'].name,'Changed');
});
