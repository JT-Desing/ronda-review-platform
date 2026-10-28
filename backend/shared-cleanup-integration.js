import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {reviewFixture} from './shared-review-qa-fixture.js';
import {sharedReviewRepository} from './repositories/shared-review.js';
import {localStorage} from './storage/local.js';
import {sharedMediaService} from './shared-media-service.js';
const f=await reviewFixture();
try{
  const storage=localStorage(f.root),repo=sharedReviewRepository(f.pool),media=sharedMediaService(repo,storage);
  const png=Buffer.from('89504e470d0a1a0a00000000','hex'),input={projectId:f.project,name:'QA',mime:'image/png',size:png.length};
  async function upload(){const r=await media.reserve(f.space,f.admin,{...input,requestId:randomUUID()});await media.receive(f.space,f.admin,r.uploadId,Readable.from([png]));return r.uploadId;}
  const expired=await upload(),ready=await upload();await media.completeUpload(f.space,f.admin,ready);
  const lost=await upload();await storage.finalize({temporaryKey:`${f.space}/${lost}.part`,key:`${f.space}/${lost}`});
  // Simulate SQL rollback after promotion: complete must recover without another original.
  const recovered=await media.completeUpload(f.space,f.admin,lost);assert.equal(recovered.version.number,1);
  await f.pool.query("UPDATE shared_media_files SET expires_at=now()-interval '1 hour' WHERE id=$1",[expired]);
  await f.pool.query('UPDATE shared_media_files SET size=104857600 WHERE id=$1',[expired]);
  for(let i=0;i<19;i++)await media.reserve(f.space,f.admin,{...input,size:104857600,requestId:randomUUID()});
  await assert.rejects(media.reserve(f.space,f.admin,{...input,size:62914560,requestId:randomUUID()}),{status:413},'Stored expired bytes still count until actually cleaned');
  const {reconcileSharedUploads}=await import('./shared-upload-recovery.js');
  const result=await reconcileSharedUploads(repo,storage);assert.equal(result.cleaned,1);
  await assert.rejects(storage.size(`${f.space}/${expired}.part`),{code:'ENOENT'});
  assert.equal(await storage.size(`${f.space}/${ready}`),png.length);
  assert.equal(await storage.size(`${f.space}/${lost}`),png.length);
  assert.equal((await f.pool.query('SELECT state FROM shared_media_files WHERE id=$1',[expired])).rows[0].state,'failed');
  assert.equal((await reconcileSharedUploads(repo,storage)).cleaned,0);
  console.log('PASS cleanup/recovery: expired unreferenced only; ready originals retained; promotion rollback recovered.');
}finally{await f.close();}
