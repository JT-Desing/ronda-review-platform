export const teamWorkspaces=spaces=>spaces.filter(space=>space.kind==='team');
const workspacePreferenceKey=accountId=>accountId?`ronda-active-team:${accountId}`:'';
export function readPreferredTeam(storage,accountId){const key=workspacePreferenceKey(accountId);if(!key)return '';try{return storage.getItem(key)||'';}catch{return '';}}
export function rememberPreferredTeam(storage,accountId,workspaceId){const key=workspacePreferenceKey(accountId);if(!key||!workspaceId)return;try{storage.setItem(key,workspaceId);}catch{/* Workspace preference is optional when browser storage is unavailable. */}}
export function forgetPreferredTeam(storage,accountId){const key=workspacePreferenceKey(accountId);if(!key)return;try{storage.removeItem(key);}catch{/* A stale preference must never prevent opening the team list. */}}
export function preferredWorkspace(spaces,selected){
  if(spaces.some(space=>space.id===selected))return selected;
  return spaces.find(space=>space.id==='e9a7c001-67bd-4be9-968d-13e465cd1210')?.id||spaces.find(space=>space.kind==='team')?.id||spaces[0]?.id||'';
}
