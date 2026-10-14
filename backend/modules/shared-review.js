import {pipeline} from 'node:stream/promises';
import {reply,body} from '../http.js';
import {sharedReviewRepository} from '../repositories/shared-review.js';
import {sharedMediaService} from '../shared-media-service.js';
import {sharedCommentService} from '../shared-comment-service.js';
import {sharedDecisionService} from '../shared-decision-service.js';
import {localStorage} from '../storage/local.js';
import {workspaceError} from '../workspace-policy.js';
import {UUID_PATTERN} from '../project-policy.js';
export const isSharedReviewPath=path=>/^\/api\/workspaces\/[^/]+\/(?:media|uploads)\//.test(path)||/^\/api\/workspaces\/[^/]+\/projects\/[^/]+\/(?:assets|uploads)(?:\/|$)/.test(path);
export async function handleSharedReview({req,res,path,account,pool,sharedStorage}){
  if(!account)return reply(res,401,{error:'Inicia sesión.'});
  const parts=path.split('/').filter(Boolean),space=parts[2];
  const repository=sharedReviewRepository(pool),media=sharedMediaService(repository,sharedStorage||localStorage());
  const input=async(max=262144)=>{const data=await body(req,max);if(!data||typeof data!=='object'||Array.isArray(data))throw workspaceError(400,'Se requiere un objeto JSON.');return data;};
  const uuid=value=>{if(!UUID_PATTERN.test(value||''))throw workspaceError(404,'Recurso no disponible.');return value;};uuid(space);
  if(parts[3]==='media'&&parts.length===5){
    uuid(parts[4]);if(req.method!=='GET')return reply(res,405,{error:'Método no permitido.'});
    const download=new URL(req.url,'http://local').searchParams.get('download')==='1';
    let file;try{file=await media.readFile(space,account.id,parts[4],{download,range:req.headers.range});}catch(error){if(error.status===416){res.setHeader('Accept-Ranges','bytes');res.setHeader('Content-Range',`bytes */${error.size}`);}throw error;}
    const range=file.range,headers={'Content-Type':file.mime,'Content-Length':range?range.end-range.start+1:file.size,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes','Content-Disposition':`${download?'attachment':'inline'}; filename*=UTF-8''${encodeURIComponent(file.name)}`};
    if(range)headers['Content-Range']=`bytes ${range.start}-${range.end}/${file.size}`;
    res.writeHead(range?206:200,headers);await pipeline(file.stream,res);return;
  }
  if(parts[3]==='uploads'&&parts.length===6){
    const id=uuid(parts[4]);
    if(parts[5]==='content'&&req.method==='PUT')return reply(res,200,await media.receive(space,account.id,id,req));
    if(parts[5]==='complete'&&req.method==='POST'){await input();return reply(res,200,await media.completeUpload(space,account.id,id));}
    return reply(res,405,{error:'Método no permitido.'});
  }
  if(parts[3]!=='projects')return reply(res,404,{error:'Ruta no disponible.'});
  const projectId=uuid(parts[4]);
  if(parts[5]==='assets'&&parts[6]==='order'&&parts.length===7&&req.method==='PUT')return reply(res,200,await media.orderAssets(space,account.id,projectId,await input()));
  if(parts[5]==='assets'&&parts[6]==='trash'&&parts.length===7&&req.method==='GET')return reply(res,200,await media.listAssets(space,account.id,projectId,true));
  if(parts[5]==='assets'&&parts.length===6&&req.method==='POST')return reply(res,201,await media.addLink(space,account.id,{...await input(),projectId}));
  if(parts[5]==='uploads'&&parts.length===6&&req.method==='POST')return reply(res,201,await media.reserve(space,account.id,{...await input(),projectId}));
  if(parts[5]==='assets'&&parts.length===6)return req.method==='GET'?reply(res,200,await media.listAssets(space,account.id,projectId)):reply(res,405,{error:'Método no permitido.'});
  const assetId=uuid(parts[6]);
  if(parts.length===8&&['trash','restore'].includes(parts[7])&&req.method==='POST')return reply(res,200,await media.setAssetDeleted(space,account.id,projectId,assetId,parts[7]==='trash',await input()));
  if(parts[7]==='versions'&&parts.length===8&&req.method==='GET')return reply(res,200,await media.listVersions(space,account.id,projectId,assetId));
  if(parts[7]!=='versions')return reply(res,404,{error:'Ruta no disponible.'});
  const versionId=uuid(parts[8]),context={projectId,assetId,versionId};
  if(parts.length===9&&req.method==='GET')return reply(res,200,await media.readVersion(space,account.id,context));
  if(parts[9]==='reviewers'&&parts.length===10&&req.method==='PUT')return reply(res,200,await media.setReviewers(space,account.id,{...await input(),...context}));
  if(parts[9]==='decisions'&&parts.length===10&&req.method==='POST')return reply(res,200,await sharedDecisionService(repository).decide(space,account.id,context,await input()));
  if(parts[9]==='comments'){
    const comments=sharedCommentService(repository);
    if(parts.length===10&&req.method==='GET')return reply(res,200,await comments.listComments(space,account.id,context,{cursor:new URL(req.url,'http://local').searchParams.get('cursor')}));
    if(parts.length===10&&req.method==='POST')return reply(res,201,await comments.addComment(space,account.id,context,await input(6000000)));
    const id=uuid(parts[10]);
    if(parts.length===13&&parts[11]==='audio'&&req.method==='GET'){const audio=await comments.readAudio(space,account.id,context,id,uuid(parts[12]));res.writeHead(200,{'Content-Type':audio.mime,'Content-Length':audio.bytes.length,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'});res.end(audio.bytes);return;}
    if(parts.length===12&&parts[11]==='text'&&req.method==='PATCH')return reply(res,200,await comments.editComment(space,account.id,context,id,await input()));
    if(parts.length===12&&parts[11]==='status'&&req.method==='PATCH')return reply(res,200,await comments.setStatus(space,account.id,context,id,await input()));
    if(parts.length===12&&parts[11]==='replies'&&req.method==='POST')return reply(res,201,await comments.reply(space,account.id,context,id,await input()));
  }
  return reply(res,405,{error:'Método no permitido.'});
}
