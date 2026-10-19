import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nextCommentFilterIndex} from './comment-filter-tabs.js';

test('comment filter tabs wrap and support Home/End navigation',()=>{
  assert.equal(nextCommentFilterIndex(0,'ArrowLeft'),2);
  assert.equal(nextCommentFilterIndex(2,'ArrowRight'),0);
  assert.equal(nextCommentFilterIndex(0,'ArrowRight'),1);
  assert.equal(nextCommentFilterIndex(2,'ArrowLeft'),1);
  assert.equal(nextCommentFilterIndex(1,'Home'),0);
  assert.equal(nextCommentFilterIndex(1,'End'),2);
  assert.equal(nextCommentFilterIndex(1,'Enter'),null);
});
