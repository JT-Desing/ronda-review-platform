export const teamWorkspaces=spaces=>spaces.filter(space=>space.kind==='team');
export function preferredWorkspace(spaces,selected){
  if(spaces.some(space=>space.id===selected))return selected;
  return spaces.find(space=>space.id==='e9a7c001-67bd-4be9-968d-13e465cd1210')?.id||spaces.find(space=>space.kind==='team')?.id||spaces[0]?.id||'';
}
