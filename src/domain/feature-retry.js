const retryViewKey='ronda:feature-retry-view';
const retryableViews=new Set(['pauta','planning','review']);

export function rememberFeatureRetry(storage,request){
  if(!storage||!retryableViews.has(request?.view))return false;
  const value={view:request.view};
  if(request.view==='review'){
    if(!request.mediaId)return false;
    value.mediaId=String(request.mediaId);
    if(request.versionId)value.versionId=String(request.versionId);
    if(request.mode==='social')value.mode='social';
  }
  try{storage.setItem(retryViewKey,JSON.stringify(value));return true}catch{return false;}
}

export function rememberFeatureRetryView(storage,view){return rememberFeatureRetry(storage,{view});}

export function consumeFeatureRetry(storage){
  if(!storage)return null;
  try{
    const saved=storage.getItem(retryViewKey);
    if(saved)storage.removeItem(retryViewKey);
    if(!saved)return null;
    let request;try{request=JSON.parse(saved)}catch{request={view:saved};}
    if(!retryableViews.has(request?.view))return null;
    if(request.view==='review'&&(!request.mediaId||typeof request.mediaId!=='string'))return null;
    return {view:request.view,mediaId:request.mediaId,versionId:request.versionId,mode:request.mode==='social'?'social':'review'};
  }catch{return null;}
}

export function consumeFeatureRetryView(storage,fallback){
  return consumeFeatureRetry(storage)?.view||fallback;
}
