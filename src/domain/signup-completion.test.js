import assert from 'node:assert/strict';
import {test} from 'node:test';
import {initializeSignupCompletion,persistPersonalSignupChoice} from './signup-completion.js';
import {hasPersonalWorkspaceChoice,needsWorkspaceChoice} from './onboarding.js';

test('new personal signup persists the choice and skips the duplicate workspace prompt',()=>{
  const values=new Map(),storage={setItem:(key,value)=>values.set(key,value),getItem:key=>values.get(key)};
  assert.equal(persistPersonalSignupChoice('personal',storage),true);
  assert.equal(hasPersonalWorkspaceChoice(storage.getItem('ronda-onboarding:v1')),true);
  assert.equal(needsWorkspaceChoice([],hasPersonalWorkspaceChoice(storage.getItem('ronda-onboarding:v1'))),false);
});

test('team and invitation signup choices are not overwritten with personal preference',()=>{
  for(const choice of ['create','join']){
    let writes=0;
    assert.equal(persistPersonalSignupChoice(choice,{setItem:()=>writes++}),false);
    assert.equal(writes,0);
  }
});

test('personal signup preference is stored and flushed after server data initializes',async()=>{
  const calls=[];
  await initializeSignupCompletion({
    initialize:(account,snapshot)=>calls.push(['initialize',account.id,snapshot.revision]),
    account:{id:'qa-user'},snapshot:{revision:4},choice:'personal',
    storage:{setItem:(key,value)=>calls.push(['store',key,value])},
    flush:async()=>calls.push(['flush']),
  });
  assert.deepEqual(calls,[
    ['initialize','qa-user',4],
    ['store','ronda-onboarding:v1','"personal"'],
    ['flush'],
  ]);
});
