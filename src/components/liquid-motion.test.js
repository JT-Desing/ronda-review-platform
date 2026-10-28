import test from 'node:test';
import assert from 'node:assert/strict';
import {liquidGeometry,stepLiquid} from './liquid-motion.js';
test('rest liquid stays outside the capsule and hover fills without moving its outline',()=>{
 assert.equal(liquidGeometry(0,0).length,3);
 assert.deepEqual(liquidGeometry(0,0),liquidGeometry(0,17));
 for(const p of liquidGeometry(0,0))assert.ok(p.cy-p.ry>56);
 for(const p of liquidGeometry(1,0))assert.ok(p.cy-p.ry<4&&p.cy+p.ry>52);
});
test('hover keeps changing and mouse leave settles precisely to rest',()=>{
 assert.notDeepEqual(liquidGeometry(.5,.2),liquidGeometry(.5,1.2));
 let state={amount:0,velocity:0};for(let i=0;i<100;i++)state=stepLiquid(state,1,1/60);
 assert.ok(state.amount>.98);for(let i=0;i<240;i++)state=stepLiquid(state,0,1/60);
 assert.equal(state.amount,0);assert.equal(state.velocity,0);
});
