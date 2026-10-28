export function duplicateAssetNamePositions(assets = []) {
  const groups = new Map();

  for (const asset of assets) {
    const name = String(asset?.name ?? '').trim();
    if (!name || asset?.id == null) continue;
    const key = name.normalize('NFKC').toLowerCase();
    const group = groups.get(key) ?? [];
    group.push(asset.id);
    groups.set(key, group);
  }

  const positions = new Map();
  for (const ids of groups.values()) {
    if (ids.length < 2) continue;
    ids.forEach((id, index) => positions.set(id, { index: index + 1, count: ids.length }));
  }

  return positions;
}
