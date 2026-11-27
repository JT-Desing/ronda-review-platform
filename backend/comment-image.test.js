import test from 'node:test';
import assert from 'node:assert/strict';
import {commentImages} from './comment-image.js';

const png=Buffer.from('89504e470d0a1a0a00000000','hex');
const item={name:'referencia.png',dataUrl:`data:image/png;base64,${png.toString('base64')}`};
test('valida imágenes de referencia por MIME, firma y límite de tamaño',()=>{
 assert.equal(commentImages([item])[0].mime,'image/png');
 assert.throws(()=>commentImages([{...item,dataUrl:'https://example.invalid/x.png'}]),{status:400});
 assert.throws(()=>commentImages([{...item,dataUrl:`data:image/png;base64,${Buffer.from('<svg/>').toString('base64')}`}]),{status:400});
 assert.throws(()=>commentImages([item,item,item,item]),{status:400});
 assert.throws(()=>commentImages([{...item,dataUrl:`data:image/png;base64,${Buffer.alloc(2*1024*1024+1,1).toString('base64')}`}]),{status:400});
});
