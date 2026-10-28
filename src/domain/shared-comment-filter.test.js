import {test} from 'node:test';
import assert from 'node:assert/strict';
import {filterSharedComments,sharedCommentsEmptyMessage} from './shared-comment-filter.js';
import * as sharedFilters from './shared-comment-filter.js';

test('approval remains blocked when blocker exists beyond loaded comments or totals are partial',()=>{
 assert.equal(typeof sharedFilters.sharedApprovalBlocked,'function');
 assert.equal(sharedFilters.sharedApprovalBlocked({blocking:1,partial:false}),true);
 assert.equal(sharedFilters.sharedApprovalBlocked({blocking:0,partial:true}),true);
 assert.equal(sharedFilters.sharedApprovalBlocked({blocking:0,partial:false}),false);
});
test('version counters use server totals even with only the first page loaded',()=>{
 assert.equal(typeof sharedFilters.sharedCommentCounts,'function');
 const room={comments:[{status:'open',priority:'normal'}],nextCursor:'more',commentStats:{total:123,open:120,resolved:3,blocking:2}};
 assert.deepEqual(sharedFilters.sharedCommentCounts(room),{total:123,open:120,resolved:3,blocking:2,partial:false});
 assert.deepEqual(sharedFilters.sharedCommentCounts({comments:room.comments,nextCursor:'more'}),{total:1,open:1,resolved:0,blocking:0,partial:true});
});
test('active review filters hide resolved comments while searching author, text and replies',()=>{
 const comments=[{author:'Eva',text:'Contraste',status:'open',replies:[{text:'Recibido'}]},{author:'Ana',text:'Título',status:'resolved',replies:[]}];
 assert.deepEqual(filterSharedComments(comments,'Abiertos','RECIBIDO'),[comments[0]]);
 assert.deepEqual(filterSharedComments(comments,'Todos','ana'),[]);
});
test('no matches explains filter, search and partial pagination instead of a blank panel',()=>{
 assert.match(sharedCommentsEmptyMessage({comments:[],visible:[],filter:'Todos',search:''}),/No hay comentarios/);
 const comments=[{text:'test',status:'open'}];
 assert.match(sharedCommentsEmptyMessage({comments,visible:[],filter:'Todos',search:'x'}),/coincidencias/);
 assert.match(sharedCommentsEmptyMessage({comments,visible:[],filter:'Abiertos',search:''}),/pendientes/);
 assert.match(sharedCommentsEmptyMessage({comments,visible:[],filter:'Todos',search:'x',nextCursor:'more'}),/cargados/);
 assert.equal(sharedCommentsEmptyMessage({comments,visible:comments,filter:'Todos',search:''}),'');
});
