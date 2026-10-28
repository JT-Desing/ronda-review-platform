import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readReviewRoute,reviewRoute,setReviewRoute,resolveReviewRouteAsset} from './review-route.js';
import {readStudioView,watchSharedProjectLinks} from './shared-link-navigation.js';

test('review deep links round-trip opaque version identifiers safely',()=>{
 const versionId='asset-55a/b-c-v2';
 const hash=reviewRoute(versionId);
 assert.equal(hash,'#review/asset-55a%2Fb-c-v2');
 assert.equal(readReviewRoute(hash),versionId);
 assert.equal(readStudioView(hash),'review');
 for(const hash of ['#review/','#review/%ZZ','#review/a/b','#review/%00','#review/'+ 'x'.repeat(257)])assert.equal(readReviewRoute(hash),null);
 assert.throws(()=>reviewRoute(''));
});

test('review links are history entries and Back/Forward routes back to the same review version',()=>{
 const target=new EventTarget();target.location={origin:'https://ronda.example',pathname:'/',search:'',hash:'#personal'};
 const entries=[{state:{__rondaRouteIndex:0},hash:'#personal'}];let index=0;
 target.history={get state(){return entries[index].state},replaceState(state,_title,path){entries[index]={state,hash:new URL(path,target.location.origin).hash};target.location.hash=entries[index].hash;},pushState(state,_title,path){entries.splice(index+1);entries.push({state,hash:new URL(path,target.location.origin).hash});index++;target.location.hash=entries[index].hash;},go(delta){index+=delta;const entry=entries[index];target.location.hash=entry.hash;const event=new Event('popstate');Object.defineProperty(event,'state',{value:entry.state});target.dispatchEvent(event);}};
 const seen=[];watchSharedProjectLinks(target,{canNavigate:()=>true,onNavigate:(hash,view)=>seen.push({versionId:readReviewRoute(hash),view})});
 setReviewRoute(target,'asset-sample-v2');
 assert.equal(target.location.hash,'#review/asset-sample-v2');
 target.history.go(-1);assert.deepEqual(seen,[{versionId:null,view:'personal'}]);
 target.history.go(1);assert.deepEqual(seen,[{versionId:null,view:'personal'},{versionId:'asset-sample-v2',view:'review'}]);
});

test('review route resolves only a version and asset already present in the signed-in account state',()=>{
 const state={assets:[{id:'asset-a',projectId:'private-project',name:'Mock.png',type:'image',activeVersionId:'asset-a-v2'}],versions:{'asset-a-v1':{id:'asset-a-v1',projectId:'private-project',number:1},'asset-a-v2':{id:'asset-a-v2',assetId:'asset-a',fileId:'file-b',projectId:'private-project',number:2,name:'Mock v2.png',type:'image',size:10}}};
 assert.equal(resolveReviewRouteAsset(state,'asset-a-v2').name,'Mock v2.png');
 assert.equal(resolveReviewRouteAsset(state,'missing-version'),null);
 state.versions['asset-a-v2'].projectId='another-project';
 assert.equal(resolveReviewRouteAsset(state,'asset-a-v2'),null);
});
