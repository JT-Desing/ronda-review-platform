import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readSharedProjectLink,sharedProjectGalleryWorkspace,sharedProjectLink,setSharedProjectLocation} from './shared-project-link.js';
test('project links round-trip only scoped UUID identifiers',()=>{
 const workspaceId='e9a7c001-67bd-4be9-968d-13e465cd1210',projectId='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
 const url=sharedProjectLink('https://ronda.repolite.link',workspaceId,projectId);
 assert.deepEqual(readSharedProjectLink(new URL(url).hash),{workspaceId,projectId});
 assert.equal(new URL(url).origin,'https://ronda.repolite.link');
 for(const value of ['#team/a/b','#team/../../x','#review/a',url+'?extra'])assert.equal(readSharedProjectLink(value),null);
 assert.throws(()=>sharedProjectLink('https://ronda.repolite.link','invalid',projectId));
});

test('team-only links select the gallery and project selection updates the address without reload',()=>{
 const workspaceId='e9a7c001-67bd-4be9-968d-13e465cd1210',projectId='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
 const target=new EventTarget();target.location={origin:'https://ronda.repolite.link',pathname:'/',search:'',hash:''};
 target.history={state:{page:1},pushState(state,_title,path){this.state=state;const url=new URL(path,target.location.origin);Object.assign(target.location,{pathname:url.pathname,search:url.search,hash:url.hash});},replaceState(state,_title,path){this.state=state;const url=new URL(path,target.location.origin);Object.assign(target.location,{pathname:url.pathname,search:url.search,hash:url.hash});}};
 const gallery=sharedProjectLink(target.location.origin,workspaceId);
 assert.equal(readSharedProjectLink(new URL(gallery).hash).projectId,'');
 assert.equal(sharedProjectGalleryWorkspace(`#team/${workspaceId}/${projectId}`),workspaceId);
 assert.equal(sharedProjectGalleryWorkspace(`#team/${workspaceId}`),null);
 assert.equal(sharedProjectGalleryWorkspace('#team/invalid'),null);
 const selected=setSharedProjectLocation(target,workspaceId,projectId);
 assert.equal(selected,`#team/${workspaceId}/${projectId}`);
 assert.equal(target.location.hash,selected);
 assert.deepEqual(readSharedProjectLink(target.location.hash),{workspaceId,projectId});
 assert.equal(target.history.state.page,1);
});
