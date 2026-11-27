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
 const service=sharedCommentService(repository);
 const page=await service.listComments('space','actor',{projectId:'p',assetId:'a',versionId});
 assert.deepEqual(page.commentStats,{total:123,open:120,resolved:3,blocking:2});
 assert.deepEqual(page.comments,[]);
 const aggregate=queries.find(q=>q.sql.includes('count(*)'));
 assert.deepEqual(aggregate.params,[versionId]);
 const listing=queries.find(q=>q.sql.includes('ORDER BY c.created_at,c.id'));
 assert.match(listing.sql,/\$2::text='all' OR c\.status=\$2/,'the query must support status filtering while defaulting to open');
 assert.deepEqual(listing.params,[versionId,'open',null,null]);
 const all=await service.listComments('space','actor',{projectId:'p',assetId:'a',versionId},{status:'all'});
 assert.deepEqual(all.commentStats,page.commentStats);
 assert.deepEqual(queries.filter(q=>q.sql.includes('ORDER BY c.created_at,c.id')).at(-1).params,[versionId,'all',null,null]);
 await assert.rejects(()=>service.listComments('space','actor',{projectId:'p',assetId:'a',versionId},{status:'archived'}),/Filtro de comentarios inválido/);
});
