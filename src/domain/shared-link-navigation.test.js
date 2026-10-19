import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readStudioView, setStudioViewLocation, watchSharedProjectLinks} from './shared-link-navigation.js';
import {readSharedProjectLink,setSharedProjectLocation,sharedProjectGalleryWorkspace} from './shared-project-link.js';
const first='#team/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const second=first+'/11111111-2222-3333-4444-555555555555';
function browser(){
 const target=new EventTarget();
 target.location={origin:'https://ronda.repolite.link',pathname:'/',search:'',hash:first};
 const history=target.history={state:null,entries:[],index:0,
  pushState(state,_title,path){const url=new URL(path,target.location.origin);this.entries=this.entries.slice(0,this.index+1);this.entries.push({state,url});this.index++;this.sync(url);},
  replaceState(state,_title,path){const url=new URL(path,target.location.origin);this.entries[this.index]={state,url};this.sync(url);},
  sync(url){this.state=this.entries[this.index]?.state??null;Object.assign(target.location,{pathname:url.pathname,search:url.search,hash:url.hash});},
  go(delta){const nextIndex=this.index+delta;if(nextIndex<0||nextIndex>=this.entries.length)return;const previousHash=target.location.hash;this.index=nextIndex;const entry=this.entries[this.index];this.sync(entry.url);const event=new Event('popstate');Object.defineProperty(event,'state',{value:entry.state});target.dispatchEvent(event);if(previousHash!==target.location.hash)target.dispatchEvent(new Event('hashchange'));},
 };
 const initial=new URL(`/${first}`,target.location.origin);history.entries=[{state:null,url:initial}];history.sync(initial);
 return {target,change(hash,event='hashchange'){target.location.hash=hash;const changeEvent=new Event(event);if(event==='popstate')Object.defineProperty(changeEvent,'state',{value:history.state});target.dispatchEvent(changeEvent);},back(){history.go(-1)},forward(){history.go(1)}};
}
test('an existing tab opens a newly received shared link and ignores unrelated fragments',()=>{
 const b=browser(),seen=[];const stop=watchSharedProjectLinks(b.target,{canNavigate:()=>true,onNavigate:hash=>seen.push(hash)});
 b.change(second);b.change(second);b.change('#unrelated');assert.deepEqual(seen,[second]);
 stop();b.change(first);assert.deepEqual(seen,[second]);
});
test('declining navigation preserves the current link and unpublished work',()=>{
 const b=browser(),seen=[];let allowed=false;
 watchSharedProjectLinks(b.target,{canNavigate:()=>allowed,onNavigate:hash=>seen.push(hash)});
 b.change(second);assert.equal(b.target.location.hash,first);assert.deepEqual(seen,[]);
 allowed=true;b.change(second);assert.deepEqual(seen,[second]);
});

test('internal project selection syncs history and browser Back restores the prior project',()=>{
 const b=browser(),seen=[];watchSharedProjectLinks(b.target,{canNavigate:()=>true,onNavigate:hash=>seen.push(hash)});
 const [workspaceId,projectId]=second.slice('#team/'.length).split('/');
 setSharedProjectLocation(b.target,workspaceId,projectId);
 assert.equal(b.target.location.hash,second);
 assert.deepEqual(seen,[]);
 b.back();
 assert.deepEqual(seen,[first]);
});

test('returning to Proyectos from a shared project detail restores the team gallery route',()=>{
 const b=browser(),synced=[];watchSharedProjectLinks(b.target,{canNavigate:()=>true,onNavigate:()=>{},onRouteSynced:hash=>synced.push(hash)});
 const [workspaceId,projectId]=second.slice('#team/'.length).split('/');
 setSharedProjectLocation(b.target,workspaceId,projectId);
 assert.equal(sharedProjectGalleryWorkspace(b.target.location.hash),workspaceId);
 setSharedProjectLocation(b.target,workspaceId,'');
 assert.deepEqual(readSharedProjectLink(b.target.location.hash),{workspaceId,projectId:''});
 assert.deepEqual(synced,[second,first]);
});

test('internal route pushes notify the shell so project detail remounts from the new hash',()=>{
 const b=browser(),synced=[];watchSharedProjectLinks(b.target,{canNavigate:()=>true,onNavigate:()=>{},onRouteSynced:hash=>synced.push(hash)});
 const [workspaceId,projectId]=second.slice('#team/'.length).split('/');
 setSharedProjectLocation(b.target,workspaceId,projectId);
 assert.deepEqual(synced,[second]);
 setStudioViewLocation(b.target,'projects');
 assert.deepEqual(synced,[second,'#projects']);
});

test('personal and shared project views persist through reload and browser Back/Forward',()=>{
 const b=browser(),seen=[];watchSharedProjectLinks(b.target,{canNavigate:()=>true,onNavigate:(hash,view)=>seen.push({hash,view})});
 setStudioViewLocation(b.target,'personal');
 assert.equal(b.target.location.hash,'#personal');
 assert.equal(readStudioView(b.target.location.hash),'personal');
 b.back();
 assert.deepEqual(seen,[{hash:first,view:'projects'}]);
 b.forward();
 assert.deepEqual(seen,[{hash:first,view:'projects'},{hash:'#personal',view:'personal'}]);
});

test('all ordinary studio views have stable reload routes',()=>{
 const b=browser();
 for(const view of ['home','projects','personal','pauta','activity','planning','team','settings','branding']){
  setStudioViewLocation(b.target,view);
  assert.equal(readStudioView(b.target.location.hash),view);
 }
});

test('dirty shared review refuses the personal route until navigation is confirmed',()=>{
 const b=browser(),seen=[];let allowed=false;
 watchSharedProjectLinks(b.target,{canNavigate:()=>allowed,onNavigate:(hash,view)=>seen.push({hash,view})});
 b.change('#personal');
 assert.equal(b.target.location.hash,first);
 assert.deepEqual(seen,[]);
 allowed=true;b.change('#personal');
 assert.equal(b.target.location.hash,'#personal');
 assert.deepEqual(seen,[{hash:'#personal',view:'personal'}]);
});

test('refusing browser Back restores the source entry without overwriting the destination',()=>{
 const b=browser(),seen=[];let allowed=true;
 watchSharedProjectLinks(b.target,{canNavigate:()=>allowed,onNavigate:(hash,view)=>seen.push({hash,view})});
 setStudioViewLocation(b.target,'personal');
 setSharedProjectLocation(b.target,first.slice('#team/'.length),second.slice(first.length+1));
 assert.equal(b.target.location.hash,second);
 allowed=false;
 b.back();
 assert.equal(b.target.location.hash,second);
 assert.deepEqual(seen,[]);
 allowed=true;
 b.back();
 assert.equal(b.target.location.hash,'#personal');
 assert.deepEqual(seen,[{hash:'#personal',view:'personal'}]);
});
