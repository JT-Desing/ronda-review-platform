import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveFigureAnchor} from './document-anchor.js';
test('encuentra figura de otra página del mismo archivo',()=>{
 const mark={id:'figure',timeSeconds:0};const annotations={'file-a:page-2':[mark]};
 assert.deepEqual(resolveFigureAnchor(annotations,{annotationId:'figure',annotationContext:'file-a:page-2',page:2},'file-a:page-1'),{context:'file-a:page-2',mark,page:2});
});
test('no navega hacia archivos distintos ni figuras deshechas',()=>{
 const comment={annotationId:'figure',annotationContext:'file-b:page-2',page:2};
 assert.equal(resolveFigureAnchor({'file-b:page-2':[{id:'figure'}]},comment,'file-a:page-1'),null);
 assert.equal(resolveFigureAnchor({},comment,'file-b:page-1'),null);
});
