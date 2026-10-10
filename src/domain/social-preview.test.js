import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSocialPreview } from './social-preview.js';
test('social carousel preserves explicit order without crossing projects or including documents',()=>{
 const assets=[{id:'a',projectId:'p',type:'image'},{id:'b',projectId:'p',type:'video'},{id:'c',projectId:'other',type:'image'},{id:'d',projectId:'p',type:'html'}];
 assert.deepEqual(normalizeSocialPreview({assetIds:['b','a','b','c','d','missing'],ratio:'invalid'},assets,'p').assetIds,['b','a']);
 assert.equal(normalizeSocialPreview({},assets,'p').ratio,'4/5');
});
test('social configuration is bounded and empty never implicitly includes campaign assets',()=>{
 assert.deepEqual(normalizeSocialPreview({},[{id:'a',type:'image',projectId:'p'}],'p').assetIds,[]);
 assert.equal(normalizeSocialPreview({caption:'x'.repeat(3000),account:'x'.repeat(100)},[],'p').caption.length,2200);
});
