const allowedPhases=new Set([
  'upload.reserve','upload.transfer','upload.finalize','delivery.refresh',
  'review.preview-fetch','review.preview-buffer','review.image-decode','review.preview-ready',
]);

export function recordPhaseDuration(phase,duration,performanceApi=globalThis.performance){
  if(!allowedPhases.has(phase)||!Number.isFinite(duration)||duration<0||typeof performanceApi?.measure!=='function'||typeof performanceApi?.now!=='function')return false;
  try{const end=performanceApi.now();performanceApi.measure(`ronda.${phase}`,{start:Math.max(0,end-duration),duration});return true;}catch{return false;}
}

export async function measurePhase(phase,operation,performanceApi=globalThis.performance){
  let start=null;
  try{if(typeof performanceApi?.now==='function')start=performanceApi.now();}catch{}
  try{return await operation();}
  finally{try{if(start!==null)recordPhaseDuration(phase,performanceApi.now()-start,performanceApi);}catch{}}
}
