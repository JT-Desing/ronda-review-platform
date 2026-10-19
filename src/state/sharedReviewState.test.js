import test from 'node:test';
import assert from 'node:assert/strict';
let m={};try{m=await import('./sharedReviewState.js');}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
test('late response for another piece is discarded',()=>{
  assert.equal(typeof m.acceptResponse,'function');
  assert.equal(m.acceptResponse({workspaceId:'s',projectId:'p',assetId:'a',versionId:'v2'},{workspaceId:'s',projectId:'p',assetId:'a',versionId:'v1'},{secret:'old'}),null);
  assert.deepEqual(m.acceptResponse({workspaceId:'s',assetId:'a'},{workspaceId:'s',assetId:'a'},{ok:true}),{ok:true});
});
test('409 retains draft and historical version does not jump on refresh',()=>{
  assert.equal(typeof m.applyRoomError,'function');assert.equal(typeof m.pickVersion,'function');
  const draft={text:'Unsaved',requestId:'same-key'};
  assert.deepEqual(m.applyRoomError({draft},{status:409,message:'Conflict'}).draft,draft);
  assert.equal(m.pickVersion([{id:'v2'},{id:'v1'}],'v1','v2'),'v1');
  assert.equal(m.pickVersion([{id:'v2'}],'missing','v2'),'v2');
});
test('expired authentication preserves review and draft while revoked access clears review',()=>{
  const state={room:{id:'visible-review'},draft:{text:'Keep this',requestId:'same-key'}};
  assert.equal(m.applyRoomError(state,{status:401,message:'Expired'}).room,state.room);
  assert.equal(m.applyRoomError(state,{status:401,message:'Expired'}).draft,state.draft);
  for(const status of [403,404])assert.equal(m.applyRoomError(state,{status,message:'Denied'}).room,null);
});
test('shared annotation preserves endpoints and excludes private mark metadata',()=>{
  assert.equal(typeof m.sharedAnnotation,'function');
  assert.deepEqual(m.sharedAnnotation({id:'private',tool:'arrow',color:'#ffffff',timeSeconds:10,points:[{x:0,y:0},{x:0.5,y:0.5},{x:1,y:1}]}),{tool:'arrow',color:'#ffffff',points:[{x:0,y:0},{x:1,y:1}]});
});
test('refresh guard reads latest dirty/busy state and rejects stale pagination',()=>{
  assert.equal(typeof m.createReviewGuard,'function');
  const guard=m.createReviewGuard(),canRefresh=()=>guard.canRefresh();
  assert.equal(canRefresh(),true);
  guard.update({dirty:true,busy:false});assert.equal(canRefresh(),false);
  guard.update({dirty:false,busy:true});assert.equal(canRefresh(),false);
  const old=guard.begin();guard.begin();assert.equal(guard.isCurrent(old),false);
  guard.update({dirty:false,busy:false});assert.equal(canRefresh(),true);
});
test('navigation guard never discards a busy upload and requires draft confirmation',()=>{
  assert.equal(typeof m.canLeaveSharedReview,'function');
  let calls=0;const deny=()=>{calls++;return false;};
  assert.equal(m.canLeaveSharedReview({dirty:true,busy:true},deny),false);assert.equal(calls,0);
  assert.equal(m.canLeaveSharedReview({dirty:true,busy:false},deny),false);assert.equal(calls,1);
  assert.equal(m.canLeaveSharedReview({dirty:false,busy:false},deny),true);
});
