import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';

export async function readQaStaticFile(path,dist,{read=readFile,mime={}}={}){
  let decoded;
  try{decoded=decodeURIComponent(path);}catch{return {status:400};}
  const requested=decoded==='/'?resolve(dist,'index.html'):resolve(dist,`.${decoded}`);
  if(requested!==dist&&!requested.startsWith(`${dist}${sep}`))return {status:404};
  try{
    const bytes=await read(requested);
    return {status:200,bytes,contentType:mime[extname(requested)]||'application/octet-stream'};
  }catch{
    // Hashed scripts and styles must fail closed. Returning index.html with a
    // JavaScript MIME type turns stale chunk requests into `Unexpected token <`.
    if(decoded.startsWith('/assets/')||extname(decoded))return {status:404};
    try{
      const index=resolve(dist,'index.html');
      const bytes=await read(index);
      return {status:200,bytes,contentType:mime['.html']||'text/html'};
    }catch{return {status:404};}
  }
}
