import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {reviewFixture} from './shared-review-qa-fixture.js';
import {sharedReviewRepository} from './repositories/shared-review.js';
import {localStorage} from './storage/local.js';
import {sharedMediaService} from './shared-media-service.js';
const f=await reviewFixture();
try{
  const service=sharedMediaService(sharedReviewRepository(f.pool),localStorage(f.root));
  const png=Buffer.from('89504e470d0a1a0a00000000','hex');
  const initial={projectId:f.project,name:'piece.png',mime:'image/png',size:png.length,requestId:randomUUID()};
  async function upload(assetId){const {uploadId}=await service.reserve(f.space,f.admin,{...initial,assetId,requestId:randomUUID()});await service.receive(f.space,f.admin,uploadId,Readable.from([png]));return uploadId;}
  const {uploadId:id}=await service.reserve(f.space,f.admin,initial);await service.receive(f.space,f.admin,id,Readable.from([png]));
  const first=await service.completeUpload(f.space,f.admin,id);
  assert.equal(first.version.number,1);
  assert.equal((await service.completeUpload(f.space,f.admin,id)).version.id,first.version.id);
  assert.equal((await service.reserve(f.space,f.admin,initial)).uploadId,id,'Initial reservation can replay after complete');
  const context={projectId:f.project,assetId:first.asset.id,versionId:first.version.id};
  await service.setReviewers(f.space,f.admin,{...context,reviewerIds:[f.reviewer],revision:0});
  const ids=await Promise.all([upload(first.asset.id),upload(first.asset.id)]);
  const versions=await Promise.all(ids.map(id=>service.completeUpload(f.space,f.admin,id)));
  assert.deepEqual(versions.map(x=>x.version.number).sort(),[2,3]);
  assert.notEqual(versions[0].version.fileId,first.version.fileId);
  assert.equal(versions[0].version.decisions[f.reviewer],'pending');
  assert.equal((await service.listVersions(f.space,f.reviewer,f.project,first.asset.id)).versions.length,3);
  await assert.rejects(service.setReviewers(f.space,f.admin,{...context,revision:1,reviewerIds:[f.outsider]}),{status:400});
  const read=await service.readFile(f.space,f.reviewer,first.version.fileId,{range:'bytes=1-3'});
  const chunks=[];for await(const bytes of read.stream)chunks.push(bytes);
  assert.deepEqual(Buffer.concat(chunks),png.subarray(1,4));
  await assert.rejects(service.readFile(f.space,f.reviewer,first.version.fileId,{download:true}),{status:403});
  await assert.rejects(service.readFile(f.space,f.outsider,first.version.fileId),{status:404});
  await assert.rejects(service.readFile(f.space,f.admin,first.version.fileId,{range:'bytes=999-'}),{status:416});
  console.log('PASS shared versions: immutable originals, unique numbers, pending reviewers, scoped reads/ranges.');
}finally{await f.close();}
