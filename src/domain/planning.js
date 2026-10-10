export function dayKey(value,timeZone='America/Bogota') {
  if(value===null||value===undefined||value==='')return null;
  const date=new Date(value);if(!Number.isFinite(date.getTime()))return null;
  return new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
export function mentionedMembers(text,members) {
  const source=String(text||'').toLocaleLowerCase();
  return Object.values(members||{}).filter(m=>{const name=String(m.name||'').trim().toLocaleLowerCase();if(!name)return false;const token=`@${name}`,start=source.indexOf(token);if(start<0)return false;const next=source[start+token.length];return !next||/[\s.,!?;:()]/.test(next)}).map(m=>m.id);
}
export function planningComments(state,{project='',person='',status='all',timeZone='America/Bogota'}={}) {
  return Object.values(state.comments||{}).map(c=>({...c,planningProjectId:state.versions?.[c.versionId]?.projectId||c.projectId,day:dayKey(c.createdAt,timeZone),mentionIds:[...new Set([...(c.mentionIds||[]),...mentionedMembers(c.text,state.members)])]})).filter(c=>(!project||c.planningProjectId===project)&&(!person||c.authorId===person||c.assigneeId===person||c.mentionIds.includes(person))&&(status==='all'||c.status===status)).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
}
export function heatLevel(count,max) {return !count?0:Math.max(1,Math.min(4,Math.ceil(count/Math.max(1,max)*4)))}
