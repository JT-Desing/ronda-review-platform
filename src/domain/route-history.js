const routeIndexKey='__rondaRouteIndex';

function withRouteIndex(state,index){
 return {...(state&&typeof state==='object'?state:{}),[routeIndexKey]:index};
}

export function ensureRouteHistoryIndex(target){
 const state=target.history.state;
 if(Number.isInteger(state?.[routeIndexKey]))return state[routeIndexKey];
 target.history.replaceState(withRouteIndex(state,0),'',`${target.location.pathname}${target.location.search}${target.location.hash}`);
 return 0;
}

export function pushRouteHistory(target,hash){
 const current=ensureRouteHistoryIndex(target);
 const index=current+1;
 target.history.pushState(withRouteIndex(target.history.state,index),'',`${target.location.pathname}${target.location.search}${hash}`);
 return index;
}

export function readRouteHistoryIndex(state){
 return Number.isInteger(state?.[routeIndexKey])?state[routeIndexKey]:null;
}
