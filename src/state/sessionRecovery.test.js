import test from 'node:test';
import assert from 'node:assert/strict';
import {notifySessionExpired,reauthenticateAccount} from './sessionRecovery.js';

test('only unauthorized authenticated operations request session recovery',()=>{
 const events=[];const target={dispatchEvent:event=>events.push(event.type)};
 notifySessionExpired('/api/workspaces/a',{status:401},target);
 notifySessionExpired('/api/data',{status:401},target);
 for(const path of ['/api/auth/login','/api/auth/register','/api/auth/session'])notifySessionExpired(path,{status:401},target);
 notifySessionExpired('/api/workspaces/a',{status:403},target);
 assert.deepEqual(events,['ronda-session-expired','ronda-session-expired']);
});

test('reauthentication returns same account without fetching or replacing saved data',async()=>{
 const calls=[];
 const user=await reauthenticateAccount({id:'a',email:'ana@example.invalid'},'synthetic-test-password',async(path,options)=>{calls.push([path,JSON.parse(options.body)]);return {user:{id:'a',email:'ana@example.invalid'}};});
 assert.equal(user.id,'a');
 assert.deepEqual(calls,[['/api/auth/login',{email:'ana@example.invalid',password:'synthetic-test-password'}]]);
});

test('a different returned identity is logged out and never adopted',async()=>{
 const calls=[];
 await assert.rejects(reauthenticateAccount({id:'a',email:'ana@example.invalid'},'synthetic-test-password',async(path)=>{calls.push(path);return {user:{id:'b'}};}),/misma cuenta/);
 assert.deepEqual(calls,['/api/auth/login','/api/auth/logout']);
});
