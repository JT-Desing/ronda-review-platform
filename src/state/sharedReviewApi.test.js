import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewRequest,uploadFile} from './sharedReviewApi.js';
import {beginDemoSession,endDemoSession} from './demoSession.js';
test('company demo cannot read or mutate real shared workspace',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=()=>{throw new Error('Unexpected real account network request');};
  beginDemoSession({projects:{},assets:[]});
  try{
    await assert.rejects(reviewRequest('/api/workspaces/real/projects'),/demo/i);
    await assert.rejects(uploadFile({workspaceId:'real',projectId:'real'},{name:'demo.png',type:'image/png',size:10},'key'),/demo/i);
  }finally{endDemoSession();globalThis.fetch=original;}
});

test('synthetic in-memory File uploads through reserve, transfer and finalization once',async()=>{
 const originalFetch=globalThis.fetch,originalXHR=globalThis.XMLHttpRequest;
 const file=new File([new Uint8Array([137,80,78,71,13,10,26,10])],'qa-memory.png',{type:'image/png'});
 const requests=[],progress=[];let transferred;
 globalThis.fetch=async(path,options={})=>{
  requests.push({path,options});
  const payload=path.endsWith('/uploads')?{uploadId:'upload-qa'}:{asset:{id:'asset-qa'}};
  return new Response(JSON.stringify(payload),{status:200,headers:{'content-type':'application/json'}});
 };
 globalThis.XMLHttpRequest=class{
  constructor(){this.upload={};this.headers={};this.status=200;this.responseText='{}';}
  open(method,path){this.method=method;this.path=path;}
  setRequestHeader(name,value){this.headers[name]=value;}
  send(body){transferred={method:this.method,path:this.path,headers:this.headers,body};this.upload.onprogress?.({lengthComputable:true,loaded:file.size,total:file.size});this.onload?.();this.onloadend?.();}
  abort(){this.onabort?.();this.onloadend?.();}
 };
 try{
  const result=await uploadFile({workspaceId:'space-qa',projectId:'project-qa'},file,'request-qa',value=>progress.push(value));
  assert.deepEqual(requests.map(request=>request.path),[
   '/api/workspaces/space-qa/projects/project-qa/uploads',
   '/api/workspaces/space-qa/uploads/upload-qa/complete',
  ]);
  assert.equal(JSON.parse(requests[0].options.body).requestId,'request-qa');
  assert.deepEqual(transferred,{method:'PUT',path:'/api/workspaces/space-qa/uploads/upload-qa/content',headers:{'Content-Type':'image/png'},body:file});
  assert.deepEqual(progress,[100]);
  assert.deepEqual(result,{asset:{id:'asset-qa'}});
 }finally{globalThis.fetch=originalFetch;globalThis.XMLHttpRequest=originalXHR;}
});

test('cancelling an in-memory file transfer aborts transport and does not finalize',async()=>{
 const originalFetch=globalThis.fetch,originalXHR=globalThis.XMLHttpRequest;
 const file=new File([new Uint8Array([1,2,3])],'qa-cancel.png',{type:'image/png'});let requestCount=0,transport;
 globalThis.fetch=async()=>{requestCount++;return new Response(JSON.stringify({uploadId:'upload-cancel'}),{status:200,headers:{'content-type':'application/json'}});};
 globalThis.XMLHttpRequest=class{
  constructor(){transport=this;this.upload={};}
  open(){} setRequestHeader(){}
  send(){/* keep the synthetic transfer pending until AbortSignal fires */}
  abort(){this.onabort?.();this.onloadend?.();}
 };
 const controller=new AbortController();
 try{
  const pending=uploadFile({workspaceId:'space-qa',projectId:'project-qa'},file,'request-cancel',undefined,controller.signal);
  await new Promise(resolve=>setImmediate(resolve));
  controller.abort();
  await assert.rejects(pending,error=>error.name==='AbortError');
  assert.ok(transport);
  assert.equal(requestCount,1,'reservation may exist but incomplete upload is not finalized');
 }finally{globalThis.fetch=originalFetch;globalThis.XMLHttpRequest=originalXHR;}
});
