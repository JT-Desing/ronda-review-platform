import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createApp} from '../app.js';

test('workspace mutation endpoints reject non-object JSON with a recoverable 400', async t => {
  const account={id:'11111111-1111-4111-8111-111111111111',email:'qa@example.invalid',name:'QA'};
  const previousOwner=process.env.RONDA_SUPERADMIN_IDS;
  process.env.RONDA_SUPERADMIN_IDS=account.id;
  t.after(()=>{if(previousOwner===undefined)delete process.env.RONDA_SUPERADMIN_IDS;else process.env.RONDA_SUPERADMIN_IDS=previousOwner;});
  let queries=0;
  const pool={async query(){queries++;return {rows:[account]};}};
  const origin='http://qa.invalid';
  const server=http.createServer(createApp({pool,origin}));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}`;
  const workspace='/api/workspaces/22222222-2222-4222-8222-222222222222';
  const routes=[
    ['POST','/api/workspaces'],
    ['POST',workspace+'/invitations'],
    ['POST','/api/workspace-invitations/accept'],
    ['PATCH',workspace+'/invitations/33333333-3333-4333-8333-333333333333'],
    ['PATCH',workspace+'/members/44444444-4444-4444-8444-444444444444'],
  ];
  for(const [method,path] of routes)for(const body of ['null','[]','false']){
    const response=await fetch(base+path,{method,headers:{Origin:origin,Cookie:'ronda_session=qa','Content-Type':'application/json'},body});
    assert.equal(response.status,400,`${method} ${path} with ${body}`);
    assert.deepEqual(await response.json(),{error:'El cuerpo debe ser un objeto JSON.'});
  }
  const malformed=await fetch(base+workspace+'/invitations',{method:'POST',headers:{Origin:origin,Cookie:'ronda_session=qa','Content-Type':'application/json'},body:'{'});
  assert.equal(malformed.status,400);
  assert.deepEqual(await malformed.json(),{error:'JSON inválido.'});
  assert.equal(queries,routes.length*3+1,'invalid requests only query the session; no workspace or invitation operation reaches the database');
});
