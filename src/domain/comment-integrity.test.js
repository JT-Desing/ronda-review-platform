import test from 'node:test';
import assert from 'node:assert/strict';
import {canCreateComment,safeCommentChanges} from './comments.js';
const state={currentUserId:'u',members:{u:{}},projects:{p:{}},versions:{v:{projectId:'p'}},comments:{existing:{}}};
const comment={projectId:'p',versionId:'v',authorId:'u',text:'Hola'};
test('comentario exige proyecto y versión coherentes',()=>{assert.equal(canCreateComment(state,comment),true);for(const change of [{projectId:'other'},{versionId:'missing'},{authorId:'other'},{assigneeId:'other'},{text:' '},{id:'existing'}])assert.equal(canCreateComment(state,{...comment,...change}),false)});
test('edición no puede cambiar identidad, versión, proyecto ni autor',()=>assert.deepEqual(safeCommentChanges({id:'other',versionId:'other',projectId:'other',authorId:'other',createdAt:'other',text:'Editado',priority:'high'}),{text:'Editado',priority:'high'}));
