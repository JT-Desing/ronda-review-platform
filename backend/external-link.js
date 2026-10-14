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
function head(url,address){return new Promise((resolve,reject)=>{
  const req=https.request(url,{method:'HEAD',agent:false,lookup:(_hostname,options,callback)=>callback(null,options.all?[{address,family:4}]:address,4),headers:{'User-Agent':'Ronda-Link-Inspector/1.0','Accept':'image/*,video/*,text/html'}},res=>{res.resume();resolve({status:res.statusCode,mime:res.headers['content-type'],location:res.headers.location});});
  const timer=setTimeout(()=>req.destroy(new Error('timeout')),8000);
  req.on('close',()=>clearTimeout(timer));req.on('error',()=>reject(workspaceError(400,'No se pudo consultar el enlace. Comprueba que sea público y permita consultas.')));req.end();
});}
export async function inspectLink(value,{lookup=resolve4,request=head}={}){
  let url=externalUrl(value);
  for(let count=0;count<4;count++){
    let addresses;try{addresses=isIP(url.hostname)?[url.hostname]:await lookup(url.hostname);}catch{throw workspaceError(400,'No se pudo resolver el dominio.');}
    if(!addresses.length||addresses.some(ip=>!publicIPv4(ip)))throw workspaceError(400,'No se permiten destinos de red privada o reservada.');
    const result=await request(url,addresses[0]);
    if([301,302,303,307,308].includes(result.status)&&result.location){url=externalUrl(new URL(result.location,url).href);continue;}
    if(result.status<200||result.status>=300)throw workspaceError(400,'El enlace requiere acceso o no está disponible.');
    return {url:url.href,type:linkKind(result.mime),mime:result.mime.split(';')[0],name:url.hostname};
  }
  throw workspaceError(400,'El enlace contiene demasiadas redirecciones.');
}
