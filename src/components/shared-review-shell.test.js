import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('team projects open the review room rather than a second project interface',()=>{
  const source=readFileSync(new URL('./SharedProjectMedia.jsx',import.meta.url),'utf8');
  assert.match(source,/setSelected\(active\.assets\[0\]\?\.id/);
  assert.match(source,/<SharedDeliveryGrid/);
  const grid=readFileSync(new URL('./SharedDeliveryGrid.jsx',import.meta.url),'utf8');
  assert.match(grid,/storyboard-disclosure expanded shared-delivery-controls/);
  assert.match(grid,/delivery-empty-state/);
  assert.match(grid,/assets.length>0&&<div className="storyboard-modes"/);
  assert.match(grid,/DeliveryPositionPicker/);
  assert.match(grid,/onTrash\(removing\)/);
  assert.match(grid,/onRestore\(asset\)/);
});
test('shared room preserves the original review shell and asset controls',()=>{
  const source=readFileSync(new URL('./SharedReviewRoom.jsx',import.meta.url),'utf8');
  assert.match(source,/className="topbar"/);
  assert.match(source,/className="asset-bar"/);
  assert.match(source,/className="social-mode-switch"/);
  assert.match(source,/OriginalMediaStage/);
  assert.doesNotMatch(source,/className="shared-review-heading"/);
});
