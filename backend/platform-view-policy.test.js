import test from 'node:test';
import assert from 'node:assert/strict';
import {restrictedWorkspaceAdministration as denied} from './platform-view-policy.js';
import {canAccessStudioView} from '../src/domain/platform-access.js';
import {requireWorkspaceAdmin} from './workspace-policy.js';
test('normal users cannot enter reserved views, even workspace administrators',()=>{
 for(const role of ['admin','editor','reviewer'])for(const view of ['team','settings','branding'])assert.equal(canAccessStudioView({role},view),false);
 for(const view of ['home','projects','personal','pauta','activity','planning','review'])assert.equal(canAccessStudioView({role:'reviewer'},view),true);
 for(const view of ['team','settings','branding'])assert.equal(canAccessStudioView({platformRole:'superadmin'},view),true);
});
test('reserved roster and member routes are guarded while invitation roles remain enforced by the existing service',()=>{
 const account={id:'ordinary',role:'admin'};
 assert.equal(denied({account,path:'/api/workspaces/space',method:'GET'}),true);
 assert.equal(denied({account,path:'/api/workspaces/space/members/member',method:'PATCH'}),true);
 for(const method of ['POST','PATCH','DELETE'])assert.equal(denied({account,path:'/api/workspaces/space/invitations/invite',method}),false);
 assert.equal(denied({account,path:'/api/workspaces',method:'GET'}),false);
 assert.equal(denied({account,path:'/api/workspace-invitations/accept',method:'POST'}),false);
});
test('only workspace administrators can authorize invitations, with no editor or reviewer exception',()=>{
 assert.doesNotThrow(()=>requireWorkspaceAdmin('admin'));
 for(const role of ['editor','reviewer'])assert.throws(()=>requireWorkspaceAdmin(role),error=>error.status===403);
 assert.throws(()=>requireWorkspaceAdmin(undefined),error=>error.status===404);
});
