import test from 'node:test';
import assert from 'node:assert/strict';
import {movePopover,placePopover} from './popover-position.js';

const size={width:340,height:220},viewport={width:1280,height:800};

test('opens below the mark when there is room',()=>{
  assert.deepEqual(placePopover({x:600,y:200},size,viewport),{left:430,top:218,placement:'below'});
});

test('opens above a mark near the bottom edge so the publish button stays visible',()=>{
  const place=placePopover({x:600,y:780},size,viewport);
  assert.equal(place.placement,'above');
  assert.equal(place.top,542);
  assert.ok(place.top+size.height<=viewport.height);
});

test('stays inside the window for a mark near a side edge',()=>{
  assert.equal(placePopover({x:4,y:200},size,viewport).left,12);
  assert.equal(placePopover({x:1276,y:200},size,viewport).left,928);
});

test('keeps the top of the popover reachable in a window too short for it',()=>{
  assert.equal(placePopover({x:600,y:100},size,{width:1280,height:200}).top,12);
});

test('a dragged popover follows the pointer',()=>{
  assert.deepEqual(movePopover({left:100,top:100},{x:50,y:-20},size,viewport),{left:150,top:80,placement:'below'});
});

test('a dragged popover cannot leave the window',()=>{
  const place=movePopover({left:100,top:100},{x:5000,y:5000},size,viewport);
  assert.equal(place.left,928);
  assert.equal(place.top,568);
});

test('a popover dragged to the lower half opens the mention menu upward',()=>{
  assert.equal(movePopover({left:100,top:100},{x:0,y:500},size,viewport).placement,'above');
});
