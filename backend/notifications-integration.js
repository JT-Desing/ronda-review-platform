import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {reviewFixture} from './shared-review-qa-fixture.js';
import {sharedReviewRepository} from './repositories/shared-review.js';
import {localStorage} from './storage/local.js';
import {sharedMediaService} from './shared-media-service.js';
import {sharedCommentService} from './shared-comment-service.js';
import {sharedDecisionService} from './shared-decision-service.js';
import {listNotifications,markNotificationsRead,sendNotificationDigests} from './notifications.js';
const f=await reviewFixture();
try{
  const repo=sharedReviewRepository(f.pool),media=sharedMediaService(repo,localStorage(f.root)),comments=sharedCommentService(repo),decisions=sharedDecisionService(repo);
  const bytes=Buffer.from('89504e470d0a1a0a00000000','hex');
  const upload=async(actor,extra={})=>{const {uploadId}=await media.reserve(f.space,actor,{projectId:f.project,name:'Banner',mime:'image/png',size:bytes.length,requestId:randomUUID(),...extra});await media.receive(f.space,actor,uploadId,Readable.from([bytes]));return media.completeUpload(f.space,actor,uploadId);};
  const kinds=async user=>(await listNotifications(f.pool,user)).items.map(item=>item.kind);

  // The editor uploads: the rest of the team hears about it, the uploader and outsiders do not.
  const {asset,version}=await upload(f.editor);const c={projectId:f.project,assetId:asset.id,versionId:version.id};
  assert.deepEqual(await kinds(f.admin),['asset']);assert.deepEqual(await kinds(f.reviewer),['asset']);
  assert.deepEqual(await kinds(f.editor),[]);assert.deepEqual(await kinds(f.outsider),[]);
  const first=(await listNotifications(f.pool,f.admin)).items[0];
  assert.equal(first.details.assetName,'Banner');assert.equal(first.actorName,'QA 1');assert.equal(first.details.projectId,f.project);

  // A comment reaches the uploader; a mention reaches the tagged person as a mention, once.
  const made=(await comments.addComment(f.space,f.reviewer,c,{text:'Revisa el logo @QA 0',mentionIds:[f.admin,f.outsider],requestId:randomUUID()})).comment;
  assert.deepEqual(await kinds(f.editor),['comment']);
  assert.deepEqual(await kinds(f.admin),['mention','asset']);
  assert.deepEqual(await kinds(f.outsider),[],'mentions never reach people outside the space');
  await assert.rejects(comments.addComment(f.space,f.reviewer,c,{text:'x',mentionIds:['nope'],requestId:randomUUID()}),{status:400});

  // A reply reaches the comment author and the owner, not the person replying.
  await comments.reply(f.space,f.editor,c,made.id,{text:'Listo, lo cambio',requestId:randomUUID()});
  assert.equal((await kinds(f.reviewer))[0],'reply');assert.equal((await kinds(f.editor)).length,1);

  // A new version reaches the team; a decision reaches the owner.
  const next=await upload(f.admin,{assetId:asset.id,name:'Banner v2'});
  assert.equal((await kinds(f.editor))[0],'version');assert.equal((await kinds(f.reviewer))[0],'version');
  await decisions.decide(f.space,f.reviewer,{...c,versionId:next.version.id},{decision:'approved',revision:0,requestId:randomUUID()});
  assert.equal((await kinds(f.editor))[0],'decision');

  // Reading: one by id, then all; nobody can mark someone else's.
  const editorItems=(await listNotifications(f.pool,f.editor)).items;
  await markNotificationsRead(f.pool,f.admin,{ids:[editorItems[0].id]});
  assert.equal((await listNotifications(f.pool,f.editor)).unread,editorItems.length);
  await markNotificationsRead(f.pool,f.editor,{ids:[editorItems[0].id]});
  assert.equal((await listNotifications(f.pool,f.editor)).unread,editorItems.length-1);
  await markNotificationsRead(f.pool,f.editor,{all:true});
  assert.equal((await listNotifications(f.pool,f.editor)).unread,0);
  await assert.rejects(markNotificationsRead(f.pool,f.editor,{ids:['x']}),{status:400});

  // Digest: one email per person with unread items, none for read ones, never twice.
  const sent=[];const mailer={enabled:true,send:async message=>{sent.push(message);return {};}};
  await sendNotificationDigests({pool:f.pool,mailer,origin:'https://ronda.test'});
  const to=sent.map(message=>message.to).sort();
  assert.deepEqual(to,['review-0@example.invalid','review-2@example.invalid']);
  assert.ok(sent.every(message=>message.text.includes(`https://ronda.test/#team/${f.space}/${f.project}`)));
  assert.match(sent.find(message=>message.to==='review-0@example.invalid').text,/te mencionó en "Banner"/);
  await sendNotificationDigests({pool:f.pool,mailer,origin:'https://ronda.test'});
  assert.equal(sent.length,2);

  // A restricted project only notifies people who can open it, mentions included.
  const hidden=(await f.pool.query("INSERT INTO shared_projects(workspace_id,name,created_by,request_id,restricted) VALUES($1,'Privado',$2,$3,true) RETURNING id",[f.space,f.admin,randomUUID()])).rows[0].id;
  await f.pool.query("INSERT INTO shared_project_members VALUES($1,$2,$3,'editor')",[f.space,hidden,f.editor]);
  const before={reviewer:(await kinds(f.reviewer)).length,editor:(await kinds(f.editor)).length};
  const {uploadId}=await media.reserve(f.space,f.admin,{projectId:hidden,name:'Secreto',mime:'image/png',size:bytes.length,requestId:randomUUID()});
  await media.receive(f.space,f.admin,uploadId,Readable.from([bytes]));
  const secret=await media.completeUpload(f.space,f.admin,uploadId);
  await comments.addComment(f.space,f.admin,{projectId:hidden,assetId:secret.asset.id,versionId:secret.version.id},{text:'@QA 2 mira',mentionIds:[f.reviewer],requestId:randomUUID()});
  assert.equal((await kinds(f.reviewer)).length,before.reviewer,'no access, no notification');
  assert.equal((await kinds(f.editor)).length,before.editor+1,'a selected member is notified');

  // Leaving the space hides its notifications.
  await f.pool.query('DELETE FROM workspace_members WHERE workspace_id=$1 AND user_id=$2',[f.space,f.reviewer]);
  assert.deepEqual(await kinds(f.reviewer),[]);
  console.log('PASS notifications: uploads, versions, comments, replies, mentions, decisions, read state, digest email and membership.');
}finally{await f.close();}
