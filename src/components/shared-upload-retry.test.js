import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {uploadFile} from '../state/sharedReviewApi.js';

test('a retry after a lost upload response reuses its request key and finalizes the same reservation',async()=>{
  const originalFetch=globalThis.fetch,originalXHR=globalThis.XMLHttpRequest;
  const reservations=new Map(),requestIds=[],uploadIds=[];let sends=0,completions=0;
  globalThis.fetch=async(path,options={})=>{
    if(String(path).endsWith('/uploads')){
      const body=JSON.parse(options.body);requestIds.push(body.requestId);
      let uploadId=reservations.get(body.requestId);
      if(!uploadId){uploadId=`upload-${reservations.size+1}`;reservations.set(body.requestId,uploadId);}
      return {ok:true,json:async()=>({uploadId})};
    }
    if(String(path).endsWith('/complete')){completions++;return {ok:true,json:async()=>({asset:{id:'asset-1'}})};}
    throw new Error(`Unexpected request: ${path}`);
  };
  globalThis.XMLHttpRequest=class {
    constructor(){this.upload={};}
    open(_method,path){this.path=path;}
    setRequestHeader(){}
    send(){sends++;uploadIds.push(this.path.split('/')[5]);queueMicrotask(()=>{
      if(sends===1)this.onerror?.();
      else{this.status=200;this.responseText='{}';this.onload?.();}
    });}
  };
  const file={name:'qa.png',type:'image/png',size:4};
  try{
    await assert.rejects(uploadFile({workspaceId:'w',projectId:'p'},file,'same-request'),/interrumpió la conexión/);
    const result=await uploadFile({workspaceId:'w',projectId:'p'},file,'same-request');
    assert.equal(result.asset.id,'asset-1');
    assert.deepEqual(requestIds,['same-request','same-request']);
    assert.equal(reservations.size,1,'retry must not allocate a second reservation');
    assert.deepEqual(uploadIds,['upload-1','upload-1']);
    assert.equal(completions,1,'received bytes are finalized once after retry');
  }finally{globalThis.fetch=originalFetch;globalThis.XMLHttpRequest=originalXHR;}
});

test('shared delivery exposes an explicit retry using the retained file and request id',()=>{
  const media=readFileSync(new URL('./SharedProjectMedia.jsx',import.meta.url),'utf8');
  const grid=readFileSync(new URL('./SharedDeliveryGrid.jsx',import.meta.url),'utf8');
  assert.match(media,/failedUpload=useRef\(null\)/);
  assert.match(media,/failedUpload\.current\?\.file===file\?failedUpload\.current/);
  assert.match(media,/uploadFile\(context,file,attempt\.requestId/);
  assert.match(media,/onRetryUpload=\{\(\)=>\{if\(failedUpload\.current\)add\(failedUpload\.current\.file\);\}\}/);
  assert.match(grid,/canRetryUpload&&<button disabled=\{blocked\} onClick=\{onRetryUpload\}>Reintentar carga<\/button>/);
});
