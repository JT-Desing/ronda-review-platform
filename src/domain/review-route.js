import {pushRouteHistory} from './route-history.js';
import {resolveAssetVersion} from './asset-versions.js';

export function reviewRoute(versionId){
 const id=String(versionId||'').trim();
 if(!id||id.length>256||/[\u0000-\u001f\u007f]/.test(id))throw new Error('Versión inválida.');
 return `#review/${encodeURIComponent(id)}`;
}

export function readReviewRoute(hash){
 const match=/^#review\/([^/]+)$/.exec(hash||'');
 if(!match)return null;
 try{
  const id=decodeURIComponent(match[1]);
  return id&&id.length<=256&&!/[\u0000-\u001f\u007f]/.test(id)?id:null;
 }catch{return null;}
}

export function resolveReviewRouteAsset(state,versionId){
 if(!state?.versions?.[versionId])return null;
 const version=state.versions[versionId];
 if(state.projects?.[version.projectId]?.deletedAt)return null;
 const asset=(state.assets||[]).find(item=>item.id===version.assetId||item.activeVersionId===versionId||item.versionId===versionId||`asset-${item.id}-v1`===versionId);
 if(!asset||version.projectId&&version.projectId!==asset.projectId)return null;
 return resolveAssetVersion(state,asset,versionId);
}

export function setReviewRoute(target,versionId){
 const hash=reviewRoute(versionId);
 if(target.location.hash===hash)return hash;
 pushRouteHistory(target,hash);
 target.dispatchEvent(new Event('ronda-shared-project-route-synced'));
 return hash;
}
