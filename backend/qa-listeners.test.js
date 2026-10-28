import assert from 'node:assert/strict';
import {test} from 'node:test';
import {qaListeners} from './qa-listeners.js';

test('QA listener defaults preserve its existing nine loopback origins',()=>{
  const listeners=qaListeners();
  assert.equal(listeners.length,9);
  assert.deepEqual(listeners[0],{host:'127.0.0.2',port:24101});
  assert.deepEqual(listeners[8],{host:'127.0.0.10',port:24109});
});

test('QA can use separate loopback addresses and port range without touching the existing session',()=>{
  const listeners=qaListeners({hosts:Array.from({length:9},(_,i)=>`127.0.0.${20+i}`),basePort:24201});
  assert.deepEqual(listeners[0],{host:'127.0.0.20',port:24201});
  assert.deepEqual(listeners[8],{host:'127.0.0.28',port:24209});
});

test('QA listeners reject external hosts, duplicate addresses and unsafe port ranges',()=>{
  const hosts=Array.from({length:9},(_,i)=>`127.0.0.${20+i}`);
  assert.throws(()=>qaListeners({hosts:['0.0.0.0',...hosts.slice(1)],basePort:24201}),/loopback/);
  assert.throws(()=>qaListeners({hosts:[...hosts.slice(0,8),hosts[0]],basePort:24201}),/unique/);
  assert.throws(()=>qaListeners({hosts,basePort:65528}),/port/);
});
