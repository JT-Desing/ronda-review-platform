import test from 'node:test';
import assert from 'node:assert/strict';
const local = new Map();
globalThis.localStorage = { getItem:key=>local.get(key)??null,setItem:(key,value)=>local.set(key,value) };
globalThis.window = { addEventListener(){},dispatchEvent(){} };
globalThis.CustomEvent = class { constructor(type,options){this.type=type;this.detail=options.detail;} };
const {initializeAccount,accountStorage,flushAccount,pendingAccountCopy,recoverCopy} = await import('./accountStorage.js');
test('account storage serializes saves and isolates pending backups', async()=>{
  const requests=[];
  globalThis.fetch=async(path,options)=>{requests.push(JSON.parse(options.body));return {ok:true,json:async()=>({revision:requests.length})};};
  initializeAccount({id:'qa-a'},{data:{},revision:0});
  accountStorage.setItem('ronda-pauta:v1','{"groups":[]}');
  await flushAccount();
  assert.equal(requests[0].revision,0);
  assert.equal(pendingAccountCopy(),null);
  initializeAccount({id:'qa-b'},{data:{},revision:0});
  assert.equal(accountStorage.getItem('ronda-pauta:v1'),null);
});
test('a conflict preserves local data and refuses stale recovery',async()=>{
  initializeAccount({id:'qa-conflict'},{data:{},revision:4});
  globalThis.fetch=async()=>({ok:false,json:async()=>({error:'Conflict'})});
  accountStorage.setItem('ronda-pauta:v1','{"groups":[]}');
  await assert.rejects(flushAccount(),/Conflict/);
  assert.equal(pendingAccountCopy().dirty,true);
  assert.throws(()=>recoverCopy({revision:3,data:{}}),/otra revisión/);
});
test('local storage quota does not prevent a server save',async()=>{
  initializeAccount({id:'qa-quota'},{data:{},revision:0});
  const original=globalThis.localStorage;
  globalThis.localStorage={...original,setItem(){throw new Error('Quota');}};
  globalThis.fetch=async()=>({ok:true,json:async()=>({revision:1})});
  accountStorage.setItem('ronda-pauta:v1','{"groups":[]}');
  await flushAccount();
  assert.equal(accountStorage.getItem('ronda-pauta:v1'),'{"groups":[]}');
  globalThis.localStorage=original;
});
