import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validateQaDatabaseTarget} from './qa-db-target.js';

const containerName='ronda-review-qa-0123456789abcdef0123456789abcdef';
const database='ronda_qa_0123456789abcdef0123456789abcdef';
const target=`postgresql://postgres:synthetic@127.0.0.1:62523/${database}`;
const inspect=()=>({State:{Running:true},Config:{Labels:{'ronda.qa':'shared-review'},Env:[`POSTGRES_DB=${database}`]},NetworkSettings:{Ports:{'5432/tcp':[{HostIp:'127.0.0.1',HostPort:'62523'}]}}});

test('only accepts an active QA-labeled container and its exact loopback database mapping',()=>{
  const parsed=validateQaDatabaseTarget(target,containerName,inspect);
  assert.equal(parsed.hostname,'127.0.0.1');
  assert.equal(parsed.pathname.slice(1),database);
});

test('rejects remote hosts, ordinary database names, default port and absent container before inspection',()=>{
  let inspected=false;
  const guarded=()=>{inspected=true;return inspect();};
  for(const url of [
    target.replace('127.0.0.1','db.example.com'),
    target.replace(database,'ronda_qa_shared'),
    target.replace(':62523',':5432'),
  ])assert.throws(()=>validateQaDatabaseTarget(url,containerName,guarded),/Dedicated local QA database required/);
  assert.throws(()=>validateQaDatabaseTarget(target,'',guarded),/Dedicated local QA database required/);
  assert.equal(inspected,false);
});

test('rejects an unlabelled, stopped or mismapped local container',()=>{
  assert.throws(()=>validateQaDatabaseTarget(target,containerName,()=>({...inspect(),Config:{...inspect().Config,Labels:{}}})),/Dedicated labeled/);
  assert.throws(()=>validateQaDatabaseTarget(target,containerName,()=>({...inspect(),State:{Running:false}})),/Dedicated labeled/);
  assert.throws(()=>validateQaDatabaseTarget(target,containerName,()=>({...inspect(),NetworkSettings:{Ports:{'5432/tcp':[{HostIp:'127.0.0.1',HostPort:'9999'}]}}})),/does not match/);
});
