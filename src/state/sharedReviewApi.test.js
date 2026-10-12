import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewRequest,uploadFile} from './sharedReviewApi.js';
import {beginDemoSession,endDemoSession} from './demoSession.js';
test('company demo cannot read or mutate real shared workspace',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=()=>{throw new Error('Unexpected real account network request');};
  beginDemoSession({projects:{},assets:[]});
  try{
    await assert.rejects(reviewRequest('/api/workspaces/real/projects'),/demo/i);
    await assert.rejects(uploadFile({workspaceId:'real',projectId:'real'},{name:'demo.png',type:'image/png',size:10},'key'),/demo/i);
  }finally{endDemoSession();globalThis.fetch=original;}
});
