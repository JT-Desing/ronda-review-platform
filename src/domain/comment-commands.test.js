import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCommentCommand} from './comment-commands.js';
test('leading commands map to persisted existing priorities and strip only the prefix',()=>{
 for(const [command,priority] of [['urgente','high'],['bloqueo','blocking'],['normal','normal']])assert.deepEqual(parseCommentCommand(` /${command} Revisar pieza `,'blocking'),{text:'Revisar pieza',priority,command:`/${command}`});
});
test('unrelated slashes and embedded commands remain literal',()=>{
 for(const text of ['https://example.com/normal','Texto /bloqueo','/urgentemente revisar','/desconocido texto'])assert.deepEqual(parseCommentCommand(text,'high'),{text,priority:'high',command:null});
});
test('commands support case and newlines but never fabricate comment content',()=>{
 assert.equal(parseCommentCommand('/URGENTE\nRevisar').priority,'high');
 assert.equal(parseCommentCommand('/bloqueo').text,'');
 assert.equal(parseCommentCommand('/normal normaliza /urgente').text,'normaliza /urgente');
});
