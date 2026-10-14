import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {reviewFixture} from './shared-review-qa-fixture.js';
import {sharedReviewRepository} from './repositories/shared-review.js';
import {sharedCommentService} from './shared-comment-service.js';
import http from 'node:http';
import {createApp} from './app.js';
import {digest} from './security.js';
const f=await reviewFixture();
try{
 const repo=sharedReviewRepository(f.pool),service=sharedCommentService(repo);
 const asset=(await f.pool.query("INSERT INTO shared_assets(workspace_id,project_id,name,kind,created_by,request_id) VALUES($1,$2,'QA','image',$3,$4) RETURNING id",[f.space,f.project,f.admin,randomUUID()])).rows[0];
 const v=(await f.pool.query("INSERT INTO shared_versions(workspace_id,project_id,asset_id,number,external_url,external_mime) VALUES($1,$2,$3,1,'https://example.com/a.png','image/png') RETURNING id",[f.space,f.project,asset.id])).rows[0];
 const c={projectId:f.project,assetId:asset.id,versionId:v.id};
 const input={text:'',requestId:randomUUID(),attachments:[{name:'nota.mp3',dataUrl:'data:audio/mpeg;base64,'+Buffer.from('ID3 test audio').toString('base64')}]};
 const added=await service.addComment(f.space,f.admin,c,input);
 await service.addComment(f.space,f.admin,c,input);
 const page=await service.listComments(f.space,f.reviewer,c);
 assert.equal(page.comments.length,1);assert.equal(page.comments[0].attachments.length,1);
 const id=page.comments[0].attachments[0].id;
 assert.equal((await service.readAudio(f.space,f.reviewer,c,added.comment.id,id)).bytes.toString(),'ID3 test audio');
 await assert.rejects(service.readAudio(f.space,f.outsider,c,added.comment.id,id));
 await assert.rejects(service.addComment(f.space,f.admin,c,{...input,attachments:[]}),{status:400});
 const origin='http://audio-qa.invalid',server=http.createServer(createApp({pool:f.pool,origin}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const token=randomUUID();await f.pool.query("INSERT INTO sessions VALUES($1,$2,now()+interval '1 hour')",[digest(token),f.admin]);
  const base=`http://127.0.0.1:${server.address().port}/api/workspaces/${f.space}/projects/${f.project}/assets/${asset.id}/versions/${v.id}/comments`;
  const bytes=Buffer.concat([Buffer.from('ID3'),Buffer.alloc(270000)]);
  const response=await fetch(base,{method:'POST',headers:{Origin:origin,Cookie:`ronda_session=${token}`,'Content-Type':'application/json'},body:JSON.stringify({text:'Transport audio',requestId:randomUUID(),attachments:[{name:'audio.mp3',dataUrl:'data:audio/mpeg;base64,'+bytes.toString('base64')}]})});
  assert.equal(response.status,201);
  const listing=await (await fetch(base,{headers:{Cookie:`ronda_session=${token}`}})).json();
  const added=listing.comments.find(c=>c.text==='Transport audio');
  const url=base+`/${added.id}/audio/${added.attachments[0].id}`;
  assert.equal((await fetch(url)).status,401);
  const audio=await fetch(url,{headers:{Cookie:`ronda_session=${token}`}});assert.equal(audio.status,200);assert.equal((await audio.arrayBuffer()).byteLength,bytes.length);
 }finally{await new Promise(resolve=>server.close(resolve));}
 await f.pool.query('UPDATE shared_projects SET deleted_at=now() WHERE id=$1',[f.project]);
 await assert.rejects(service.readAudio(f.space,f.admin,c,added.comment.id,id),{status:404});
 console.log('PASS audio comments: persistence, metadata, retry, member access and deleted project isolation.');
}finally{await f.close();}
