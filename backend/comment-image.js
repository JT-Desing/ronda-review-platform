import {createHash} from 'node:crypto';
import {workspaceError} from './workspace-policy.js';

const SIGNATURES={
 'image/jpeg':bytes=>bytes.length>3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes.at(-2)===0xff&&bytes.at(-1)===0xd9,
 'image/png':bytes=>bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')),
 'image/webp':bytes=>bytes.length>=12&&bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP',
};

export function commentImages(input=[]){
 if(!Array.isArray(input)||input.length>3)throw workspaceError(400,'Máximo 3 adjuntos por comentario.');
 let total=0;
 return input.map(item=>{
  if(!item||typeof item.name!=='string'||!item.name.trim()||item.name.length>180||typeof item.dataUrl!=='string'||item.dataUrl.length>2900000)throw workspaceError(400,'Imagen inválida o demasiado grande.');
  const match=item.dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if(!match)throw workspaceError(400,'Adjunta una imagen JPG, PNG o WebP válida.');
  const mime=match[1],bytes=Buffer.from(match[2],'base64');total+=bytes.length;
  if(!bytes.length||bytes.length>2097152||total>4194304)throw workspaceError(400,'Máximo 2 MB por imagen y 4 MB en adjuntos.');
  if(!SIGNATURES[mime](bytes))throw workspaceError(400,'El contenido no coincide con una imagen permitida.');
  return {name:item.name.trim(),mime,bytes,digest:createHash('sha256').update(bytes).digest('hex')};
 });
}
