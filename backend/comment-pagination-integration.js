import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import http from 'node:http';
import {reviewFixture} from './shared-review-qa-fixture.js';
import {createApp} from './app.js';
import {localStorage} from './storage/local.js';
import {digest} from './security.js';
const f=await reviewFixture(),origin='http://pagination-qa.invalid';let server;
try{
 server=http.createServer(createApp({pool:f.pool,origin,sharedStorage:localStorage(f.root)}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`,tokens={};
 for(const actor of [f.admin,f.editor,f.reviewer,f.outsider]){const token=randomUUID();tokens[actor]=token;await f.pool.query("INSERT INTO sessions VALUES($1,$2,now()+interval '1 day')",[digest(token),actor]);}
 const call=(path,method='GET',input,actor=f.reviewer)=>fetch(base+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(actor?{Cookie:`ronda_session=${tokens[actor]}`}:{})},...(input===undefined?{}:{body:JSON.stringify(input)})});
 const json=async(path,method='GET',input,actor=f.reviewer,status=200)=>{const response=await call(path,method,input,actor);const body=await response.json();assert.equal(response.status,status,JSON.stringify(body));return body;};
 const projectPath=`/api/workspaces/${f.space}/projects/${f.project}`;
 const png=Buffer.from('89504e470d0a1a0a00000000','hex');
 const {uploadId}=await json(projectPath+'/uploads','POST',{name:'pagination.png',mime:'image/png',size:png.length,requestId:randomUUID()},f.admin,201);
 const uploadPath=`/api/workspaces/${f.space}/uploads/${uploadId}`;
 assert.equal((await fetch(base+uploadPath+'/content',{method:'PUT',headers:{Origin:origin,Cookie:`ronda_session=${tokens[f.admin]}`,'Content-Type':'image/png'},body:png})).status,200);
 const {asset,version}=await json(uploadPath+'/complete','POST',{},f.admin);
 const versionPath=`${projectPath}/assets/${asset.id}/versions/${version.id}`,commentsPath=versionPath+'/comments',created=[];
 for(let i=0;i<123;i++)created.push((await json(commentsPath,'POST',{text:`Pagination ${i}`,priority:i===121?'blocking':'normal',requestId:randomUUID()},f.reviewer,201)).comment);
 for(const index of [0,60,122])await json(`${commentsPath}/${created[index].id}/status`,'PATCH',{status:'resolved',revision:0},f.editor);
 // A shared timestamp stresses UUID tie-breaking across both 50-row boundaries.
 await f.pool.query("UPDATE shared_version_comments SET created_at='2026-01-01 12:00:00.123456+00' WHERE version_id=$1",[version.id]);
 const expected=(await f.pool.query("SELECT id FROM shared_version_comments WHERE version_id=$1 AND status='open' ORDER BY created_at,id",[version.id])).rows.map(r=>r.id);
 let cursor=null;const pages=[],seen=[];
 do{const page=await json(commentsPath+(cursor?'?cursor='+encodeURIComponent(cursor):''));pages.push(page);seen.push(...page.comments.map(c=>c.id));cursor=page.nextCursor;assert.ok(pages.length<=3,'cursor must terminate');}while(cursor);
 assert.deepEqual(pages.map(p=>p.comments.length),[50,50,20]);assert.equal(new Set(seen).size,120);assert.deepEqual(seen,expected);assert.ok(pages.every(page=>page.comments.every(comment=>comment.status==='open')));
 assert.deepEqual((await json(commentsPath+'?cursor='+encodeURIComponent(pages[0].nextCursor))).comments.map(c=>c.id),pages[1].comments.map(c=>c.id),'cursor replay is stable');
 const last=expected.at(-1),terminal=Buffer.from(JSON.stringify({versionId:version.id,time:'2026-01-01 12:00:00.123456+00',id:last})).toString('base64url');
 const terminalPage=await json(commentsPath+'?cursor='+terminal);
 assert.deepEqual(terminalPage.comments,[]);assert.equal(terminalPage.nextCursor,null);
 for(const page of [...pages,terminalPage])assert.deepEqual(page.commentStats,{total:123,open:120,resolved:3,blocking:1});
 for(const actor of [null,f.outsider])for(const suffix of ['', '?cursor='+pages[0].nextCursor])assert.equal((await call(commentsPath+suffix,'GET',undefined,actor)).status,actor?404:401);
 for(const bad of ['not-json','x'.repeat(513),Buffer.from(JSON.stringify({versionId:randomUUID(),id:last,time:'2026-01-01T00:00:00Z'})).toString('base64url')])assert.equal((await call(commentsPath+'?cursor='+bad)).status,400);
 const room=await json(versionPath),gallery=await json(projectPath+'/assets');
 assert.equal(room.asset.openComments,120);assert.equal(gallery.assets[0].openComments,120);
 assert.equal((await call(`${commentsPath}/${created[1].id}/status`,'PATCH',{status:'resolved',revision:0},f.reviewer)).status,403);
 // Invalid calendar dates pass Date.parse by rollover but must not become server errors.
 const invalidDate=Buffer.from(JSON.stringify({versionId:version.id,id:last,time:'2026-02-30T00:00:00Z'})).toString('base64url');
 assert.equal((await call(commentsPath+'?cursor='+invalidDate)).status,400);
 console.log('PASS HTTP pagination: only 120 open comments returned across 50/50/20 pages; three resolved rows remain counted and hidden; cursor ties/replay/end, role/scope and malformed cursor rejection.');
}finally{if(server)await new Promise(r=>server.close(r));await f.close();}
