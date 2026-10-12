import {mkdir,rename,unlink,stat,open as openFile} from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {join} from 'node:path';
import {Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {workspaceError} from '../workspace-policy.js';
const id='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const pattern=new RegExp(`^${id}/${id}(?:\\.part)?$`);
export function localStorage(root='/data/files/_shared'){
  const path=key=>{if(!pattern.test(key))throw workspaceError(400,'Clave de archivo inválida.');return join(root,...key.split('/'));};
  return {
    async stage({workspaceId,uploadId,stream,maxBytes}){
      const key=`${workspaceId}/${uploadId}.part`,location=path(key);await mkdir(join(root,workspaceId),{recursive:true});
      let size=0;
      const limit=new Transform({transform(chunk,encoding,callback){size+=chunk.length;callback(size>maxBytes?workspaceError(413,'Tamaño de archivo incorrecto.'):null,chunk);}});
      try{await pipeline(stream,limit,createWriteStream(location,{flags:'wx',mode:0o600}));return {key,size};}
      catch(error){await unlink(location).catch(()=>{});throw error;}
    },
    open({key,start,end}){return createReadStream(path(key),{start,end});},
    async prefix(key){const file=await openFile(path(key),'r');try{const bytes=Buffer.alloc(64);const {bytesRead}=await file.read(bytes,0,64,0);return bytes.subarray(0,bytesRead);}finally{await file.close();}},
    async size(key){return (await stat(path(key))).size;},
    async finalize({temporaryKey,key}){if(!temporaryKey.endsWith('.part')||key.endsWith('.part')||temporaryKey!==`${key}.part`)throw workspaceError(400,'Transición inválida.');try{await rename(path(temporaryKey),path(key));}catch(e){if(e.code!=='ENOENT')throw e;await stat(path(key));}},
    async discardTemporary({key}){if(!key.endsWith('.part'))throw workspaceError(400,'Solo se limpian archivos temporales.');await unlink(path(key)).catch(error=>{if(error.code!=='ENOENT')throw error;});},
    // Only invoked after DB locks prove an expired unreferenced upload, never a ready file.
    async discardUncommitted({workspaceId,uploadId}){for(const key of [`${workspaceId}/${uploadId}.part`,`${workspaceId}/${uploadId}`])await unlink(path(key)).catch(e=>{if(e.code!=='ENOENT')throw e;});},
  };
}
