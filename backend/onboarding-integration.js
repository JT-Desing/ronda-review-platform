import assert from 'node:assert/strict';
import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {reviewFixture} from './shared-review-qa-fixture.js';
import {createApp} from './app.js';
const f=await reviewFixture();let server;
try{
 const origin='http://onboarding-qa.invalid';
 const captured=[];const mailer={enabled:true,async send(message){captured.push(message);return {accepted:[message.to]};}};
 server=http.createServer(createApp({pool:f.pool,origin,mailer}));await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const send=(path,body,cookie)=>fetch(base+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
 const email=`owner-${randomUUID()}@example.invalid`,password='Ronda-QA-only-2026!';
 assert.equal((await send('/api/auth/register',{name:'Ana QA',email,password:'short'})).status,400);
 const registered=await send('/api/auth/register',{name:'Ana QA',email,password});assert.equal(registered.status,200);const owner=(await registered.json()).user,cookie=registered.headers.get('set-cookie').split(';')[0];
 assert.equal((await send('/api/auth/register',{name:'Duplicate',email,password})).status,409);
 const personal=await (await fetch(base+'/api/workspaces',{headers:{Cookie:cookie}})).json();assert.equal(personal.workspaces.length,1);assert.equal(personal.workspaces[0].kind,'personal');
 const accountSnapshot=await(await fetch(base+'/api/data',{headers:{Cookie:cookie}})).json();
 const personalChoice=await fetch(base+'/api/data',{method:'PUT',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({revision:accountSnapshot.revision,data:{'ronda-onboarding:v1':JSON.stringify('personal')}})});
 assert.equal(personalChoice.status,200,'the personal-only onboarding choice must persist');
 assert.equal((await(await fetch(base+'/api/data',{headers:{Cookie:cookie}})).json()).data['ronda-onboarding:v1'],JSON.stringify('personal'));
 assert.equal((await send('/api/workspaces',{name:'Una empresa',requestId:randomUUID()})).status,401);
 const key=randomUUID();const created=await send('/api/workspaces',{name:'  Estudio Aurora QA  ',requestId:key},cookie);assert.equal(created.status,201,'a new account must create its own team without an operator');const first=await created.json();
 assert.equal(first.workspace.name,'Estudio Aurora QA');assert.equal(first.workspace.kind,'team');assert.equal(first.workspace.role,'admin');
 assert.equal((await send('/api/workspaces',{name:' ',requestId:randomUUID()},cookie)).status,400);
 const retry=await send('/api/workspaces',{name:'Estudio Aurora QA',requestId:key},cookie);assert.equal(retry.status,201);assert.equal((await retry.json()).workspace.id,first.workspace.id);
 const listing=await (await fetch(base+'/api/workspaces',{headers:{Cookie:cookie}})).json();assert.equal(listing.workspaces.length,2);
 assert.equal((await f.pool.query('SELECT role FROM workspace_members WHERE workspace_id=$1 AND user_id=$2',[first.workspace.id,owner.id])).rows[0].role,'admin');
 const workspace=first.workspace.id,teamPath=`/api/workspaces/${workspace}`,people=[];
 for(const [index,name] of ['Eva Editora','Mario Editor','Lucía Revisora','Diego Revisor','Persona externa'].entries()){
  const email=`person-${index}-${randomUUID()}@example.invalid`,r=await send('/api/auth/register',{name,email,password});assert.equal(r.status,200);people.push({email,user:(await r.json()).user,cookie:r.headers.get('set-cookie').split(';')[0]});
 }
 for(const [index,person] of people.slice(0,4).entries()){
  const role=index<2?'editor':'reviewer',r=await send(teamPath+'/invitations',{email:person.email,role},cookie);assert.equal(r.status,201);const invitation=await r.json();
  assert.equal(invitation.emailDelivery.status,'accepted');assert.equal(captured.at(-1).to,person.email);assert.ok(captured.at(-1).text.includes(invitation.token));assert.ok(captured.at(-1).text.includes(origin));
  assert.equal((await send(teamPath+'/invitations',{email:person.email,role},cookie)).status,409);
  assert.equal((await send('/api/workspace-invitations/accept',{token:invitation.token},people[4].cookie)).status,403);
  assert.equal((await send('/api/workspace-invitations/accept',{token:'A'.repeat(43)},person.cookie)).status,404,'an invalid token must fail without consuming the signed-in invitee session');
  const sessionAfterInvalidToken=await(await fetch(base+'/api/auth/session',{headers:{Cookie:person.cookie}})).json();assert.equal(sessionAfterInvalidToken.user.id,person.user.id,'the invitee stays signed in and can correct the invitation code');
  assert.equal((await send('/api/workspace-invitations/accept',{token:invitation.token},person.cookie)).status,200);
  assert.equal((await send('/api/workspace-invitations/accept',{token:invitation.token},person.cookie)).status,404);
 }
 const team=await (await fetch(base+teamPath,{headers:{Cookie:cookie}})).json();assert.equal(team.members.length,5);assert.equal(team.invitations.length,0);
 assert.equal((await fetch(base+teamPath,{headers:{Cookie:people[4].cookie}})).status,404);
 assert.equal((await send(teamPath+'/invitations',{email:'forbidden@example.invalid',role:'admin'},people[2].cookie)).status,403);
 const projects=[];for(let index=0;index<3;index++){const r=await send(teamPath+'/projects',{name:`Proyecto de empresa ${index+1}`,client:'Aurora',requestId:randomUUID()},index===1?people[0].cookie:cookie);assert.equal(r.status,201);projects.push((await r.json()).project);}
 const teamProjects=await (await fetch(base+teamPath+'/projects',{headers:{Cookie:people[2].cookie}})).json();assert.equal(teamProjects.projects.length,3);
 assert.equal((await send(teamPath+'/projects',{name:'No autorizado',requestId:randomUUID()},people[2].cookie)).status,403);
 const memberPath=teamPath+'/members/'+owner.id;
 assert.equal((await fetch(base+memberPath,{method:'DELETE',headers:{Origin:origin,Cookie:cookie}})).status,409);
 const expired=await (await send(teamPath+'/invitations',{email:people[4].email,role:'reviewer'},cookie)).json();await f.pool.query("UPDATE workspace_invitations SET expires_at=now()-interval '1 minute' WHERE id=$1",[expired.invitation.id]);
 assert.equal((await send('/api/workspace-invitations/accept',{token:expired.token},people[4].cookie)).status,404);
 assert.equal(captured.length,5);
 console.log('PASS five-person company: four captured invitations, roles, wrong/used/expired tokens, outsider boundaries, three shared projects, last-admin protection.');
 console.log('PASS onboarding HTTP: registration, duplicate/invalid inputs, personal isolation, self-service team, admin assignment and idempotent retry.');
}finally{if(server)await new Promise(r=>server.close(r));await f.close();}
