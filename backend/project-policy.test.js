import test from 'node:test';
import assert from 'node:assert/strict';
import { projectInput, commentInput, requestId, requireProjectEditor } from './project-policy.js';
test('project payloads validate bounds without trusting client roles', () => {
  assert.deepEqual(projectInput({ name: ' QA ', client: ' Cliente ' }), { name: 'QA', client: 'Cliente' });
  for (const value of [null, [], { name: '' }, { name: 'x'.repeat(101) }]) assert.throws(() => projectInput(value), { status: 400 });
  assert.throws(() => requireProjectEditor('reviewer'), { status: 403 });
  assert.doesNotThrow(() => requireProjectEditor('editor'));
});
test('comment and request identifiers are bounded and validated', () => {
  assert.equal(commentInput({ text: ' QA ' }), 'QA');
  for (const value of [null, { text: ' ' }, { text: 'x'.repeat(2001) }]) assert.throws(() => commentInput(value), { status: 400 });
  assert.throws(() => requestId('forged'), { status: 400 });
  assert.equal(requestId('11111111-1111-1111-1111-111111111111'), '11111111-1111-1111-1111-111111111111');
});
