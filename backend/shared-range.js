import {workspaceError} from './workspace-policy.js';
export function parseRange(header,size){
  if(header===undefined)return null;
  const m=/^bytes=(\d*)-(\d*)$/.exec(header);
  const invalid=()=>workspaceError(416,'Rango no disponible.');
  if(!m||!m[1]&&!m[2])throw invalid();
  const first=m[1]?Number(m[1]):null,last=m[2]?Number(m[2]):null;
  if(first!==null&&!Number.isSafeInteger(first)||last!==null&&!Number.isSafeInteger(last))throw invalid();
  const start=first??Math.max(0,size-last),end=first===null?size-1:Math.min(last??size-1,size-1);
  if(start>=size||end<start||first===null&&last===0)throw invalid();
  return {start,end};
}
