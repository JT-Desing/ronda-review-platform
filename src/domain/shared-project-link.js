const uuid='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
export function readSharedProjectLink(hash){const match=new RegExp(`^#team/(${uuid})/(${uuid})$`,'i').exec(hash||'');return match?{workspaceId:match[1],projectId:match[2]}:null;}
export function sharedProjectLink(origin,workspaceId,projectId){const hash=`#team/${workspaceId}/${projectId}`;if(!readSharedProjectLink(hash))throw new Error('Proyecto inválido.');return new URL('/',origin).href+hash;}
