import {selectedProjectRole as guestRole} from './project-membership.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedProjectRole,validateProjectMembers} from './project-membership.js';
test('selected membership never elevates team role and excludes unselected users',()=>{
 const base={workspaceRole:'editor',actor:'a',creatorId:'b',restricted:true};
 assert.throws(()=>selectedProjectRole(base),error=>error.status===404);
 assert.equal(selectedProjectRole({...base,memberRole:'reviewer'}),'reviewer');
 assert.equal(selectedProjectRole({...base,memberRole:'editor'}),'editor');
 assert.equal(selectedProjectRole({...base,workspaceRole:'reviewer',memberRole:'editor'}),'reviewer');
 assert.equal(selectedProjectRole({...base,workspaceRole:'admin'}),'admin');
 assert.equal(selectedProjectRole({...base,actor:'b'}),'editor');
 assert.throws(()=>selectedProjectRole({...base,workspaceRole:undefined,actor:'b'}),error=>error.status===404);
});
test('participants reject malformed identities, duplicates and global roles',async()=>{
 const db={query:()=>{throw Error('must validate before database');}};
 await assert.rejects(validateProjectMembers(db,'s',[{userId:'invalid',role:'editor'}]),{status:400});
 await assert.rejects(validateProjectMembers(db,'s',[{userId:'11111111-1111-4111-8111-111111111111',role:'admin'}]),{status:400});
 assert.equal(await validateProjectMembers(db,'s',undefined),null);
});

test('a guest only reaches projects they were invited to, always as reviewer', () => {
  assert.equal(guestRole({workspaceRole:'guest',creatorId:'a',actor:'g',restricted:false,memberRole:'reviewer'}),'reviewer');
  assert.throws(()=>guestRole({workspaceRole:'guest',creatorId:'a',actor:'g',restricted:false}),e=>e.status===404);
});
