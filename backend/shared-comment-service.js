import {commentAudio} from './comment-audio.js';
import {workspaceError} from './workspace-policy.js';
import {commentInput,requestId,UUID_PATTERN} from './project-policy.js';
import {validateAnchor,validateAnnotation,requireReviewAction} from './shared-review-policy.js';
import {recordEvent} from './shared-review-dto.js';
import {isDeepStrictEqual} from 'node:util';
const dto=row=>({id:row.id,versionId:row.version_id,authorId:row.author_id,author:row.author,text:row.text,priority:row.priority,status:row.status,anchor:row.anchor,annotation:row.annotation,revision:row.revision,createdAt:row.created_at});
export function sharedCommentService(repository){
  const version=(db,space,c,lock)=>repository.version(db,space,c.projectId,c.assetId,c.versionId,lock);
  const editable=v=>{if(v.status!=='reviewing')throw workspaceError(409,'La versión aprobada es de solo lectura.');};
  async function target(db,c,id){const row=(await db.query('SELECT * FROM shared_version_comments WHERE version_id=$1 AND id=$2',[c.versionId,id])).rows[0];if(!row)throw workspaceError(404,'Comentario no disponible.');return row;}
  return {
    async listComments(space,actor,c,{cursor}={}){
      let after=null;
      if(cursor){try{if(typeof cursor!=='string'||cursor.length>512)throw 0;after=JSON.parse(Buffer.from(cursor,'base64url'));if(after.versionId!==c.versionId||!UUID_PATTERN.test(after.id)||typeof after.time!=='string'||!/^[0-9T: .+Z-]+$/.test(after.time)||!Number.isFinite(Date.parse(after.time)))throw 0;}catch{throw workspaceError(400,'Cursor inválido.');}}
      return repository.access(space,actor,async db=>{
        await version(db,space,c);
        const rows=(await db.query('SELECT c.*,u.name AS author,c.created_at::text AS cursor_time FROM shared_version_comments c JOIN users u ON u.id=c.author_id WHERE version_id=$1 AND ($2::timestamptz IS NULL OR (c.created_at,c.id)>($2::timestamptz,$3::uuid)) ORDER BY c.created_at,c.id LIMIT 51',[c.versionId,after?.time||null,after?.id||null])).rows;
        const page=rows.slice(0,50),last=page.at(-1);
        const replies=page.length?(await db.query('SELECT r.*,u.name AS author FROM shared_comment_replies r JOIN users u ON u.id=r.author_id WHERE r.version_id=$1 AND r.comment_id=ANY($2::uuid[]) ORDER BY r.created_at,r.id',[c.versionId,page.map(r=>r.id)])).rows:[];
        const audio=page.length?(await db.query('SELECT id,comment_id,name,mime FROM shared_comment_audio WHERE comment_id=ANY($1::uuid[]) ORDER BY ordinal',[page.map(r=>r.id)])).rows:[];
        return {comments:page.map(row=>({...dto(row),attachments:audio.filter(a=>a.comment_id===row.id).map(({id,name,mime})=>({id,name,mime})),replies:replies.filter(r=>r.comment_id===row.id).map(r=>({id:r.id,text:r.text,authorId:r.author_id,author:r.author,createdAt:r.created_at}))})),nextCursor:rows.length>50?Buffer.from(JSON.stringify({versionId:c.versionId,time:last.cursor_time,id:last.id})).toString('base64url'):null};
      });
    },
    async addComment(space,actor,c,input){
      const audio=commentAudio(input.attachments),text=commentInput({...input,text:input.text?.trim()||(audio.length?'Nota de voz':'')}),key=requestId(input.requestId),priority=input.priority??'normal';
      if(!['low','normal','high','blocking'].includes(priority))throw workspaceError(400,'Prioridad inválida.');
      const annotation=validateAnnotation(input.annotation);
      return repository.access(space,actor,async(db,role)=>{
        requireReviewAction(role,'comment');const v=await version(db,space,c,true),anchor=validateAnchor(input.anchor,v.kind);
        const prior=(await db.query('SELECT * FROM shared_version_comments WHERE version_id=$1 AND author_id=$2 AND request_id=$3',[c.versionId,actor,key])).rows[0];
        if(prior){const saved=(await db.query('SELECT name,mime,digest FROM shared_comment_audio WHERE comment_id=$1 ORDER BY ordinal',[prior.id])).rows;if(!isDeepStrictEqual(saved,audio.map(({name,mime,digest})=>({name,mime,digest}))))throw workspaceError(409,'Solicitud usada con otro audio.');if(prior.text!==text||prior.priority!==priority||!isDeepStrictEqual(prior.anchor,anchor)||!isDeepStrictEqual(prior.annotation,annotation))throw workspaceError(409,'Solicitud usada con otro contenido.');return {comment:dto(prior)};}
        editable(v);
        if(audio.length){const used=Number((await db.query('SELECT COALESCE(sum(octet_length(a.bytes)),0) AS size FROM shared_comment_audio a JOIN shared_version_comments c ON c.id=a.comment_id WHERE c.workspace_id=$1',[space])).rows[0].size);if(used+audio.reduce((sum,a)=>sum+a.bytes.length,0)>268435456)throw workspaceError(409,'Se alcanzó el límite de 256 MB de audios de comentarios de este espacio.');}
        const row=(await db.query('INSERT INTO shared_version_comments(workspace_id,project_id,asset_id,version_id,author_id,text,priority,anchor,annotation,request_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',[space,c.projectId,c.assetId,c.versionId,actor,text,priority,anchor,annotation,key])).rows[0];
        for(const [ordinal,a] of audio.entries())await db.query('INSERT INTO shared_comment_audio(comment_id,name,mime,bytes,digest,ordinal) VALUES($1,$2,$3,$4,$5,$6)',[row.id,a.name,a.mime,a.bytes,a.digest,ordinal]);
        await recordEvent(db,space,actor,'review.comment_created',{...c,commentId:row.id});return {comment:dto(row)};
      },true);
    },
    async readAudio(space,actor,c,commentId,audioId){
      return repository.access(space,actor,async db=>{
        await version(db,space,c);await target(db,c,commentId);
        const row=(await db.query('SELECT name,mime,bytes FROM shared_comment_audio WHERE comment_id=$1 AND id=$2',[commentId,audioId])).rows[0];
        if(!row)throw workspaceError(404,'Audio no disponible.');return row;
      });
    },
    async editComment(space,actor,c,id,input){
      const text=commentInput(input);
      return repository.access(space,actor,async db=>{
        editable(await version(db,space,c,true));const row=await target(db,c,id);
        if(row.author_id!==actor)throw workspaceError(403,'Solo el autor puede editar el texto.');
        if(!Number.isInteger(input.revision)||row.revision!==input.revision)throw workspaceError(409,'El comentario cambió. Conserva tu borrador y actualiza.');
        const changed=(await db.query('UPDATE shared_version_comments SET text=$1,revision=revision+1 WHERE id=$2 RETURNING *',[text,id])).rows[0];
        await recordEvent(db,space,actor,'review.comment_edited',{...c,commentId:id});return {comment:dto(changed)};
      },true);
    },
    async setStatus(space,actor,c,id,input){
      if(!['open','resolved'].includes(input.status))throw workspaceError(400,'Estado inválido.');
      return repository.access(space,actor,async(db,role)=>{
        requireReviewAction(role,'resolve');editable(await version(db,space,c,true));const row=await target(db,c,id);
        if(!Number.isInteger(input.revision)||row.revision!==input.revision)throw workspaceError(409,'El comentario cambió. Actualiza.');
        const changed=(await db.query('UPDATE shared_version_comments SET status=$1,revision=revision+1 WHERE id=$2 RETURNING *',[input.status,id])).rows[0];
        await recordEvent(db,space,actor,'review.comment_status',{...c,commentId:id,status:input.status});return {comment:dto(changed)};
      },true);
    },
    async reply(space,actor,c,id,input){
      const text=commentInput(input),key=requestId(input.requestId);
      return repository.access(space,actor,async db=>{
        const v=await version(db,space,c,true);await target(db,c,id);
        const prior=(await db.query('SELECT id,text FROM shared_comment_replies WHERE comment_id=$1 AND author_id=$2 AND request_id=$3',[id,actor,key])).rows[0];
        if(prior){if(prior.text!==text)throw workspaceError(409,'Solicitud usada con otra respuesta.');return {id:prior.id};}
        editable(v);
        const row=(await db.query('INSERT INTO shared_comment_replies(version_id,comment_id,author_id,text,request_id) VALUES($1,$2,$3,$4,$5) RETURNING id',[c.versionId,id,actor,text,key])).rows[0];
        await recordEvent(db,space,actor,'review.reply_created',{...c,commentId:id,replyId:row.id});return row;
      },true);
    },
  };
}
