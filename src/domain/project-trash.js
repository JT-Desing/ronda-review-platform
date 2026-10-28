export function trashProject(state,{id,confirmName},occurredAt){
 const project=state.projects[id];
 if(!project||project.deletedAt||confirmName!==project.name)return state;
 return {...state,projects:{...state.projects,[id]:{...project,deletedAt:occurredAt}}};
}
export function restoreProject(state,{id}){
 const project=state.projects[id];if(!project?.deletedAt)return state;
 const {deletedAt,...restored}=project;
 return {...state,projects:{...state.projects,[id]:restored}};
}
export function permanentlyDeleteProject(state,{id,confirmName}){
 const project=state.projects[id];if(!project?.deletedAt||confirmName!==project.name)return state;
 const assets=(state.assets||[]).filter(asset=>asset.projectId===id),assetIds=new Set(assets.map(asset=>asset.id));
 const versions=Object.fromEntries(Object.entries(state.versions||{}).filter(([,version])=>version.projectId===id||assetIds.has(version.assetId)));
 const versionIds=new Set(Object.keys(versions));
 const projects={...state.projects};delete projects[id];
 const comments=Object.fromEntries(Object.entries(state.comments||{}).filter(([,comment])=>comment.projectId!==id&&!versionIds.has(comment.versionId)));
 const annotations=Object.fromEntries(Object.entries(state.annotations||{}).filter(([context])=>context!==id&&!context.startsWith(`${id}:`)&&!assetIds.has(context)&&![...assetIds].some(assetId=>context.startsWith(`${assetId}:`))&&!versionIds.has(context)));
 const notifications=Object.fromEntries(Object.entries(state.notifications||{}).filter(([,notification])=>notification.projectId!==id));
 return {...state,projects,assets:(state.assets||[]).filter(asset=>asset.projectId!==id),versions:Object.fromEntries(Object.entries(state.versions||{}).filter(([versionId])=>!versionIds.has(versionId))),comments,annotations,notifications};
}
