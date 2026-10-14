import test from 'node:test';import assert from 'node:assert/strict';
import {teamWorkspaces,preferredWorkspace} from './workspace-routing.js';
const spaces=[{id:'private',kind:'personal'},{id:'team',kind:'team'},{id:'e9a7c001-67bd-4be9-968d-13e465cd1210',kind:'team'}];
test('project team list excludes personal spaces and prefers ePayco',()=>{
  assert.equal(teamWorkspaces(spaces).length,2);
  assert.equal(preferredWorkspace(teamWorkspaces(spaces)),spaces[2].id);
  assert.equal(preferredWorkspace(teamWorkspaces(spaces),'private'),spaces[2].id);
  assert.equal(preferredWorkspace(teamWorkspaces(spaces),'team'),'team');
});
test('no membership means no inferred access or personal fallback in Projects',()=>{
  assert.equal(preferredWorkspace(teamWorkspaces([spaces[0]])),'');
  assert.equal(preferredWorkspace([]),'');
});
