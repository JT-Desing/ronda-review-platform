import {versionsForAsset} from './asset-versions.js';
export function trashAsset(state,{id,projectId},removedAt){
  const index=(state.assets||[]).findIndex(a=>a.id===id&&a.projectId===projectId);
  if(index<0)return state;
  const asset=state.assets[index],assets=state.assets.filter(a=>a.id!==id);
  const ids=new Set(versionsForAsset(state,id).map(v=>v.id));
  const project=state.projects[projectId];
  let projects=state.projects;
  if(project&&(ids.has(project.activeVersionId)||!assets.some(a=>a.projectId===projectId))){
    const next=assets.find(a=>a.projectId===projectId);
    projects={...projects,[projectId]:{...project,activeVersionId:next?(next.activeVersionId||versionsForAsset(state,next.id).at(-1)?.id||null):null}};
  }
  return {...state,assets,projects,trashedAssets:{...state.trashedAssets,[id]:{asset,index,removedAt}}};
}
export function restoreAsset(state,{id,projectId}){
  const item=state.trashedAssets?.[id];
  if(!item||item.asset.projectId!==projectId||!state.projects[projectId]||(state.assets||[]).some(a=>a.id===id))return state;
  const assets=[...(state.assets||[])];assets.splice(Math.min(item.index,assets.length),0,item.asset);
  const trashedAssets={...state.trashedAssets};delete trashedAssets[id];
  const project=state.projects[projectId];
  return {...state,assets,trashedAssets,projects:{...state.projects,[projectId]:{...project,activeVersionId:project.activeVersionId||item.asset.activeVersionId||versionsForAsset(state,id).at(-1)?.id||null}}};
}
