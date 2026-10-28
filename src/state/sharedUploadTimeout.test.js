import {test} from 'node:test';
import assert from 'node:assert/strict';
import {uploadFile} from './sharedReviewApi.js';
test('stalled upload has a finite transport timeout and never starts finalization',async()=>{
 const originalFetch=globalThis.fetch,originalXHR=globalThis.XMLHttpRequest;let requests=0,transport;
 globalThis.fetch=async()=>{requests++;return {ok:true,json:async()=>({uploadId:'upload'})};};
 globalThis.XMLHttpRequest=class {
  constructor(){transport=this;this.upload={};}
  open(){} setRequestHeader(){}
  send(){queueMicrotask(()=>this.ontimeout?.());}
 };
 let timer;
 try{
  await assert.rejects(Promise.race([uploadFile({workspaceId:'w',projectId:'p'},{name:'qa.mp4',type:'video/mp4',size:100},'request'),new Promise((_resolve,reject)=>{timer=setTimeout(()=>reject(new Error('probe upload never terminated')),100);})]),/tiempo de espera/);
  assert.ok(transport.timeout>0&&transport.timeout<=600000);
  assert.equal(requests,1,'timeout must not finalize an incomplete file');
 }finally{clearTimeout(timer);globalThis.fetch=originalFetch;globalThis.XMLHttpRequest=originalXHR;}
});

test('file over 100 MB is rejected with a specific error before reserving an upload',async()=>{
 const originalFetch=globalThis.fetch;let requests=0;globalThis.fetch=async()=>{requests++;throw new Error('must not call API');};
 try{await assert.rejects(uploadFile({workspaceId:'w',projectId:'p'},{name:'large.mp4',type:'video/mp4',size:100*1024*1024+1},'request'),error=>error.status===413&&/máximo 100 MB/.test(error.message));assert.equal(requests,0);}
 finally{globalThis.fetch=originalFetch;}
});
