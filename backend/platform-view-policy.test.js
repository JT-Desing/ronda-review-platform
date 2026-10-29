import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {canAccessStudioView} from '../src/domain/platform-access.js';
import {requireWorkspaceAdmin} from './workspace-policy.js';
test('the team view is open to every account while platform views stay with the superadmin',()=>{
 for(const role of ['admin','editor','reviewer'])assert.equal(canAccessStudioView({role},'team'),true);
 for(const role of ['admin','editor','reviewer'])for(const view of ['settings','branding','platform'])assert.equal(canAccessStudioView({role},view),false);
 for(const view of ['home','projects','personal','pauta','activity','planning','review'])assert.equal(canAccessStudioView({role:'reviewer'},view),true);
 for(const view of ['team','settings','branding','platform'])assert.equal(canAccessStudioView({platformRole:'superadmin'},view),true);
});
test('team detail and member routes rely on each team role, not on a platform-wide block',async()=>{
 const routes=await readFile(new URL('./modules/workspaces.js',import.meta.url),'utf8');
 assert.doesNotMatch(routes,/restrictedWorkspaceAdministration|reservada al superadministrador/);
});
test('only workspace administrators can manage members and invitations, with no editor or reviewer exception',()=>{
 assert.doesNotThrow(()=>requireWorkspaceAdmin('admin'));
 for(const role of ['editor','reviewer'])assert.throws(()=>requireWorkspaceAdmin(role),error=>error.status===403);
 assert.throws(()=>requireWorkspaceAdmin(undefined),error=>error.status===404);
});
