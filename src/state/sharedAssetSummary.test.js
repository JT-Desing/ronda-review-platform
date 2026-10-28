import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as state from './sharedReviewState.js';
const asset={id:'piece',workspaceId:'team',projectId:'project',activeVersionId:'v2',openComments:0,versionNumber:1};
const room={asset:{...asset,revision:7,openComments:2},version:{id:'v2',number:2,reviewerIds:['a','b'],decisions:{a:'approved',b:'pending'}},comments:[{status:'open'},{status:'resolved'},{status:'open'}]};
test('active room refresh synchronizes delivery counts, version and concurrency revision',()=>{
 const updated=state.mergeActiveAssetSummary([asset],room)[0];
 assert.equal(updated.openComments,2);assert.equal(updated.versionNumber,2);assert.equal(updated.approvedCount,1);assert.equal(updated.reviewerCount,2);assert.equal(updated.revision,7);assert.equal(asset.openComments,0);
});
test('historical or other-scope room never overwrites active delivery counters',()=>{
 const items=[asset];assert.equal(state.mergeActiveAssetSummary(items,{...room,version:{...room.version,id:'v1'}}),items);
 assert.equal(state.mergeActiveAssetSummary(items,{...room,asset:{...room.asset,workspaceId:'other'}}),items);
});
test('delivery uses server total rather than the loaded comments page',()=>{assert.equal(state.mergeActiveAssetSummary([asset],{...room,asset:{...room.asset,openComments:73}})[0].openComments,73);});
