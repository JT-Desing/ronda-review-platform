import {readSharedProjectLink} from './shared-project-link.js';
import {ensureRouteHistoryIndex,pushRouteHistory,readRouteHistoryIndex} from './route-history.js';
import {readReviewRoute} from './review-route.js';

const studioViews=new Set(['home','projects','personal','pauta','activity','planning','team','settings','branding','platform','review']);

export function readStudioView(hash){
 if(readReviewRoute(hash))return 'review';
 if(hash==='#personal')return 'personal';
 if(hash==='#projects')return 'projects';
 const match=/^#view\/(home|projects|personal|pauta|activity|planning|team|settings|branding|review)$/.exec(hash||'');
 return match?.[1]||null;
}

export function setStudioViewLocation(target,view){
 if(!studioViews.has(view))return target.location.hash;
 const hash=view==='personal'?'#personal':view==='projects'?'#projects':`#view/${view}`;
 if(target.location.hash===hash)return hash;
 pushRouteHistory(target,hash);
 target.dispatchEvent(new Event('ronda-shared-project-route-synced'));
 return hash;
}

export function watchSharedProjectLinks(target,{canNavigate,onNavigate,onRouteSynced=()=>{}}){
 let acceptedHash=target.location.hash;
 let acceptedIndex=ensureRouteHistoryIndex(target);
 let rollbackPending=false;
 const changed=event=>{
  if(rollbackPending){rollbackPending=false;return;}
  const next=target.location.hash;
  const sharedLink=readSharedProjectLink(next);
  const view=sharedLink?'projects':readStudioView(next);
  if(next===acceptedHash||!view)return;
  if(!canNavigate()){
   const nextIndex=event.type==='popstate'?readRouteHistoryIndex(event.state):null;
   if(nextIndex!==null&&nextIndex!==acceptedIndex){
    rollbackPending=true;
    target.history.go(acceptedIndex-nextIndex);
   }else if(event.type!=='popstate'){
    target.history.replaceState(target.history.state,'',`${target.location.pathname}${target.location.search}${acceptedHash||'#'}`);
   }
   return;
  }
  acceptedHash=next;
  acceptedIndex=readRouteHistoryIndex(event.type==='popstate'?event.state:target.history.state)??acceptedIndex;
  onNavigate(next,view);
 };
 const synced=()=>{acceptedHash=target.location.hash;acceptedIndex=ensureRouteHistoryIndex(target);onRouteSynced(acceptedHash);};
 target.addEventListener('hashchange',changed);
 target.addEventListener('popstate',changed);
 target.addEventListener('ronda-shared-project-route-synced',synced);
 return ()=>{target.removeEventListener('hashchange',changed);target.removeEventListener('popstate',changed);target.removeEventListener('ronda-shared-project-route-synced',synced);};
}
