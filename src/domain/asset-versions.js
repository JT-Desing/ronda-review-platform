export function versionsForAsset(state,assetId){
  return Object.values(state.versions).filter(version=>version.assetId===assetId||version.id===`asset-${assetId}-v1`).sort((a,b)=>a.number-b.number);
}
export function resolveAssetVersion(state,asset,versionId=asset.activeVersionId){
  const versions=versionsForAsset(state,asset.id);
  const version=versions.find(item=>item.id===versionId)||versions[0];
  if(!version)return {...asset,fileId:asset.id,identity:asset.id,versionId:`asset-${asset.id}-v1`,versionNumber:1};
  return {...asset,...(version.fileId?{name:version.name,type:version.type,mime:version.mime,size:version.size}:{}),fileId:version.fileId||asset.id,identity:version.fileId||asset.id,versionId:version.id,versionNumber:version.number};
}
export function appendAssetVersion(state,{assetId,fileId,name,type,mime,size},occurredAt){
  const asset=(state.assets||[]).find(item=>item.id===assetId);
  if(!asset||!state.projects[asset.projectId]||typeof fileId!=='string'||!fileId||!name||type!==asset.type)return state;
  // A fresh file is required: never overwrite a historical original.
  if((state.assets||[]).some(item=>item.id===fileId)||Object.values(state.versions).some(version=>version.fileId===fileId))return state;
  const previous=versionsForAsset(state,assetId);
  const number=Math.max(0,...previous.map(version=>version.number))+1;
  const id=`asset-${assetId}-v${number}`;
  const version={id,assetId,projectId:asset.projectId,number,fileId,name,type,mime,size,createdAt:occurredAt,reviewerIds:previous.at(-1)?.reviewerIds||[state.currentUserId],decisions:{}};
  return {...state,versions:{...state.versions,[id]:version},assets:state.assets.map(item=>item.id===assetId?{...item,activeVersionId:id}:item),projects:{...state.projects,[asset.projectId]:{...state.projects[asset.projectId],activeVersionId:id}}};
}
