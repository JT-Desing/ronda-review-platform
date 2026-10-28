import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sharedCommentService} from './shared-comment-service.js';
test('comment page carries totals for the requested version, not just loaded rows',async()=>{
 const queries=[],versionId='version-requested';
 const repository={access:async(space,actor,run)=>run({query:async(sql,params)=>{
  queries.push({sql,params});
  if(sql.includes('count(*)'))return {rows:[{total:123,open:120,resolved:3,blocking:2}]};
  return {rows:[]};
 }}),version:async()=>({id:versionId})};
 const page=await sharedCommentService(repository).listComments('space','actor',{projectId:'p',assetId:'a',versionId});
 assert.deepEqual(page.commentStats,{total:123,open:120,resolved:3,blocking:2});
 assert.deepEqual(page.comments,[]);
 const aggregate=queries.find(q=>q.sql.includes('count(*)'));
 assert.deepEqual(aggregate.params,[versionId]);
 const listing=queries.find(q=>q.sql.includes('ORDER BY c.created_at,c.id'));
 assert.match(listing.sql,/status='open'/,'the active review queue must never return resolved rows');
});
