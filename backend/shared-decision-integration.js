import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {reviewFixture} from './shared-review-qa-fixture.js';
import {sharedReviewRepository} from './repositories/shared-review.js';
import {localStorage} from './storage/local.js';
import {sharedMediaService} from './shared-media-service.js';
import {sharedCommentService} from './shared-comment-service.js';
const f=await reviewFixture();
try{
  const repo=sharedReviewRepository(f.pool),media=sharedMediaService(repo,localStorage(f.root)),comments=sharedCommentService(repo);
  const bytes=Buffer.from('89504e470d0a1a0a00000000','hex');
  const {uploadId}=await media.reserve(f.space,f.admin,{projectId:f.project,name:'QA',mime:'image/png',size:bytes.length,requestId:randomUUID()});
  await media.receive(f.space,f.admin,uploadId,Readable.from([bytes]));
  const {asset,version}=await media.completeUpload(f.space,f.admin,uploadId),c={projectId:f.project,assetId:asset.id,versionId:version.id};
  const {sharedDecisionService}=await import('./shared-decision-service.js');const decisions=sharedDecisionService(repo);
  // A piece without assigned reviewers can be approved directly by a member; the decision assigns them.
  const quick=await media.reserve(f.space,f.admin,{projectId:f.project,name:'QA directa',mime:'image/png',size:bytes.length,requestId:randomUUID()});
  await media.receive(f.space,f.admin,quick.uploadId,Readable.from([bytes]));
  const direct=await media.completeUpload(f.space,f.admin,quick.uploadId),dc={projectId:f.project,assetId:direct.asset.id,versionId:direct.version.id};
  const approvedDirect=await decisions.decide(f.space,f.editor,dc,{decision:'approved',revision:0,requestId:randomUUID()});
  assert.equal(approvedDirect.version.status,'approved');assert.equal(approvedDirect.version.decisions[f.editor],'approved');
  await assert.rejects(decisions.decide(f.space,f.reviewer,dc,{decision:'changes_requested',revision:1,requestId:randomUUID()}),{status:409});
  await media.setReviewers(f.space,f.admin,{...c,revision:0,reviewerIds:[f.reviewer]});
  const blocker=(await comments.addComment(f.space,f.editor,c,{text:'Bloqueante',priority:'blocking',requestId:randomUUID()})).comment;
  await assert.rejects(decisions.decide(f.space,f.reviewer,c,{decision:'approved',revision:1,requestId:randomUUID()}),{status:409});
  await comments.setStatus(f.space,f.admin,c,blocker.id,{status:'resolved',revision:0});
  const request={decision:'approved',revision:1,requestId:randomUUID()};
  const result=await decisions.decide(f.space,f.reviewer,c,request);assert.equal(result.version.status,'approved');
  assert.equal((await decisions.decide(f.space,f.reviewer,c,request)).version.status,'approved');
  const nextUpload=await media.reserve(f.space,f.admin,{projectId:f.project,assetId:asset.id,name:'QA v2',mime:'image/png',size:bytes.length,requestId:randomUUID()});
  await media.receive(f.space,f.admin,nextUpload.uploadId,Readable.from([bytes]));
  const nextVersion=await media.completeUpload(f.space,f.admin,nextUpload.uploadId);
  assert.equal(nextVersion.version.status,'reviewing');assert.equal(nextVersion.version.decisions[f.reviewer],'pending');
  await assert.rejects(comments.reply(f.space,f.editor,c,blocker.id,{text:'Late',requestId:randomUUID()}),{status:409});
  // Removing the only assigned member reopens approval without deleting history.
  const {workspaceService}=await import('./workspace-service.js');
  const {workspaceRepository}=await import('./repositories/workspaces.js');
  await workspaceService(workspaceRepository(f.pool)).updateMember(f.space,f.admin,f.reviewer,null);
  assert.equal((await f.pool.query('SELECT status FROM shared_versions WHERE id=$1',[c.versionId])).rows[0].status,'reviewing');
  assert.equal((await f.pool.query('SELECT decision FROM shared_review_decisions WHERE version_id=$1 AND user_id=$2',[c.versionId,f.reviewer])).rows[0].decision,'approved');
  await f.pool.query("INSERT INTO workspace_members VALUES($1,$2,'reviewer')",[f.space,f.reviewer]);
  const current=(await f.pool.query('SELECT revision FROM shared_versions WHERE id=$1',[c.versionId])).rows[0].revision;
  await media.setReviewers(f.space,f.admin,{...c,reviewerIds:[f.reviewer],revision:current});
  const race=await Promise.allSettled([
    decisions.decide(f.space,f.reviewer,c,{decision:'approved',revision:current+1,requestId:randomUUID()}),
    comments.addComment(f.space,f.editor,c,{text:'Bloqueante concurrente',priority:'blocking',requestId:randomUUID()})
  ]);
  assert.equal(race.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(race.find(r=>r.status==='rejected').reason.status,409);
  const raceStatus=(await f.pool.query('SELECT status FROM shared_versions WHERE id=$1',[c.versionId])).rows[0].status;
  const open=(await f.pool.query("SELECT count(*)::integer AS count FROM shared_version_comments WHERE version_id=$1 AND priority='blocking' AND status='open'",[c.versionId])).rows[0].count;
  assert.equal(raceStatus==='approved'&&open>0,false);
  console.log('PASS shared decisions: assignment, blockers, readonly, retries and revocation history.');
}finally{await f.close();}
