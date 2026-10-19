import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PassThrough} from 'node:stream';
import {createQaFaults,handleQaControlRequest,qaFaultPage} from './qa-faults.js';
test('sustained QA upload outage survives browser retries until explicitly restored',()=>{
 const faults=createQaFaults();faults.set('disconnect_uploads');
 for(let attempt=0;attempt<5;attempt++)assert.deepEqual(faults.before({method:'PUT',path:'/api/uploads/id/content'}),{disconnect:true});
 assert.deepEqual(faults.before({method:'GET',path:'/api/workspaces'}),{});
 faults.set('normal');assert.deepEqual(faults.before({method:'PUT',path:'/api/uploads/id/content'}),{});
});
test('QA faults are per identity, bounded, allowlisted and reset after one matching request',()=>{
 const first=createQaFaults(),second=createQaFaults();
 first.set('slow');assert.deepEqual(first.before({method:'GET',path:'/api/workspaces'}),{delayMs:2000});assert.equal(second.mode,'normal');
 first.set('error_next_review');assert.deepEqual(first.before({method:'GET',path:'/api/workspaces'}),{});
 assert.equal(first.before({method:'GET',path:'/api/project/versions'}).status,503);assert.equal(first.mode,'normal');
 first.set('error_next_workspaces');assert.deepEqual(first.before({method:'POST',path:'/api/workspaces'}),{});
 assert.deepEqual(first.before({method:'GET',path:'/api/workspaces/active'}),{});
 assert.equal(first.before({method:'GET',path:'/api/workspaces'}).status,503);assert.equal(first.mode,'normal');
 first.set('error_next_workspace_create');assert.deepEqual(first.before({method:'GET',path:'/api/workspaces'}),{});
 assert.deepEqual(first.before({method:'POST',path:'/api/workspaces/active'}),{});
 const createFailure=first.before({method:'POST',path:'/api/workspaces'});assert.equal(createFailure.status,503);assert.match(createFailure.error,/crear el equipo/);assert.equal(first.mode,'normal');
 first.set('error_next_invitation_accept');assert.deepEqual(first.before({method:'GET',path:'/api/workspaces'}),{});
 assert.deepEqual(first.before({method:'POST',path:'/api/workspace-invitations'}),{});
 const inviteFailure=first.before({method:'POST',path:'/api/workspace-invitations/accept'});assert.equal(inviteFailure.status,503);assert.match(inviteFailure.error,/aceptar la invitación/);assert.equal(first.mode,'normal');
 assert.deepEqual(first.before({method:'POST',path:'/api/workspace-invitations/accept'}),{});
 first.set('disconnect_next_upload');assert.deepEqual(first.before({method:'POST',path:'/api/uploads'}),{});
 assert.equal(first.before({method:'PUT',path:'/api/uploads/id/content'}).disconnect,true);assert.equal(first.mode,'normal');
 assert.throws(()=>first.set('disable_auth'));
 assert.match(qaFaultPage('normal'),/No cambia producción/);
});
test('QA fault controls use post/redirect/get so refreshing the page never re-arms a fault',async()=>{
 const faults=createQaFaults(),origin='http://127.0.0.20:24210';
 const req=new PassThrough();req.method='POST';req.headers={origin};
 const response={writeHead(status,headers={}){this.status=status;this.headers=headers;},end(body=''){this.body=body;}};
 const handled=handleQaControlRequest(req,response,{origin,faults});req.end('mode=error_next_workspaces');await handled;
 assert.equal(faults.mode,'error_next_workspaces');
 assert.equal(response.status,303);assert.equal(response.headers.Location,'/qa/control');assert.equal(response.headers['Cache-Control'],'no-store');
 const injected=faults.before({method:'GET',path:'/api/workspaces'});assert.equal(injected.status,503);assert.equal(faults.mode,'normal');
 const getReq={method:'GET'};const getResponse={writeHead(status,headers){this.status=status;this.headers=headers;},end(body){this.body=body;}};
 await handleQaControlRequest(getReq,getResponse,{origin,faults});
 assert.equal(getResponse.status,200);assert.match(getResponse.body,/Modo actual: Normal/);
 const secondReq=new PassThrough();secondReq.method='POST';secondReq.headers={origin};
 const secondResponse={writeHead(status,headers={}){this.status=status;this.headers=headers;},end(body=''){this.body=body;}};
 const secondHandled=handleQaControlRequest(secondReq,secondResponse,{origin,faults});secondReq.end('mode=error_next_workspace_create');await secondHandled;
 assert.equal(faults.mode,'error_next_workspace_create');
 const pageResponse={writeHead(status,headers){this.status=status;this.headers=headers;},end(body){this.body=body;}};
 await handleQaControlRequest(getReq,pageResponse,{origin,faults});assert.match(pageResponse.body,/Error 503 en la próxima creación de equipo/);
});
test('QA fault control rejects cross-origin and invalid/oversized requests',async()=>{
 const faults=createQaFaults(),origin='http://127.0.0.20:24210';
 async function post(body,requestOrigin=origin){
  const req=new PassThrough();req.method='POST';req.headers={origin:requestOrigin};
  const response={writeHead(status){this.status=status;},end(body=''){this.body=body;}};
  const handled=handleQaControlRequest(req,response,{origin,faults});req.end(body);await handled;return response;
 }
 assert.equal((await post('mode=normal','http://example.com')).status,403);
 assert.equal((await post('mode=unknown')).status,400);
 assert.equal((await post('x'.repeat(1025))).status,413);
 const methodResponse={writeHead(status){this.status=status;},end(){}};
 await handleQaControlRequest({method:'DELETE'},methodResponse,{origin,faults});assert.equal(methodResponse.status,405);
 assert.equal(faults.mode,'normal');
});
