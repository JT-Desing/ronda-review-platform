import test from 'node:test';
import assert from 'node:assert/strict';
let m={};try{m=await import('./shared-range.js');}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
test('ranges cover exact, suffix and open bounds without exceeding file',()=>{
  assert.equal(typeof m.parseRange,'function');
  assert.equal(m.parseRange(undefined,6),null);
  assert.deepEqual(m.parseRange('bytes=1-3',6),{start:1,end:3});
  assert.deepEqual(m.parseRange('bytes=-2',6),{start:4,end:5});
  assert.deepEqual(m.parseRange('bytes=2-',6),{start:2,end:5});
  assert.deepEqual(m.parseRange('bytes=0-100',6),{start:0,end:5});
  for(const h of ['bytes=6-','bytes=3-1','bytes=-0','bytes=0-1,3-4','wrong','bytes=9007199254740999-'])assert.throws(()=>m.parseRange(h,6),{status:416});
});
