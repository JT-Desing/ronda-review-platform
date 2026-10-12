import test from 'node:test';
import assert from 'node:assert/strict';

// Breaks caught: missing role/context/coordinate checks must never authorize writes.
let policy = {};
try { policy = await import('./shared-review-policy.js'); } catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }
test('reviewer cannot upload and outsider cannot read', () => {
  assert.equal(typeof policy.requireReviewAction, 'function');
  assert.throws(() => policy.requireReviewAction('reviewer','upload'), {status:403});
  assert.throws(() => policy.requireReviewAction(undefined,'read'), {status:404});
  assert.throws(() => policy.requireReviewAction('admin','unknown'), {status:400});
  for(const role of ['admin','editor','reviewer']) policy.requireReviewAction(role,'comment');
});
test('annotation normalizes safe input without copying arbitrary properties', () => {
  assert.equal(typeof policy.validateAnnotation, 'function');
  const input={tool:'arrow',color:'#FF725E',points:[{x:0,y:0},{x:1,y:1}],authorId:'forged'};
  assert.deepEqual(policy.validateAnnotation(input),{tool:'arrow',color:'#ff725e',points:[{x:0,y:0},{x:1,y:1}]});
  assert.equal(policy.validateAnnotation(null),null);
});
test('coordinates outside unit square and oversized paths rejected', () => {
  assert.equal(typeof policy.validateAnnotation, 'function');
  for(const x of [-0.1,1.1,NaN,Infinity,'0.5']) assert.throws(()=>policy.validateAnnotation({tool:'pen',color:'#ffffff',points:[{x,y:0}]}),{status:400});
  assert.throws(()=>policy.validateAnnotation({tool:'pen',color:'#fff',points:[{x:0,y:0}]}),{status:400});
  assert.throws(()=>policy.validateAnnotation({tool:'pen',color:'#ffffff',points:Array(5001).fill({x:0,y:0})}),{status:400});
  assert.throws(()=>policy.validateAnnotation({tool:'type',color:'#ffffff',points:[{x:0,y:0}],text:' '}),{status:400});
  assert.throws(()=>policy.validateAnnotation({tool:'arrow',color:'#ffffff',points:[{x:0,y:0}]}),{status:400});
});
test('video time is finite nonnegative and images cannot carry a time', () => {
  assert.equal(typeof policy.validateAnchor, 'function');
  assert.deepEqual(policy.validateAnchor({timeSeconds:0},'video'),{timeSeconds:0});
  assert.deepEqual(policy.validateAnchor(null,'image'),{timeSeconds:null});
  for(const timeSeconds of [-1,Infinity,NaN,'3']) assert.throws(()=>policy.validateAnchor({timeSeconds},'video'),{status:400});
  assert.throws(()=>policy.validateAnchor({timeSeconds:2},'image'),{status:400});
});
