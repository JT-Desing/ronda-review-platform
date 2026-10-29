import test from 'node:test';
import assert from 'node:assert/strict';
import { revealReviewStage } from './reveal-review-stage.js';

test('scrolls the viewer bar to the top once it is in the page', () => {
  const calls = [];
  let polls = 0;
  const bar = { scrollIntoView: options => calls.push(options) };
  const document = { querySelector: () => (++polls >= 3 ? bar : null) };
  revealReviewStage({ document, frame: callback => callback(), remount: false });
  assert.deepEqual(calls, [{ behavior: 'smooth', block: 'start' }]);
});

test('gives up quietly when the viewer never appears', () => {
  let polls = 0;
  revealReviewStage({ document: { querySelector: () => { polls++; return null; } }, frame: callback => callback(), attempts: 4, remount: false });
  assert.equal(polls, 5);
});

test('waits for the bar of the new piece when the viewer remounts', () => {
  const old = { scrollIntoView: () => assert.fail('scrolled the old bar') };
  const fresh = { calls: 0, scrollIntoView() { this.calls++; } };
  let polls = 0;
  revealReviewStage({ document: { querySelector: () => (polls++ < 3 ? old : fresh) }, frame: callback => callback() });
  assert.equal(fresh.calls, 1);
});
