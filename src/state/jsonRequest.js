import {notifySessionExpired} from './sessionRecovery.js';
export async function jsonRequest(path,{timeoutMs=30000,signal,...options}={},fetcher=fetch){
 if(signal?.aborted)throw new DOMException('Petición cancelada','AbortError');
 const controller=new AbortController();
 let timer,timedOut=false,rejectCancellation;
 const cancelled=new Promise((_resolve,reject)=>{rejectCancellation=reject;});
 const cancel=()=>{controller.abort();rejectCancellation(new DOMException('Petición cancelada','AbortError'));};
 signal?.addEventListener('abort',cancel,{once:true});
 const timeoutError=()=>Object.assign(new Error('La operación tardó demasiado. Revisa tu conexión y vuelve a intentarlo; tus datos no se han borrado.'),{code:'request_timeout'});
 try{
  const expired=new Promise((_resolve,reject)=>{timer=setTimeout(()=>{timedOut=true;controller.abort();reject(timeoutError());},timeoutMs);});
  const operation=(async()=>{
   const response=await fetcher(path,{credentials:'same-origin',...options,signal:controller.signal});
   const result=await response.json().catch(()=>({error:'El servidor no está disponible.'}));
   if(!response.ok)throw Object.assign(new Error(result.error||'No se pudo completar la operación.'),{status:response.status});
   return result;
  })();
  return await Promise.race([operation,expired,cancelled]);
 }catch(error){if(timedOut)throw timeoutError();notifySessionExpired(path,error);throw error;}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}
