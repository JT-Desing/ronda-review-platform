import {pushRouteHistory} from './route-history.js';
const uuid='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
export function readSharedProjectLink(hash){const match=new RegExp(`^#team/(${uuid})(?:/(${uuid}))?$`,'i').exec(hash||'');return match?{workspaceId:match[1],projectId:match[2]||''}:null;}
export function sharedProjectGalleryWorkspace(hash){const route=readSharedProjectLink(hash);return route?.projectId?route.workspaceId:null;}
export function sharedProjectLink(origin,workspaceId,projectId=''){const hash=projectId?`#team/${workspaceId}/${projectId}`:`#team/${workspaceId}`;if(!readSharedProjectLink(hash))throw new Error('Proyecto inválido.');return new URL('/',origin).href+hash;}

export function setSharedProjectLocation(target,workspaceId,projectId=''){
 const url=new URL(sharedProjectLink(target.location.origin,workspaceId,projectId));
 if(target.location.hash===url.hash)return url.hash;
 pushRouteHistory(target,url.hash);
 target.dispatchEvent(new Event('ronda-shared-project-route-synced'));
 return url.hash;
}
