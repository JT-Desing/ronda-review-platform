import test from 'node:test';import assert from 'node:assert/strict';
import {teamWorkspaces,preferredWorkspace,readPreferredTeam,rememberPreferredTeam,forgetPreferredTeam} from './workspace-routing.js';
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
test('last selected team preference persists per account and can be cleared',()=>{
  const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
  rememberPreferredTeam(storage,'account-a','team');
  assert.equal(readPreferredTeam(storage,'account-a'),'team');
  assert.equal(readPreferredTeam(storage,'account-b'),'');
  forgetPreferredTeam(storage,'account-a');
  assert.equal(readPreferredTeam(storage,'account-a'),'');
});
test('workspace team selection is reused by Projects after accepting an invitation',()=>{
  const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
  rememberPreferredTeam(storage,'invitee','team');
  assert.equal(preferredWorkspace(teamWorkspaces(spaces),readPreferredTeam(storage,'invitee')),'team');
});
test('workspace preference storage failures do not block routing',()=>{
  const storage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');},removeItem(){throw Error('blocked');}};
  assert.equal(readPreferredTeam(storage,'account'),'');
  assert.doesNotThrow(()=>rememberPreferredTeam(storage,'account','team'));
  assert.doesNotThrow(()=>forgetPreferredTeam(storage,'account'));
});
