export const assetsForProject=(assets,projectId)=>assets.filter(asset=>asset.projectId===projectId);
export function projectAssetOrder(allAssets,projectId,order){
  const scoped=assetsForProject(allAssets,projectId);
  if(order.length!==scoped.length||new Set(order).size!==scoped.length||order.some(id=>!scoped.some(asset=>asset.id===id)))return allAssets.map(asset=>asset.id);
  let index=0;return allAssets.map(asset=>asset.projectId===projectId?order[index++]:asset.id);
}
