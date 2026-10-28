import {createHash} from 'node:crypto';
import {workspaceError} from './workspace-policy.js';
export function commentAudio(input=[]){
 if(!Array.isArray(input)||input.length>3)throw workspaceError(400,'Máximo 3 audios por comentario.');
 let total=0;
 return input.map(item=>{
  if(!item||typeof item.name!=='string'||!item.name.trim()||item.name.length>180||typeof item.dataUrl!=='string'||item.dataUrl.length>2900000)throw workspaceError(400,'Audio inválido o demasiado grande.');
  const m=item.dataUrl.match(/^data:(audio\/(?:mpeg|mp3|webm|ogg|wav|x-wav|mp4|x-m4a))(?:;codecs=[a-zA-Z0-9.,-]+)?;base64,([A-Za-z0-9+/]+={0,2})$/);
  if(!m)throw workspaceError(400,'Adjunta un MP3, WebM, OGG, WAV o M4A válido.');
  const bytes=Buffer.from(m[2],'base64'),mime=m[1];total+=bytes.length;
  if(!bytes.length||bytes.length>2097152||total>4194304)throw workspaceError(400,'Máximo 2 MB por audio y 4 MB por comentario.');
  const valid=['audio/mpeg','audio/mp3'].includes(mime)?bytes.subarray(0,3).toString()==='ID3'||(bytes[0]===255&&(bytes[1]&224)===224):mime==='audio/webm'?bytes.subarray(0,4).equals(Buffer.from('1a45dfa3','hex')):mime==='audio/ogg'?bytes.subarray(0,4).toString()==='OggS':['audio/wav','audio/x-wav'].includes(mime)?bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WAVE':bytes.subarray(4,8).toString()==='ftyp';
  if(!valid)throw workspaceError(400,'El contenido no coincide con un archivo de audio permitido.');
  return {name:item.name.trim(),mime,bytes,digest:createHash('sha256').update(bytes).digest('hex')};
 });
}
