import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanupQaRunnerContainer} from './qa-container-cleanup.js';

test('does not inspect or clean a container that was never created',()=>{
  let inspected=false;
  assert.equal(cleanupQaRunnerContainer({container:null,script:'flow.js',inspectLabel:()=>{inspected=true;},removeContainer:()=>{}}),'none');
  assert.equal(inspected,false);
});

test('retains the persistent usability QA database',()=>{
  let removed=false,logged='';
  assert.equal(cleanupQaRunnerContainer({container:'persistent-qa',script:'usability-qa.js',inspectLabel:()=>{throw Error('should not inspect');},removeContainer:()=>{removed=true;},log:value=>logged=value}),'retained');
  assert.equal(removed,false);
  assert.match(logged,/retained for reproducibility/);
});

test('removes only a container whose explicit QA label matches',()=>{
  let removed='';
  assert.equal(cleanupQaRunnerContainer({container:'ephemeral-qa',script:'flow.js',inspectLabel:name=>name==='ephemeral-qa'?'shared-review':'other',removeContainer:name=>removed=name}),'removed');
  assert.equal(removed,'ephemeral-qa');
});

test('skips cleanup when the label does not match the QA scope',()=>{
  let removed=false,warned='';
  assert.equal(cleanupQaRunnerContainer({container:'unrelated',script:'flow.js',inspectLabel:()=> 'production',removeContainer:()=>{removed=true;},warn:value=>warned=value}),'skipped');
  assert.equal(removed,false);
  assert.match(warned,/label did not match/);
});

test('reports interrupted cleanup as pending without masking it with a Docker stack trace',()=>{
  let warned='';
  const status=cleanupQaRunnerContainer({container:'ephemeral-qa',script:'flow.js',inspectLabel:()=>{throw new Error('daemon unavailable');},removeContainer:()=>{},warn:value=>warned=value});
  assert.equal(status,'pending');
  assert.match(warned,/cleanup pending/);
  assert.match(warned,/inspect this exact QA container/);
});

test('reports a failed remove as pending instead of assuming it succeeded',()=>{
  let warned='';
  const status=cleanupQaRunnerContainer({container:'ephemeral-qa',script:'flow.js',inspectLabel:()=> 'shared-review',removeContainer:()=>{throw new Error('daemon unavailable');},warn:value=>warned=value});
  assert.equal(status,'pending');
  assert.match(warned,/cleanup pending/);
});
