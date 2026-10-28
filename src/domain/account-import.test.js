import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeedState } from '../data/seed.js';
import { importAccountState } from './account-import.js';
test('explicit import maps the former owner without mutating the original', () => {
  const old=createSeedState(), before=JSON.stringify(old);
  const result=importAccountState(old,{id:'new-owner',name:'Owner',email:'owner@example.invalid'});
  assert.equal(JSON.stringify(old),before);
  assert.equal(result.currentUserId,'new-owner');
  assert.equal(result.members['member-julian'],undefined);
  assert.equal(result.members['new-owner'].status,'active');
  assert.ok(result.versions['version-amara-v3'].reviewerIds.includes('new-owner'));
  assert.equal(result.comments['comment-1'].assigneeId,'new-owner');
  assert.equal(result.comments['comment-1'].authorId,'member-sofia');
});
test('invalid import is rejected instead of replacing data',()=>{
  assert.throws(()=>importAccountState({},{}),/compatible/);
});
