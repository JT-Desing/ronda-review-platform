import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {trashProject,restoreProject,permanentlyDeleteProject} from './project-trash.js';
import {projectOverview} from './project-presentation.js';
import {resolveReviewRouteAsset} from './review-route.js';
const seed=()=>({projects:{p:{id:'p',name:'Proyecto',activeVersionId:'v'}},assets:[{id:'a',projectId:'p',versionId:'v'}],versions:{v:{id:'v',projectId:'p',assetId:'a',reviewerIds:[],decisions:{}}},comments:{c:{id:'c',projectId:'p',versionId:'v',status:'open'}}});
test('private project deletion requires exact confirmation and preserves all related data',()=>{
 const s=seed();assert.equal(trashProject(s,{id:'p',confirmName:'Otro'},'now'),s);
 assert.equal(trashProject(s,{id:'missing',confirmName:'Proyecto'},'now'),s);
 const next=trashProject(s,{id:'p',confirmName:'Proyecto'},'now');
 assert.equal(next.projects.p.deletedAt,'now');
 for(const key of ['assets','versions','comments'])assert.equal(next[key],s[key]);
 assert.equal(projectOverview(next).projects.length,0);assert.equal(projectOverview(next).assets,0);
 assert.equal(resolveReviewRouteAsset(next,'v'),null);
});
test('restoration survives a saved snapshot and restores original references',()=>{
 const s=seed();const saved=JSON.parse(JSON.stringify(trashProject(s,{id:'p',confirmName:'Proyecto'},'now')));
 const restored=restoreProject(saved,{id:'p'});
 assert.deepEqual(restored,s);assert.equal(projectOverview(restored).projects.length,1);
 assert.equal(restoreProject(s,{id:'p'}),s);
});
test('permanent deletion only removes a trashed project after exact name confirmation',()=>{
 const s={...seed(),annotations:{'p:page-1':[{id:'mark'}],a:[{id:'a-mark'}],'other-asset':[]},notifications:{n:{projectId:'p'},keep:{projectId:'q'}},activity:[{projectId:'p',kind:'project.created'}]};
 assert.equal(permanentlyDeleteProject(s,{id:'p',confirmName:'Otro'}),s);
 assert.equal(permanentlyDeleteProject(s,{id:'p',confirmName:'Proyecto'}),s);
 const trashed=trashProject(s,{id:'p',confirmName:'Proyecto'},'now');
 const removed=permanentlyDeleteProject(trashed,{id:'p',confirmName:'Proyecto'});
 assert.equal(removed.projects.p,undefined);assert.deepEqual(removed.assets,[]);assert.deepEqual(removed.versions,{});assert.deepEqual(removed.comments,{});
 assert.deepEqual(removed.annotations,{'other-asset':[]});assert.deepEqual(removed.notifications,{keep:{projectId:'q'}});
 assert.equal(removed.activity.length,1);
});
test('home and private library wire deletion explicitly without bypassing shared permissions',()=>{
 const ui=readFileSync(new URL('../components/StudioWorkspace.jsx',import.meta.url),'utf8');
 assert.equal((ui.match(/onDelete=\{deletion.requestDelete\}/g)||[]).length,2);
 const shared=readFileSync(new URL('../components/SharedProjects.jsx',import.meta.url),'utf8');
 assert.match(shared,/onDelete=\{role==='admin'&&!busy/);
 const personal=readFileSync(new URL('../components/PersonalProjectTrash.jsx',import.meta.url),'utf8');
 assert.match(personal,/aria-label=\{`Restaurar proyecto \$\{project\.name\}`\}/);
 assert.match(personal,/aria-label=\{`Eliminar \$\{project\.name\} definitivamente`\}/);
 assert.match(personal,/Esta acción no se puede deshacer/);
});
