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
  assert.equal((await call(versionPath+'/reviewers','PUT',{reviewerIds:[f.reviewer],revision:0})).status,200);
  const created=await call(versionPath+'/comments','POST',{text:'Cambiar título',priority:'blocking',requestId:randomUUID()},f.reviewer);assert.equal(created.status,201);const {comment}=await created.json();
  assert.equal((await call(versionPath+'/decisions','POST',{decision:'approved',revision:1,requestId:randomUUID()},f.reviewer)).status,409);
  assert.equal((await call(versionPath+`/comments/${comment.id}/status`,'PATCH',{status:'resolved',revision:0},f.editor)).status,200);
  assert.equal((await call(versionPath+'/decisions','POST',{decision:'approved',revision:1,requestId:randomUUID()},f.reviewer)).status,200);
  const read=await fetch(base+`/api/workspaces/${f.space}/media/${version.fileId}`,{headers:{Cookie:`ronda_session=${tokens[f.reviewer]}`,Range:'bytes=1-3'}});assert.equal(read.status,206);assert.deepEqual(Buffer.from(await read.arrayBuffer()),png.subarray(1,4));
  const invalidRange=await fetch(base+`/api/workspaces/${f.space}/media/${version.fileId}`,{headers:{Cookie:`ronda_session=${tokens[f.reviewer]}`,Range:'bytes=999-'}});assert.equal(invalidRange.status,416);assert.equal(invalidRange.headers.get('Content-Range'),`bytes */${png.length}`);
  assert.equal((await call(versionPath+'/comments','POST',{text:'Late',requestId:randomUUID()},f.reviewer)).status,409);
  assert.equal((await call(`${path}/assets`,'POST',{})).status,405);
  console.log('PASS HTTP shared review: auth, upload, scoped comments, approval and Range.');
}finally{if(server)await new Promise(r=>server.close(r));await f.close();}
