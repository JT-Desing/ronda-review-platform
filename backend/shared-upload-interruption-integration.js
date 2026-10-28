import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import http from 'node:http';
import {reviewFixture} from './shared-review-qa-fixture.js';
import {createApp} from './app.js';
import {localStorage} from './storage/local.js';
import {sharedReviewRepository} from './repositories/shared-review.js';
import {reconcileSharedUploads} from './shared-upload-recovery.js';
import {digest} from './security.js';
const f=await reviewFixture(),origin='http://interruption-qa.invalid',storage=localStorage(f.root);let server,interruptFinalize=false;
try{
  const token=randomUUID();await f.pool.query("INSERT INTO sessions VALUES($1,$2,now()+interval '1 day')",[digest(token),f.editor]);
  const instrumentedStorage={...storage,async finalize(input){await storage.finalize(input);if(interruptFinalize){interruptFinalize=false;throw new Error('QA interruption after rename');}}};
  server=http.createServer(createApp({pool:f.pool,origin,sharedStorage:instrumentedStorage}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`,headers={Origin:origin,Cookie:`ronda_session=${token}`,'Content-Type':'application/json'},project=`/api/workspaces/${f.space}/projects/${f.project}`;
  const call=(p,method='GET',input)=>fetch(base+p,{method,headers,...(input===undefined?{}:{body:JSON.stringify(input)})});
  const reserve=async(input)=>{const r=await call(project+'/uploads','POST',input);assert.equal(r.status,201);return (await r.json()).uploadId;};
  const state=async id=>(await f.pool.query('SELECT * FROM shared_media_files WHERE id=$1',[id])).rows[0];
  const waitFor=async(check)=>{for(let i=0;i<100;i++){if(await check())return;await new Promise(r=>setTimeout(r,20));}assert.fail('bounded wait exceeded');};
  const input={name:'interrupted.png',mime:'image/png',size:1024,requestId:randomUUID()},id=await reserve(input),path=`/api/workspaces/${f.space}/uploads/${id}`;
  const req=http.request(base+path+'/content',{method:'PUT',headers:{...headers,'Content-Type':'image/png','Content-Length':'1024'}});req.on('error',()=>{});req.write(Buffer.from('89504e470d0a1a0a','hex'));
  await waitFor(async()=>Boolean((await state(id)).object_key));req.destroy();
  await waitFor(async()=>(await state(id)).state==='failed');
  assert.equal((await state(id)).object_key,null,'aborted transport releases storage and quota claim');
  await assert.rejects(storage.size(`${f.space}/${id}.part`),{code:'ENOENT'});
  assert.equal((await call(path+'/complete','POST',{})).status,409);
  assert.equal(await reserve(input),id,'same-key retry reuses failed reservation');
  const bytes=Buffer.alloc(1024);Buffer.from('89504e470d0a1a0a','hex').copy(bytes);
  assert.equal((await fetch(base+path+'/content',{method:'PUT',headers:{...headers,'Content-Type':'image/png'},body:bytes})).status,200);
  interruptFinalize=true;
  assert.equal((await call(path+'/complete','POST',{})).status,500,'filesystem success followed by failure rolls SQL back');
  assert.equal((await state(id)).state,'received');assert.equal(await storage.size(`${f.space}/${id}`),1024);
  assert.equal((await f.pool.query('SELECT count(*)::int AS n FROM shared_versions WHERE file_id=$1',[id])).rows[0].n,0);
  const completed=await call(path+'/complete','POST',{});assert.equal(completed.status,200);const ready=await completed.json();
  assert.equal((await (await call(path+'/complete','POST',{})).json()).version.id,ready.version.id);
  assert.equal((await state(id)).state,'ready');
  const invalidInput={name:'invalid.png',mime:'image/png',size:12,requestId:randomUUID()},bad=await reserve(invalidInput);
  assert.equal((await fetch(base+`/api/workspaces/${f.space}/uploads/${bad}/content`,{method:'PUT',headers,body:Buffer.alloc(12)})).status,415);
  assert.equal((await state(bad)).state,'failed');assert.equal((await state(bad)).object_key,null);
  for(const [body,status] of [[Buffer.from('89504e470d0a1a0a','hex'),400],[Buffer.alloc(13),413]]){
    const invalid=await reserve({...invalidInput,requestId:randomUUID()});
    assert.equal((await fetch(base+`/api/workspaces/${f.space}/uploads/${invalid}/content`,{method:'PUT',headers,body})).status,status);
    assert.equal((await state(invalid)).state,'failed');assert.equal((await state(invalid)).object_key,null);
  }
  // One reservation expires before content; another expires with staged content.
  const orphan=await reserve({...invalidInput,requestId:randomUUID()}),received=await reserve({...invalidInput,requestId:randomUUID()});
  const png=Buffer.from('89504e470d0a1a0a00000000','hex');
  assert.equal((await fetch(base+`/api/workspaces/${f.space}/uploads/${received}/content`,{method:'PUT',headers,body:png})).status,200);
  assert.equal((await state(received)).state,'received');
  // Advance only these isolated fixture timestamps; never touch the retained lab.
  await f.pool.query("UPDATE shared_media_files SET expires_at=now()-interval '1 second' WHERE id=ANY($1::uuid[])",[[orphan,received,id]]);
  const repository=sharedReviewRepository(f.pool);
  const result=await reconcileSharedUploads(repository,storage);assert.deepEqual(result,{cleaned:2,failed:0});
  for(const expired of [orphan,received]){assert.equal((await state(expired)).state,'failed');assert.equal((await state(expired)).object_key,null);}
  await assert.rejects(storage.size(`${f.space}/${received}.part`),{code:'ENOENT'});
  assert.equal((await state(id)).state,'ready','cleanup never removes referenced ready original');
  assert.equal(await storage.size(`${f.space}/${id}`),1024);
  assert.deepEqual(await reconcileSharedUploads(repository,storage),{cleaned:0,failed:0});
  const occupied=Number((await f.pool.query("SELECT COALESCE(sum(size),0) AS n FROM shared_media_files WHERE workspace_id=$1 AND (state='ready' OR object_key IS NOT NULL OR (state IN ('staging','received') AND expires_at>now()))",[f.space])).rows[0].n);
  assert.equal(occupied,1024,'only committed original consumes quota after reconciliation');
  console.log('PASS upload recovery: actual transport abort, same-key retry, signature failure cleanup, expired orphan/received reconciliation, quota release, preserved ready original.');
}finally{if(server)await new Promise(r=>server.close(r));await f.close();}
