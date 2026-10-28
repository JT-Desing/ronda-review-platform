import {test} from 'node:test';
import assert from 'node:assert/strict';
import {activityItem} from './activity-item.js';
test('activity uses actual project and version rather than a sample campaign',()=>{
 const state={members:{u:{name:'Mario',initials:'MA'}},projects:{p:{name:'Proyecto privado'}},versions:{v:{name:'pieza.png'}},comments:{c:{text:'Revisar'}}};
 const result=activityItem(state,{id:'e',actorId:'u',projectId:'p',versionId:'v',commentId:'c',kind:'comment.created'});
 assert.equal(result.where,'Proyecto privado · pieza.png');
 assert.equal(result.project,'Proyecto privado');
 assert.equal(result.projectId,'p');assert.equal(result.commentId,'c');assert.equal(result.detail,'Revisar');
});
test('missing historical resources are labelled honestly and resolved events filter correctly',()=>{
 const state={members:{},projects:{},versions:{},comments:{}};
 const result=activityItem(state,{id:'e',kind:'comment.resolved'});
 assert.equal(result.type,'resolved');assert.equal(result.project,'Proyecto no disponible');
 assert.doesNotMatch(result.where,/Amara|Nébula/);
});
