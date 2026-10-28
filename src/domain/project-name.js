export function renameProject(state, {id, name}) {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100 || !state.projects[id]) return state;
  if (state.projects[id].name === name.trim()) return state;
  return {...state, projects:{...state.projects, [id]:{...state.projects[id], name:name.trim()}}};
}
