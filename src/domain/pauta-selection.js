const SELECTION_KEY = 'ronda-pauta:selected:v1';
const DESTINATION_PREFIX = 'ronda-pauta:destination:v1:';

function sessionStorageOrNull(getStorage) {
  try { return getStorage(); } catch { return null; }
}

export function readPautaSelection(campaigns = [], getStorage = () => globalThis.sessionStorage) {
  const storage = sessionStorageOrNull(getStorage);
  if (!storage) return null;
  try {
    const selected = storage.getItem(SELECTION_KEY);
    if (selected && campaigns.some(campaign => campaign.id === selected)) return selected;
    if (selected) storage.removeItem(SELECTION_KEY);
  } catch { /* The campaign list remains usable when session storage is restricted. */ }
  return null;
}

export function writePautaSelection(selected, getStorage = () => globalThis.sessionStorage) {
  const storage = sessionStorageOrNull(getStorage);
  if (!storage) return false;
  try {
    if (selected) storage.setItem(SELECTION_KEY, selected);
    else storage.removeItem(SELECTION_KEY);
    return true;
  } catch { /* Selection persistence is best-effort; campaign data remains saved separately. */ return false; }
}

export function readPautaDestination(campaign, getStorage = () => globalThis.sessionStorage) {
  if (!campaign) return 'legacy';
  const storage = sessionStorageOrNull(getStorage);
  if (!storage) return 'legacy';
  const groups = [{id:'legacy'}, ...(campaign.adGroups || [])];
  try {
    const key = DESTINATION_PREFIX + campaign.id;
    const selected = storage.getItem(key);
    if (selected && groups.some(group => group.id === selected)) return selected;
    if (selected) storage.removeItem(key);
  } catch { /* The destination can fall back to the default when session storage is restricted. */ }
  return 'legacy';
}

export function writePautaDestination(campaignId, destination, getStorage = () => globalThis.sessionStorage) {
  if (!campaignId) return false;
  const storage = sessionStorageOrNull(getStorage);
  if (!storage) return false;
  try {
    const key = DESTINATION_PREFIX + campaignId;
    if (destination && destination !== 'legacy') storage.setItem(key, destination);
    else storage.removeItem(key);
    return true;
  } catch { /* Destination persistence is best-effort and scoped to this tab/session. */ return false; }
}
