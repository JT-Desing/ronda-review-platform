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
