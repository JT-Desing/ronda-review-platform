import test from 'node:test';
import assert from 'node:assert/strict';
import {iframeCaptureRect} from './web-capture.js';

test('maps an iframe viewport into a high-DPI tab capture',()=>{
  assert.deepEqual(iframeCaptureRect(2400,1600,1200,800,{left:100,top:50,width:900,height:600}),{x:200,y:100,width:1800,height:1200});
});

test('clips an iframe rectangle to the visible tab viewport',()=>{
  assert.deepEqual(iframeCaptureRect(1200,800,1200,800,{left:-20,top:40,width:500,height:900}),{x:0,y:40,width:480,height:760});
});

test('rejects invalid or fully offscreen iframe rectangles',()=>{
  assert.equal(iframeCaptureRect(1200,800,1200,800,{left:1400,top:20,width:100,height:100}),null);
  assert.equal(iframeCaptureRect(1200,800,1200,800,{left:0,top:0,width:0,height:100}),null);
});
