export function normalizeSocialPreview(config, assets, projectId) {
  const eligible = new Set(assets.filter(a => a.projectId === projectId && ['image','video'].includes(a.type)).map(a => a.id));
  return { assetIds: [...new Set(Array.isArray(config.assetIds) ? config.assetIds : [])].filter(id => eligible.has(id)).slice(0,20), account: String(config.account || '').trim().slice(0,80), caption: String(config.caption || '').slice(0,2200), ratio: ['1/1','4/5','16/9'].includes(config.ratio) ? config.ratio : '4/5' };
}
