import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {shutdownQaUi} from './qa-ui-shutdown.js';

test('QA UI shutdown closes its listener and awaits temporary fixture cleanup',async()=>{
  const server=http.createServer((_req,res)=>res.end('ok'));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let closed=false;
  const result=await shutdownQaUi({server,closeFixture:async()=>{closed=true;}});
  assert.equal(result,true);
  assert.equal(closed,true);
  assert.equal(server.listening,false);
});

test('QA UI shutdown has a bounded wait if fixture cleanup stalls',async()=>{
  const server=http.createServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const start=Date.now();
  const result=await shutdownQaUi({server,closeFixture:()=>new Promise(()=>{}),timeoutMs:15});
  assert.equal(result,false);
  assert.ok(Date.now()-start<500,'a stalled QA cleanup cannot hang the supervisor indefinitely');
});
