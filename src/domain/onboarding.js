export const needsWorkspaceChoice=(spaces,personalChoice)=>!personalChoice&&!spaces.some(space=>space.kind==='team');
export const hasPersonalWorkspaceChoice=value=>{
 if(value==='personal')return true;
 try{return JSON.parse(value)==='personal';}catch{return false;}
};
