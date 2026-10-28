import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {handleQaMailboxRequest} from './qa-mailbox.js';

test('QA mailbox requires a signed-in owner and shows only that recipient messages',async t=>{
  const entries=[{to:'qa@example.invalid',subject:'Invite & review',text:'<script>alert(1)</script> "private"'},{to:'other@example.invalid',subject:'Other invite',text:'other-private-code'}];
  let read=false;
  const server=http.createServer((req,res)=>handleQaMailboxRequest(req,res,async()=>{read=true;return entries;},async request=>request.headers.cookie==='qa-session=owner'?'qa@example.invalid':null));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}/qa/mailbox`;
  const anonymous=await fetch(base);
  assert.equal(anonymous.status,401);
  assert.equal(read,false,'do not read captures before session authorization');
  const response=await fetch(base,{headers:{Cookie:'qa-session=owner'}});
  const body=await response.text();
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(response.headers.get('x-frame-options'),'DENY');
  assert.equal(response.headers.get('x-content-type-options'),'nosniff');
  assert.equal(response.headers.get('referrer-policy'),'no-referrer');
  assert.match(response.headers.get('content-security-policy'),/default-src 'none'/);
  assert.doesNotMatch(body,/<script>/);
  assert.match(body,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(body,/qa@example\.invalid/);
  assert.doesNotMatch(body,/other@example\.invalid|other-private-code/);
});

test('QA mailbox HTTP rejects non-GET without reading or returning captures',async t=>{
  let read=false;
  const server=http.createServer((req,res)=>handleQaMailboxRequest(req,res,async()=>{read=true;return[{to:'qa@example.invalid',subject:'secret',text:'private-code'}]},async()=>"qa@example.invalid"));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const response=await fetch(`http://127.0.0.1:${server.address().port}/qa/mailbox`,{method:'POST'});
  assert.equal(response.status,405);
  assert.equal(response.headers.get('allow'),'GET');
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(await response.text(),'');
  assert.equal(read,false);
});
