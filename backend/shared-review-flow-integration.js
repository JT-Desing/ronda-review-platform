import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import http from 'node:http';
import {reviewFixture} from './shared-review-qa-fixture.js';
import {createApp} from './app.js';
import {localStorage} from './storage/local.js';
import {digest} from './security.js';
const f=await reviewFixture(),origin='http://review-qa.invalid';let server;
try{
  server=http.createServer(createApp({pool:f.pool,origin,sharedStorage:localStorage(f.root)}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`,tokens={};
  for(const actor of [f.admin,f.editor,f.reviewer,f.outsider]){const value=randomUUID();tokens[actor]=value;await f.pool.query("INSERT INTO sessions VALUES($1,$2,now()+interval '1 day')",[digest(value),actor]);}
  const path=`/api/workspaces/${f.space}/projects/${f.project}`;
  const call=(p,method='GET',input,actor=f.admin)=>fetch(base+p,{method,headers:{Origin:origin,'Content-Type':'application/json',...(actor?{Cookie:`ronda_session=${tokens[actor]}`}:{})},...(input===undefined?{}:{body:JSON.stringify(input)})});
  assert.equal((await call(`${path}/assets`,'GET',undefined,null)).status,401);
  assert.equal((await call(`${path}/assets`,'GET',undefined,f.outsider)).status,404);
  assert.equal((await call(`${path}/assets`)).status,200);
  const png=Buffer.from('89504e470d0a1a0a00000000','hex');
  const reserve=await call(`${path}/uploads`,'POST',{name:'image.png',mime:'image/png',size:png.length,requestId:randomUUID()});assert.equal(reserve.status,201);
  const {uploadId}=await reserve.json(),uploadPath=`/api/workspaces/${f.space}/uploads/${uploadId}`;
  const uploaded=await fetch(base+uploadPath+'/content',{method:'PUT',headers:{Origin:origin,Cookie:`ronda_session=${tokens[f.admin]}`,'Content-Type':'image/png'},body:png});assert.equal(uploaded.status,200);
  const completed=await call(uploadPath+'/complete','POST',{});assert.equal(completed.status,200);const {asset,version}=await completed.json();
  const versionPath=`${path}/assets/${asset.id}/versions/${version.id}`;
  const gallery=(await (await call(`${path}/assets`,'GET',undefined,f.reviewer)).json()).assets;
  assert.equal(gallery[0].previewFileId,version.fileId);
  assert.equal(gallery[0].previewSize,png.length);
  assert.equal(gallery[0].versionNumber,1);
  assert.equal((await call(versionPath+'/reviewers','PUT',{reviewerIds:[f.reviewer],revision:0})).status,200);
  const created=await call(versionPath+'/comments','POST',{text:'Cambiar título',priority:'blocking',requestId:randomUUID()},f.reviewer);assert.equal(created.status,201);const {comment}=await created.json();
  assert.equal((await (await call(versionPath)).json()).asset.openComments,1,'room summary must include full active-version pending count');
  assert.equal((await call(versionPath+'/decisions','POST',{decision:'approved',revision:1,requestId:randomUUID()},f.reviewer)).status,409);
  assert.equal((await call(versionPath+`/comments/${comment.id}/status`,'PATCH',{status:'resolved',revision:0},f.editor)).status,200);
  assert.equal((await call(versionPath+'/decisions','POST',{decision:'approved',revision:1,requestId:randomUUID()},f.reviewer)).status,200);
  const read=await fetch(base+`/api/workspaces/${f.space}/media/${version.fileId}`,{headers:{Cookie:`ronda_session=${tokens[f.reviewer]}`,Range:'bytes=1-3'}});assert.equal(read.status,206);assert.deepEqual(Buffer.from(await read.arrayBuffer()),png.subarray(1,4));
  const invalidRange=await fetch(base+`/api/workspaces/${f.space}/media/${version.fileId}`,{headers:{Cookie:`ronda_session=${tokens[f.reviewer]}`,Range:'bytes=999-'}});assert.equal(invalidRange.status,416);assert.equal(invalidRange.headers.get('Content-Range'),`bytes */${png.length}`);
  assert.equal((await call(versionPath+'/comments','POST',{text:'Late',requestId:randomUUID()},f.reviewer)).status,409);
  // POST now creates URL artifacts; an empty payload must be rejected.
  assert.equal((await call(`${path}/assets`,'POST',{})).status,400);
  // Delivery mutations are shared, scoped, concurrency-safe and recoverable.
  const second=(await f.pool.query("INSERT INTO shared_assets(workspace_id,project_id,name,kind,created_by,request_id) VALUES($1,$2,'Second','image',$3,$4) RETURNING id",[f.space,f.project,f.admin,randomUUID()])).rows[0].id;
  const ids=[asset.id,second];
  assert.equal((await call(path+'/assets/order','PUT',{order:[...ids].reverse(),previousOrder:ids},f.reviewer)).status,403);
  assert.equal((await call(path+'/assets/order','PUT',{order:[randomUUID(),second],previousOrder:ids})).status,409);
  assert.equal((await call(path+'/assets/order','PUT',{order:[...ids].reverse(),previousOrder:ids},f.editor)).status,200);
  assert.deepEqual((await (await call(path+'/assets')).json()).assets.map(a=>a.id),[...ids].reverse());
  assert.equal((await call(path+'/assets/order','PUT',{order:ids,previousOrder:ids})).status,409);
  const latest=(await (await call(path+'/assets')).json()).assets.find(a=>a.id===asset.id);
  const trashPath=path+'/assets/'+asset.id+'/trash';
  assert.equal((await call(trashPath,'POST',{revision:latest.revision},f.reviewer)).status,403);
  assert.equal((await call(trashPath,'POST',{revision:latest.revision},f.outsider)).status,404);
  assert.equal((await call(trashPath,'POST',{revision:-1})).status,409);
  assert.equal((await call(trashPath,'POST',{revision:latest.revision},f.editor)).status,200);
  assert.equal((await call(versionPath)).status,404);
  assert.deepEqual((await (await call(path+'/assets')).json()).assets.map(a=>a.id),[second]);
  const deleted=(await (await call(path+'/assets/trash')).json()).assets[0];
  assert.equal(deleted.id,asset.id);
  assert.equal((await call(path+'/assets/trash','GET',undefined,f.reviewer)).status,403);
  assert.equal((await call(path+'/assets/'+asset.id+'/restore','POST',{revision:deleted.revision})).status,200);
  assert.equal((await call(versionPath)).status,200);
  assert.equal((await (await call(versionPath+'/comments')).json()).comments[0].id,comment.id);
  // A role update affects the existing authenticated session on the next request.
  await f.pool.query("UPDATE workspace_members SET role='reviewer' WHERE workspace_id=$1 AND user_id=$2",[f.space,f.editor]);
  assert.equal((await call(`${path}/assets`,'GET',undefined,f.editor)).status,200,'the member session remains active for reads after demotion');
  assert.equal((await call(`${path}/uploads`,'POST',{name:'role-check.png',mime:'image/png',size:png.length,requestId:randomUUID()},f.editor)).status,403,'an open session loses upload permission immediately after role change');
  await f.pool.query("UPDATE workspace_members SET role='editor' WHERE workspace_id=$1 AND user_id=$2",[f.space,f.editor]);
  assert.equal((await call(`${path}/uploads`,'POST',{name:'role-restored.png',mime:'image/png',size:png.length,requestId:randomUUID()},f.editor)).status,201,'the same session regains upload permission after editor role is restored');
  console.log('PASS role change in an open session: read access remains, write permissions are re-evaluated per request and restore with role.');
  console.log('PASS delivery: persisted order, role/scope checks, stale conflicts, soft delete and restore with comments.');
  // Expiration rejects reads and writes without mutating already saved feedback.
  await f.pool.query("UPDATE sessions SET expires_at=now()-interval '1 second' WHERE token_hash=$1",[digest(tokens[f.reviewer])]);
  assert.equal((await call(versionPath,'GET',undefined,f.reviewer)).status,401);
  assert.equal((await call(versionPath+'/comments','POST',{text:'Must not persist after expiration',requestId:randomUUID()},f.reviewer)).status,401);
  await f.pool.query("UPDATE sessions SET expires_at=now()+interval '1 day' WHERE token_hash=$1",[digest(tokens[f.reviewer])]);
  const afterExpiry=await call(versionPath+'/comments','GET',undefined,f.reviewer);assert.equal(afterExpiry.status,200);
  const preserved=await afterExpiry.json();assert.equal(preserved.comments.length,1);assert.equal(preserved.comments[0].id,comment.id);
  console.log('PASS HTTP shared review: auth, upload, scoped comments, approval, Range and expired-session rejection without data loss.');
}finally{if(server)await new Promise(r=>server.close(r));await f.close();}
