import test from 'node:test';
import assert from 'node:assert/strict';
import { TOUR_STEPS, tourPending, visibleSteps, cardPosition } from './guided-tour.js';

test('the tour is pending for current and new accounts until it is marked done', () => {
  assert.equal(tourPending(null), true);
  assert.equal(tourPending('pending'), true);
  assert.equal(tourPending('done'), false);
});

test('steps whose target is not on screen are left out, steps without target stay', () => {
  const steps = visibleSteps(TOUR_STEPS, id => id !== 'team');
  assert.ok(!steps.some(step => step.target === 'team'));
  assert.equal(steps.filter(step => !step.target).length, TOUR_STEPS.filter(step => !step.target).length);
});

test('the card goes beside a side-menu item and above a bottom-menu item, inside the viewport', () => {
  const card = { width: 320, height: 180 }, desktop = { width: 1440, height: 900 }, phone = { width: 360, height: 640 };
  assert.deepEqual(cardPosition({ left: 10, top: 200, right: 230, bottom: 240, width: 220, height: 40 }, card, desktop), { left: 242, top: 200 });
  const below = cardPosition({ left: 100, top: 590, right: 150, bottom: 636, width: 50, height: 46 }, card, phone);
  assert.ok(below.top + card.height <= 590);
  assert.ok(below.left >= 12 && below.left + card.width <= phone.width - 12 + 0.01);
  assert.deepEqual(cardPosition(null, card, desktop), { left: 560, top: 360 });
});
