import {test} from 'node:test';
import assert from 'node:assert/strict';
import {jsonRequest} from './jsonRequest.js';
test('a hung request terminates and aborts its transport with a recoverable error',async()=>{
 let signal;
 await assert.rejects(jsonRequest('/qa',{timeoutMs:5},(_path,options)=>{signal=options.signal;return new Promise(()=>{});}),error=>error.code==='request_timeout');
 assert.equal(signal.aborted,true);
});
test('preserves server authorization status and error detail',async()=>{
 await assert.rejects(jsonRequest('/qa',{},async()=>({ok:false,status:403,json:async()=>({error:'Sin acceso'})})),error=>error.status===403&&error.message==='Sin acceso');
});
test('successful requests return JSON; pre-aborted caller never sends',async()=>{
 assert.deepEqual(await jsonRequest('/qa',{},async()=>({ok:true,json:async()=>({ok:true})})),{ok:true});
 const controller=new AbortController();controller.abort();let sent=false;
 await assert.rejects(jsonRequest('/qa',{signal:controller.signal},()=>{sent=true;}),error=>error.name==='AbortError');
 assert.equal(sent,false);
});
