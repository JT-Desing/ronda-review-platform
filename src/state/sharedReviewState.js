const key=c=>[c.workspaceId,c.projectId,c.assetId,c.versionId].join(':');
export const acceptResponse=(current,response,data)=>key(current)===key(response)?data:null;
export const applyRoomError=(state,error)=>({...state,error:error.message,room:[401,403,404].includes(error.status)?null:state.room});
export const pickVersion=(versions,selected,active)=>versions.some(v=>v.id===selected)?selected:versions.some(v=>v.id===active)?active:versions[0]?.id||'';
export function createReviewGuard(){
  let dirty=false,busy=false,generation=0;
  return {update(state){dirty=state.dirty;busy=state.busy;},canRefresh(){return !dirty&&!busy;},begin(){return ++generation;},isCurrent(token){return token===generation;}};
}
export const canLeaveSharedReview=({dirty,busy},confirm)=>!busy&&(!dirty||confirm());
export function sharedAnnotation(mark){
  if(!mark)return null;
  const points=['arrow','square'].includes(mark.tool)?[mark.points[0],mark.points.at(-1)]:mark.points.slice(0,5000);
  return {tool:mark.tool,color:mark.color,points:points.map(({x,y})=>({x,y})),...(mark.tool==='type'?{text:mark.text}: {})};
}
