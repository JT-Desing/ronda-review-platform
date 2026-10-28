import {demoSession} from './demoSession.js';
import {jsonRequest} from './jsonRequest.js';
import {measurePhase} from './performanceTelemetry.js';
export const projectPath=c=>`/api/workspaces/${c.workspaceId}/projects/${c.projectId}`;
export const versionPath=c=>`${projectPath(c)}/assets/${c.assetId}/versions/${c.versionId}`;
export async function reviewRequest(path,options={}){
  if(demoSession())throw new Error('La revisión compartida real no está disponible en el demo.');
  return jsonRequest(path,options);
}
export const reviewSend=(path,method,input)=>reviewRequest(path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
export async function getRoom(c){
  const [room,feedback]=await Promise.all([reviewRequest(versionPath(c)),reviewRequest(versionPath(c)+'/comments')]);return {...room,...feedback};
}
export const postComment=(c,input)=>reviewSend(versionPath(c)+'/comments','POST',input);
export const postDecision=(c,input)=>reviewSend(versionPath(c)+'/decisions','POST',input);
export async function uploadFile(c,file,requestId,onProgress,signal){
  if(file.size>100*1024*1024)throw Object.assign(new Error('Cada archivo debe pesar como máximo 100 MB.'),{status:413});
  const {uploadId}=await measurePhase('upload.reserve',()=>reviewSend(projectPath(c)+'/uploads','POST',{name:file.name,mime:file.type,size:file.size,assetId:c.assetId,requestId}));
  const path=`/api/workspaces/${c.workspaceId}/uploads/${uploadId}`;
  if(signal?.aborted)throw new DOMException('Carga cancelada','AbortError');
  await measurePhase('upload.transfer',()=>new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();xhr.open('PUT',path+'/content');xhr.withCredentials=true;xhr.timeout=600000;xhr.setRequestHeader('Content-Type',file.type);
    const cancel=()=>xhr.abort();signal?.addEventListener('abort',cancel,{once:true});
    xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress?.(Math.round(e.loaded/e.total*100));};
    xhr.onload=()=>{let result;try{result=JSON.parse(xhr.responseText);}catch{}if(xhr.status>=200&&xhr.status<300)resolve();else reject(Object.assign(new Error(result?.error||'No se pudo subir el archivo.'),{status:xhr.status}));};
    xhr.onerror=()=>reject(new Error('Se interrumpió la conexión.'));xhr.ontimeout=()=>reject(new Error('Se agotó el tiempo de espera de la carga. Revisa la conexión y vuelve a intentarlo; no se publicó una pieza incompleta.'));xhr.onabort=()=>reject(new DOMException('Carga cancelada','AbortError'));xhr.onloadend=()=>signal?.removeEventListener('abort',cancel);xhr.send(file);
  }));
  if(signal?.aborted)throw new DOMException('Carga cancelada','AbortError');
  return measurePhase('upload.finalize',()=>reviewSend(path+'/complete','POST',{}));
}
