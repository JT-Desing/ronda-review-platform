import https from 'node:https';
import {resolve4} from 'node:dns/promises';
import {isIP} from 'node:net';
import {workspaceError} from './workspace-policy.js';
export function publicIPv4(ip){
  if(isIP(ip)!==4)return false;
  const [a,b,c]=ip.split('.').map(Number);
  return !(a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&(b===168||b===0||b===88&&c===99))||(a===198&&(b===18||b===19||b===51&&c===100))||(a===203&&b===0&&c===113));
}
export function externalUrl(value){
  let url;try{url=new URL(value);}catch{throw workspaceError(400,'Indica una URL HTTPS válida.');}
  if(typeof value!=='string'||value.length>2048||url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443'||!url.hostname.includes('.')||url.hostname.endsWith('.')||/(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(url.hostname)||isIP(url.hostname)&&!publicIPv4(url.hostname)||url.hostname.startsWith('['))throw workspaceError(400,'Solo se permiten enlaces HTTPS públicos, sin credenciales ni puertos especiales.');
  url.hash='';return url;
}
export function linkKind(mime){
  mime=mime?.split(';')[0].trim().toLowerCase();
  if(['image/png','image/jpeg','image/webp','image/gif','image/avif'].includes(mime))return 'image';
  if(['video/mp4','video/webm','video/ogg'].includes(mime))return 'video';
  if(['text/html','application/xhtml+xml'].includes(mime))return 'web';
  throw workspaceError(400,'El enlace no identifica una imagen, video o página web compatible. Usa el enlace directo al contenido.');
}
export function suggestLinkName(url){
  const host=url.hostname;
  const segment=url.pathname.split('/').filter(Boolean).at(-1);
  if(!segment)return host;
  let name;try{name=decodeURIComponent(segment);}catch{name=segment;}
  name=name.replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g,' ').trim();
  return (name||host).slice(0,100);
}
function head(url,address,signal){return new Promise((resolve,reject)=>{
  const req=https.request(url,{method:'HEAD',agent:false,lookup:(_hostname,options,callback)=>callback(null,options.all?[{address,family:4}]:address,4),headers:{'User-Agent':'Ronda-Link-Inspector/1.0','Accept':'image/*,video/*,text/html'}},res=>{res.resume();resolve({status:res.statusCode,mime:res.headers['content-type'],location:res.headers.location});});
  const timer=setTimeout(()=>req.destroy(new Error('timeout')),8000);
  const abort=()=>req.destroy(new Error('aborted'));
  if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
  req.on('close',()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);});req.on('error',()=>reject(workspaceError(400,'No se pudo consultar el enlace. Comprueba que sea público y permita consultas.')));req.end();
});}
async function resolveBounded(hostname,lookup,timeoutMs){
 let timer;
 try{return await Promise.race([lookup(hostname),new Promise((_resolve,reject)=>{timer=setTimeout(()=>reject(new Error('DNS timeout')),timeoutMs);})]);}
 finally{clearTimeout(timer);}
}
export async function inspectLink(value,{lookup=resolve4,request=head,lookupTimeoutMs=5000,totalTimeoutMs=12000}={}){
  let url=externalUrl(value);
  const controller=new AbortController();let timer;
  const deadline=new Promise((_resolve,reject)=>{timer=setTimeout(()=>{controller.abort();reject(workspaceError(400,'La consulta del enlace tardó demasiado. Revisa tu conexión y vuelve a intentarlo.'));},totalTimeoutMs);});
  const inspect=async()=>{
    for(let count=0;count<4;count++){
      let addresses;try{addresses=isIP(url.hostname)?[url.hostname]:await resolveBounded(url.hostname,lookup,lookupTimeoutMs);}catch{throw workspaceError(400,'No se pudo resolver el dominio. Comprueba tu conexión y vuelve a intentarlo.');}
      if(!addresses.length||addresses.some(ip=>!publicIPv4(ip)))throw workspaceError(400,'No se permiten destinos de red privada o reservada.');
      const result=await request(url,addresses[0],controller.signal);
      if([301,302,303,307,308].includes(result.status)&&result.location){url=externalUrl(new URL(result.location,url).href);continue;}
      if(result.status===401||result.status===403)throw workspaceError(400,'El sitio requiere iniciar sesión o denegó el acceso. Usa un enlace HTTPS público que no requiera cuenta.');
      if(result.status===404)throw workspaceError(400,'No se encontró contenido en ese enlace. Comprueba la URL y vuelve a intentarlo.');
      if(result.status<200||result.status>=300)throw workspaceError(400,'El sitio no está disponible para consultar el enlace. Verifica que sea público e inténtalo de nuevo.');
      return {url:url.href,type:linkKind(result.mime),mime:result.mime.split(';')[0],name:suggestLinkName(url)};
    }
    throw workspaceError(400,'El enlace contiene demasiadas redirecciones.');
  };
  try{return await Promise.race([inspect(),deadline]);}finally{clearTimeout(timer);}
}
