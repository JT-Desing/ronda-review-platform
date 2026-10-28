import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import http from 'node:http';
import {reviewFixture} from './shared-review-qa-fixture.js';
import {createApp} from './app.js';
import {localStorage} from './storage/local.js';
import {digest} from './security.js';
const f=await reviewFixture(),origin='http://media-qa.invalid';let server;
try{
  const storage=localStorage(f.root);
  server=http.createServer(createApp({pool:f.pool,origin,sharedStorage:storage}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`,tokens={};
  const extraEditor=(await f.pool.query("INSERT INTO users(email,name,password_hash) VALUES('review-extra-editor@example.invalid','QA extra editor','not-a-login') RETURNING id")).rows[0].id;
  const secondReviewer=(await f.pool.query("INSERT INTO users(email,name,password_hash) VALUES('review-extra-reviewer@example.invalid','QA second reviewer','not-a-login') RETURNING id")).rows[0].id;
  await f.pool.query("INSERT INTO workspace_members VALUES($1,$2,'editor'),($1,$3,'reviewer')",[f.space,extraEditor,secondReviewer]);
  const team=[f.admin,f.editor,extraEditor,f.reviewer,secondReviewer];
  for(const actor of [...team,f.outsider]){tokens[actor]=randomUUID();await f.pool.query("INSERT INTO sessions VALUES($1,$2,now()+interval '1 day')",[digest(tokens[actor]),actor]);}
  const path=`/api/workspaces/${f.space}/projects/${f.project}`;
  const call=(p,method='GET',input,actor=f.editor)=>fetch(base+p,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:`ronda_session=${tokens[actor]}`},...(input===undefined?{}:{body:JSON.stringify(input)})});
  const json=async(p,method,input,actor)=>{const r=await call(p,method,input,actor);assert.ok(r.ok,`${method} ${p}: ${r.status} ${await r.clone().text()}`);return r.json();};
  const png=Buffer.from('89504e470d0a1a0a00000000','hex');
  const upload=async(name,assetId,actor=f.editor)=>{
    const {uploadId}=await json(path+'/uploads','POST',{name,mime:'image/png',size:png.length,requestId:randomUUID(),...(assetId?{assetId}:{})},actor);
    const p=`/api/workspaces/${f.space}/uploads/${uploadId}`;
    const r=await fetch(base+p+'/content',{method:'PUT',headers:{Origin:origin,Cookie:`ronda_session=${tokens[actor]}`,'Content-Type':'image/png'},body:png});assert.equal(r.status,200);
    return {p,actor};
  };
  const complete=({p,actor})=>json(p+'/complete','POST',{},actor);
  for(const [actor,status] of [[f.reviewer,403],[f.outsider,404]])assert.equal((await call(path+'/uploads','POST',{name:'no.png',mime:'image/png',size:12,requestId:randomUUID()},actor)).status,status);
  const pending=await Promise.all([upload('one.png'),upload('two.png',null,f.admin),upload('three.png',null,extraEditor)]);
  assert.equal((await call(pending[0].p+'/complete','POST',{},f.admin)).status,403);
  const pieces=await Promise.all(pending.map(complete));
  assert.equal(new Set(pieces.map(p=>p.asset.id)).size,3,'concurrent editor/admin uploads create distinct assets');
  assert.equal((await json(path+'/assets')).assets.length,3);
  assert.equal((await complete(pending[0])).version.id,pieces[0].version.id,'completion retry must not duplicate version');
  const {asset,version}=pieces[0],vp=`${path}/assets/${asset.id}/versions/${version.id}`;
  for(const [p,method,input] of [
    [path+'/assets/order','PUT',{order:pieces.map(p=>p.asset.id),previousOrder:pieces.map(p=>p.asset.id)}],
    [path+'/assets/'+asset.id+'/trash','POST',{revision:asset.revision}],
    [vp+'/reviewers','PUT',{reviewerIds:[f.reviewer],revision:0}],
  ])for(const [actor,status] of [[f.reviewer,403],[f.outsider,404]])assert.equal((await call(p,method,input,actor)).status,status);
  const ids=(await json(path+'/assets')).assets.map(a=>a.id);
  const ordered=await Promise.all([call(path+'/assets/order','PUT',{order:[...ids].reverse(),previousOrder:ids}),call(path+'/assets/order','PUT',{order:[...ids].reverse(),previousOrder:ids},f.admin)]);
  assert.deepEqual(ordered.map(r=>r.status).sort(),[200,409]);
  const comments=await Promise.all(team.map((actor,i)=>json(vp+'/comments','POST',{text:`concurrent ${i}`,requestId:randomUUID()},actor)));
  assert.equal((await json(vp+'/comments')).comments.length,5,'all five team identities can comment concurrently');
  const commentId=comments[1].comment.id;
  const edits=await Promise.all(['edit A','edit B'].map(text=>call(vp+'/comments/'+commentId+'/text','PATCH',{text,revision:0})));
  assert.deepEqual(edits.map(r=>r.status).sort(),[200,409]);
  await json(vp+'/reviewers','PUT',{reviewerIds:[f.reviewer,secondReviewer],revision:0});
  const decisions=await Promise.all([f.reviewer,secondReviewer].map(actor=>call(vp+'/decisions','POST',{decision:'approved',revision:1,requestId:randomUUID()},actor)));
  assert.deepEqual(decisions.map(r=>r.status).sort(),[200,409]);
  const staleIndex=decisions.findIndex(r=>r.status===409),staleActor=[f.reviewer,secondReviewer][staleIndex];
  await json(vp+'/decisions','POST',{decision:'approved',revision:2,requestId:randomUUID()},staleActor);
  assert.equal((await json(vp)).version.status,'approved');
  assert.equal((await call(vp+'/comments','POST',{text:'late',requestId:randomUUID()},f.reviewer)).status,409);
  const versions=await Promise.all([upload('v2.png',asset.id),upload('v3.png',asset.id,f.admin)]);
  const completed=await Promise.all(versions.map(complete));
  assert.deepEqual(completed.map(r=>r.version.number).sort(),[2,3]);
  const room=await json(path+'/assets/'+asset.id+'/versions');
  assert.equal(room.versions.length,3);assert.equal(room.versions[0].number,3);
  // Historical open comments stay visible in history but are not active work.
  await json(path+'/comments','POST',{text:'general project comment',requestId:randomUUID()});
  let summary=(await json(`/api/workspaces/${f.space}/projects`)).projects.find(p=>p.id===f.project);
  assert.equal(summary.open_review_comments,0,'project card must exclude open comments from historical versions');
  assert.equal(summary.open_comments,1,'general project comments retain their separate count');
  const activePath=`${path}/assets/${asset.id}/versions/${room.versions[0].id}`;
  await json(activePath+'/comments','POST',{text:'active action',requestId:randomUUID()},f.reviewer);
  summary=(await json(`/api/workspaces/${f.space}/projects`)).projects.find(p=>p.id===f.project);
  assert.equal(summary.open_review_comments,1);
  assert.equal(summary.open_comments,1);
  const current=room.asset;
  const trash=await Promise.all([call(path+'/assets/'+asset.id+'/trash','POST',{revision:current.revision}),call(path+'/assets/'+asset.id+'/trash','POST',{revision:current.revision},f.admin)]);
  assert.deepEqual(trash.map(r=>r.status).sort(),[200,409]);
  assert.equal((await call(vp)).status,404);
  summary=(await json(`/api/workspaces/${f.space}/projects`)).projects.find(p=>p.id===f.project);
  assert.equal(summary.open_review_comments,0,'trash excludes active review comments');
  assert.equal(summary.open_comments,1);
  const media=`/api/workspaces/${f.space}/media/${version.fileId}`;
  assert.equal((await call(media,'GET',undefined,f.reviewer)).status,404,'trashed media must not remain readable through saved URL');
  assert.equal((await call(media+'?download=1','GET',undefined,f.editor)).status,404);
  const range=await fetch(base+media,{headers:{Cookie:`ronda_session=${tokens[f.reviewer]}`,Range:'bytes=0-3'}});assert.equal(range.status,404);
  const deleted=(await json(path+'/assets/trash')).assets.find(a=>a.id===asset.id);
  for(const [actor,status] of [[f.reviewer,403],[f.outsider,404]])assert.equal((await call(path+'/assets/'+asset.id+'/restore','POST',{revision:deleted.revision},actor)).status,status,'only authorized team roles can restore a trashed asset');
  await json(path+'/assets/'+asset.id+'/restore','POST',{revision:deleted.revision});
  summary=(await json(`/api/workspaces/${f.space}/projects`)).projects.find(p=>p.id===f.project);
  assert.equal(summary.open_review_comments,1,'restore recovers only active-version pending count');
  const restored=await call(media,'GET',undefined,f.reviewer);assert.equal(restored.status,200);assert.deepEqual(Buffer.from(await restored.arrayBuffer()),png);
  assert.equal((await json(vp+'/comments')).comments.length,5,'all five team comments survive trash and restore');
  assert.equal((await call(media,'GET',undefined,f.outsider)).status,404);
  assert.equal((await f.pool.query('SELECT count(*)::int AS n FROM shared_versions WHERE asset_id=$1',[asset.id])).rows[0].n,3);
  console.log('PASS media concurrency: five active team identities (admin, two editors, two reviewers), three simultaneous authorized uploads, five simultaneous comments, order/edits/decisions/versions/trash, stale conflicts, restore and persisted rows.');
}finally{if(server)await new Promise(r=>server.close(r));await f.close();}
