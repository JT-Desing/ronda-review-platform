import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {randomUUID} from 'node:crypto';
import {reviewFixture} from './shared-review-qa-fixture.js';
import {sharedReviewRepository} from './repositories/shared-review.js';
const f=await reviewFixture();
try{
  const {localStorage}=await import('./storage/local.js');
  const {sharedMediaService}=await import('./shared-media-service.js');
  const service=sharedMediaService(sharedReviewRepository(f.pool),localStorage(f.root));
  const png=Buffer.from('89504e470d0a1a0a00000000','hex');
  const input={projectId:f.project,name:'test.png',mime:'image/png',size:png.length,requestId:randomUUID()};
  await assert.rejects(service.reserve(f.space,f.reviewer,input),{status:403});
  await assert.rejects(service.reserve(f.space,f.outsider,input),{status:404});
  const reserved=await service.reserve(f.space,f.admin,input);
  assert.equal((await service.reserve(f.space,f.admin,input)).uploadId,reserved.uploadId);
  await service.receive(f.space,f.admin,reserved.uploadId,Readable.from([png]));
  // Wrong signatures cannot be interpreted as declared safe MIME.
  const badInput={...input,requestId:randomUUID()},bad=await service.reserve(f.space,f.admin,badInput);
  await assert.rejects(service.receive(f.space,f.admin,bad.uploadId,Readable.from([Buffer.alloc(png.length)])),{status:415});
  assert.equal((await f.pool.query('SELECT state FROM shared_media_files WHERE id=$1',[bad.uploadId])).rows[0].state,'failed');
  assert.equal((await service.reserve(f.space,f.admin,badInput)).uploadId,bad.uploadId,'Retry cleaned failed upload with same key');
  const revoke=await service.reserve(f.space,f.editor,{...input,requestId:randomUUID()});
  await f.pool.query('DELETE FROM workspace_members WHERE workspace_id=$1 AND user_id=$2',[f.space,f.editor]);
  await assert.rejects(service.receive(f.space,f.editor,revoke.uploadId,Readable.from([png])),{status:404});
  await f.pool.query("INSERT INTO workspace_members VALUES($1,$2,'editor')",[f.space,f.editor]);
  const during=await service.reserve(f.space,f.editor,{...input,requestId:randomUUID()});
  async function* revokedStream(){yield png.subarray(0,5);await f.pool.query('DELETE FROM workspace_members WHERE workspace_id=$1 AND user_id=$2',[f.space,f.editor]);yield png.subarray(5);}
  await assert.rejects(service.receive(f.space,f.editor,during.uploadId,Readable.from(revokedStream())),{status:404});
  assert.equal((await f.pool.query('SELECT state FROM shared_media_files WHERE id=$1',[during.uploadId])).rows[0].state,'failed');
  // A 2 GB custom plan with 2000 MiB used leaves 48 MiB: one 40 MiB reservation fits, two do not.
  await f.pool.query("UPDATE workspaces SET plan='a-medida',custom_storage_gb=2 WHERE id=$1",[f.space]);
  await f.pool.query("UPDATE shared_media_files SET state='failed'");
  for(let i=0;i<20;i++)await service.reserve(f.space,f.admin,{...input,size:104857600,requestId:randomUUID()});
  const results=await Promise.allSettled([1,2].map(()=>service.reserve(f.space,f.admin,{...input,size:41943040,requestId:randomUUID()})));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.find(r=>r.status==='rejected').reason.status,413);
  console.log('PASS shared uploads: roles, idempotency, signatures, revocation, concurrent quota.');
}finally{await f.close();}
