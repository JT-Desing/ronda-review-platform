import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Readable} from 'node:stream';
import {randomUUID} from 'node:crypto';
let module={};try{module=await import('./local.js');}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
test('local storage limits bytes, rejects traversal and reads exact range',async()=>{
  assert.equal(typeof module.localStorage,'function');
  const root=await mkdtemp(join(tmpdir(),'ronda-review-qa-'));
  try{
    const storage=module.localStorage(root),workspaceId=randomUUID(),uploadId=randomUUID();
    const result=await storage.stage({workspaceId,uploadId,stream:Readable.from([Buffer.from('abcdef')]),maxBytes:6});
    assert.equal(result.size,6);
    await storage.finalize({temporaryKey:result.key,key:`${workspaceId}/${uploadId}`});
    const data=[];for await(const chunk of storage.open({key:`${workspaceId}/${uploadId}`,start:1,end:3}))data.push(chunk);
    assert.equal(Buffer.concat(data).toString(),'bcd');
    assert.throws(()=>storage.open({key:'../../.env'}));
    await assert.rejects(storage.stage({workspaceId,uploadId:randomUUID(),stream:Readable.from([Buffer.alloc(7)]),maxBytes:6}),{status:413});
    await assert.rejects(storage.discardTemporary({key:`${workspaceId}/${uploadId}`}));
  }finally{await rm(root,{recursive:true});}
});
