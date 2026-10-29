import assert from 'node:assert/strict';
import {test} from 'node:test';
import {applySignupWorkspace,completeSignup,isValidTeamName,normalizeTeamName,recoverCreatedSignup,showWorkspaceOnboarding} from './signup-flow.js';
const validInvite='a'.repeat(43);

test('team names reject whitespace-only values and normalize surrounding spaces',()=>{
  for(const name of ['', '   ', '\t\n'])assert.equal(isValidTeamName(name),false);
  assert.equal(isValidTeamName(' Equipo QA '),true);
  assert.equal(normalizeTeamName(' Equipo QA '),'Equipo QA');
  assert.equal(isValidTeamName('a'.repeat(80)),true);
  assert.equal(isValidTeamName('a'.repeat(81)),false);
});

test('invalid company name is rejected before registration creates an account',async()=>{
  let calls=0;
  await assert.rejects(completeSignup({api:async()=>{calls++;return {user:{id:'should-not-exist'}};},credentials:{email:'qa@example.invalid'},setup:{choice:'create',name:'   ',requestId:'qa-request'},enter:async()=>{}}),/nombre válido/);
  assert.equal(calls,0,'invalid team name must be caught before the registration request');
});

test('incomplete or malformed invitation code is rejected before registration creates an account',async()=>{
  for(const code of ['', 'short', 'a'.repeat(42), `${validInvite}!`]){
    const calls=[];
    await assert.rejects(completeSignup({api:async path=>{calls.push(path);return {user:{id:'should-not-exist'}};},credentials:{email:'qa@example.invalid'},setup:{choice:'join',code,requestId:'qa-invite'},enter:async()=>{}}),/código de invitación completo/);
    assert.deepEqual(calls,[],`invalid code ${JSON.stringify(code)} must be rejected before any API request`);
  }
});

test('team creation API receives the trimmed name',async()=>{
  let body;
  const result=await applySignupWorkspace({api:async(_path,options)=>{body=JSON.parse(options.body);return {workspace:{id:'team-qa'}};},setup:{choice:'create',name:' Equipo QA ',requestId:'qa-request'}});
  assert.deepEqual(result,{workspaceId:'team-qa',onboardingDraft:null});
  assert.deepEqual(body,{name:'Equipo QA',requestId:'qa-request',plan:'estudio'});
});

test('invalid team name never calls workspace creation from resumed onboarding',async()=>{
  let calls=0;
  const setup={choice:'create',name:'   ',requestId:'qa-request'};
  const result=await applySignupWorkspace({api:async()=>{calls++;throw new Error('must not call API');},setup});
  assert.equal(calls,0);
  assert.equal(result.workspaceId,null);
  assert.equal(result.onboardingDraft.error,'Escribe un nombre válido para tu empresa o equipo.');
});

test('personal signup does not issue workspace mutations before the account snapshot is initialized',async()=>{
  const result=await applySignupWorkspace({api:async()=>{throw new Error('unexpected API');},setup:{choice:'personal'}});
  assert.deepEqual(result,{workspaceId:null,onboardingDraft:null});
});

test('new account can accept a valid invitation and receives its team destination',async()=>{
  const requests=[];const result=await applySignupWorkspace({api:async(path,options)=>{requests.push([path,JSON.parse(options.body)]);return {workspace:{id:'team-qa'}};},setup:{choice:'join',code:` ${validInvite} `,name:'ignored',requestId:'request-qa'}});
  assert.deepEqual(result,{workspaceId:'team-qa',onboardingDraft:null});
  assert.deepEqual(requests,[['/api/workspace-invitations/accept',{token:validInvite}]]);
});

test('invalid invitation code is retained for correction without calling acceptance from resumed onboarding',async()=>{
  let calls=0;
  const setup={choice:'join',code:'short',requestId:'invite-key'};
  const result=await applySignupWorkspace({api:async()=>{calls++;throw new Error('must not call API');},setup});
  assert.equal(calls,0);
  assert.equal(result.workspaceId,null);
  assert.deepEqual(result.onboardingDraft,{...setup,error:'Pega el código de invitación completo para continuar.'});
});

test('new team creation retains its stable request ID if the endpoint fails',async()=>{
  const setup={choice:'create',name:'Equipo QA',code:'',requestId:'same-request'};let request;
  const result=await applySignupWorkspace({api:async(path,options)=>{request=[path,JSON.parse(options.body)];throw Object.assign(new Error('DB offline'),{status:503});},setup});
  assert.deepEqual(request,['/api/workspaces',{name:'Equipo QA',requestId:'same-request',plan:'estudio'}]);
  assert.deepEqual(result,{workspaceId:null,onboardingDraft:{...setup,error:'DB offline'}});
});

test('invitation rejection preserves the code and message for recovery',async()=>{
  const setup={choice:'join',name:'',code:'b'.repeat(43),requestId:'invite-key'};
  const result=await applySignupWorkspace({api:async()=>{throw new Error('El código no coincide con el correo.');},setup});
  assert.deepEqual(result,{workspaceId:null,onboardingDraft:{...setup,error:'El código no coincide con el correo.'}});
});

test('a workspace setup failure keeps the newly created identity in session and resumes onboarding inline',async()=>{
  const account={id:'qa-new-user'};let options;
  const result=await recoverCreatedSignup({account,onboardingRecovery:true,enter:async(user,settings)=>{assert.equal(user,account);options=settings;}});
  assert.deepEqual(result,{status:'onboarding'});
  assert.deepEqual(options,{onboardingRecovery:true,signupChoice:''});
});

test('if workspace creation already succeeded, session recovery derives the destination instead of repeating onboarding',async()=>{
  let options;
  const result=await recoverCreatedSignup({account:{id:'qa-new-user'},signupChoice:'create',enter:async(_user,settings)=>{options=settings;}});
  assert.deepEqual(result,{status:'onboarding'});
  assert.deepEqual(options,{onboardingRecovery:false,signupChoice:'create'});
});

test('if the new identity session cannot be recovered, signup offers retry without repeating registration',async()=>{
  const failure=new Error('session unavailable');
  const result=await recoverCreatedSignup({account:{id:'qa-new-user'},enter:async()=>{throw failure;}});
  assert.deepEqual(result,{status:'retry',error:failure});
});

test('transient team-list failure retries session recovery without repeating team creation',async()=>{
  const calls={teamMutations:0,workspaceReads:0};
  const setup={choice:'create',name:'Equipo QA recuperación',requestId:'stable-request'};
  const created=await applySignupWorkspace({api:async(path)=>{if(path==='/api/workspaces')calls.teamMutations++;return {workspaceId:'team-qa-recovered'};},setup});
  const enter=async()=>{calls.workspaceReads++;if(calls.workspaceReads===1)throw new Error('lectura temporal 503');};
  const recovery=await recoverCreatedSignup({account:{id:'qa-new-user'},signupChoice:'create',enter});
  assert.deepEqual(created,{workspaceId:'team-qa-recovered',onboardingDraft:null});
  assert.deepEqual(recovery,{status:'retry',error:new Error('lectura temporal 503')});
  await enter();
  assert.equal(calls.teamMutations,1,'reloading memberships must not repeat the team-creation POST');
  assert.equal(calls.workspaceReads,2,'retry performs another session/workspace read');
});

test('transient membership read after accepting an invitation never consumes the invitation twice',async()=>{
  const calls={acceptances:0,workspaceReads:0};
  const setup={choice:'join',code:validInvite,requestId:'stable-invite-request'};
  const accepted=await applySignupWorkspace({api:async(path,options)=>{assert.equal(path,'/api/workspace-invitations/accept');assert.deepEqual(JSON.parse(options.body),{token:validInvite});calls.acceptances++;return {workspaceId:'team-qa-invited'};},setup});
  const enter=async()=>{calls.workspaceReads++;if(calls.workspaceReads===1)throw new Error('membership read temporarily unavailable');};
  const recovered=await recoverCreatedSignup({account:{id:'qa-invitee'},signupChoice:'join',enter});
  await enter();
  assert.equal(accepted.workspaceId,'team-qa-invited');
  assert.equal(recovered.status,'retry');
  assert.equal(calls.acceptances,1,'retrying account/workspace loading must not consume the invitation again');
  assert.equal(calls.workspaceReads,2);
});

test('complete team signup recovers a transient membership-list failure without repeating registration or creation',async()=>{
  const calls={register:0,create:0,workspaceReads:0},account={id:'qa-created-team'};
  const completion=await completeSignup({credentials:{email:'team@example.invalid'},setup:{choice:'create',name:'Equipo QA',requestId:'stable-team-request'},api:async(path)=>{
    if(path==='/api/auth/register'){calls.register++;return {user:account};}
    if(path==='/api/workspaces'){calls.create++;return {workspaceId:'team-created-once'};}
    throw new Error(`unexpected ${path}`);
  },enter:async(user,options)=>{
    assert.equal(user,account);assert.deepEqual(options,{onboardingRecovery:false,signupChoice:'create'});
    calls.workspaceReads++;if(calls.workspaceReads===1)throw new Error('membership list temporarily unavailable');
  }});
  assert.equal(completion.status,'ready');assert.equal(completion.workspaceId,'team-created-once');
  assert.deepEqual(calls,{register:1,create:1,workspaceReads:2});
});

test('complete invitation signup retries a transient membership-list failure without losing identity or reusing invite code',async()=>{
  const calls={register:0,accept:0,workspaceReads:0},account={id:'qa-invited-user'};
  const completion=await completeSignup({credentials:{email:'invitee@example.invalid'},setup:{choice:'join',code:validInvite,requestId:'unused-for-invite'},api:async(path,options)=>{
    if(path==='/api/auth/register'){calls.register++;return {user:account};}
    if(path==='/api/workspace-invitations/accept'){calls.accept++;assert.deepEqual(JSON.parse(options.body),{token:validInvite});return {workspaceId:'team-invited-once'};}
    throw new Error(`unexpected ${path}`);
  },enter:async(user,options)=>{
    assert.equal(user,account);assert.deepEqual(options,{onboardingRecovery:false,signupChoice:'join'});
    calls.workspaceReads++;if(calls.workspaceReads===1)throw new Error('membership list temporarily unavailable');
  }});
  assert.equal(completion.status,'ready');assert.equal(completion.workspaceId,'team-invited-once');
  assert.deepEqual(calls,{register:1,accept:1,workspaceReads:2});
});

test('persistent team membership-read failure preserves the signed-in account and exposes retry state without a false login',async()=>{
  const calls={register:0,create:0,workspaceReads:0},account={id:'qa-persistent-read-failure'};let outage=true;
  const setup={choice:'create',name:'Equipo QA',requestId:'stable-persistent-request'};
  const api=async(path)=>{
    if(path==='/api/auth/register'){calls.register++;return {user:account};}
    if(path==='/api/workspaces'){calls.create++;return {workspaceId:'team-persisted'};}
    throw new Error(`unexpected ${path}`);
  };
  const enter=async(user,options)=>{assert.equal(user,account);assert.deepEqual(options,{onboardingRecovery:false,signupChoice:'create'});calls.workspaceReads++;if(outage)throw new Error('workspace membership read unavailable');};
  const completion=await completeSignup({credentials:{email:'persistent@example.invalid'},setup,api,enter});
  assert.equal(completion.status,'retry');assert.equal(completion.account,account);
  assert.match(completion.error.message,/membership read unavailable/);
  assert.deepEqual(calls,{register:1,create:1,workspaceReads:2});
  outage=false;
  const recovered=await recoverCreatedSignup({enter,account:completion.account,...completion.recoveryOptions});
  assert.equal(recovered.status,'onboarding');
  assert.deepEqual(calls,{register:1,create:1,workspaceReads:3},'the recovery action retries reads only; it does not repeat registration or mutation');
});

test('persistent invite membership-read failure retains account and invite setup; only explicit recovery retries reads',async()=>{
  const calls={register:0,accept:0,workspaceReads:0},account={id:'qa-persistent-invite-read-failure'};
  const setup={choice:'join',code:validInvite,requestId:'unused'};
  const completion=await completeSignup({credentials:{email:'invitee@example.invalid'},setup,api:async(path,options)=>{
    if(path==='/api/auth/register'){calls.register++;return {user:account};}
    if(path==='/api/workspace-invitations/accept'){calls.accept++;assert.deepEqual(JSON.parse(options.body),{token:setup.code});return {workspaceId:'team-accepted'};}
    throw new Error(`unexpected ${path}`);
  },enter:async(user)=>{assert.equal(user,account);calls.workspaceReads++;throw new Error('workspace membership read unavailable');}});
  assert.equal(completion.status,'retry');assert.equal(completion.account,account);
  assert.deepEqual(completion.recoveryOptions,{onboardingRecovery:false,signupChoice:'join'});
  assert.equal(completion.onboardingDraft,null,'a successfully accepted invite must not be accepted again or retain a stale code form');
  assert.deepEqual(calls,{register:1,accept:1,workspaceReads:2});
});

test('rejected invitation code remains editable through persistent post-signup membership-read failure',async()=>{
  const account={id:'qa-invite-code-recovery'},setup={choice:'join',code:'b'.repeat(43),requestId:'unused'};
  const calls={register:0,accept:0,workspaceReads:0};
  const completion=await completeSignup({credentials:{email:'invitee@example.invalid'},setup,api:async(path)=>{
    if(path==='/api/auth/register'){calls.register++;return {user:account};}
    if(path==='/api/workspace-invitations/accept'){calls.accept++;throw new Error('Código de invitación inválido.');}
    throw new Error(`unexpected ${path}`);
  },enter:async(user,options)=>{
    assert.equal(user,account);calls.workspaceReads++;
    assert.deepEqual(options,{onboardingRecovery:true,signupChoice:''});
    throw new Error('workspace membership read unavailable');
  }});
  assert.equal(completion.status,'retry');assert.equal(completion.account,account);
  assert.deepEqual(completion.onboardingDraft,{...setup,error:'Código de invitación inválido.'});
  assert.deepEqual(completion.recoveryOptions,{onboardingRecovery:true,signupChoice:''});
  assert.deepEqual(calls,{register:1,accept:1,workspaceReads:2});
});

test('workspace setup recovery remains visible when a lost response already created a membership',()=>{
  const existingTeam=[{id:'team-created-before-response-loss',kind:'team'}];
  assert.equal(showWorkspaceOnboarding(existingTeam,false,true),true);
  assert.equal(showWorkspaceOnboarding(existingTeam,false,false),false);
});
