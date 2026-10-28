import {randomUUID} from 'node:crypto';
import {workspaceError} from './workspace-policy.js';
import {requestId,UUID_PATTERN} from './project-policy.js';
import {requireReviewAction} from './shared-review-policy.js';
import {parseRange} from './shared-range.js';
import {assetDto,versionDto,recordEvent} from './shared-review-dto.js';
import {inspectLink} from './external-link.js';
const types={'image/png':'image','image/jpeg':'image','image/webp':'image','video/mp4':'video','application/pdf':'pdf'};
const fileTypes={html:'text/html',htm:'text/html',css:'text/css',js:'text/plain',jsx:'text/plain',ts:'text/plain',tsx:'text/plain',json:'application/json',xml:'application/xml',md:'text/plain',txt:'text/plain',csv:'text/csv',zip:'application/zip',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',odt:'application/vnd.oasis.opendocument.text',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',odp:'application/vnd.oasis.opendocument.presentation',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',ods:'application/vnd.oasis.opendocument.spreadsheet'};
const fileExtensions=new Set(Object.keys(fileTypes));
const fileMimes=new Set(['application/octet-stream','application/zip','application/x-zip-compressed','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.oasis.opendocument.text','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.oasis.opendocument.presentation','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.oasis.opendocument.spreadsheet','text/html','application/xhtml+xml','text/css','text/javascript','application/javascript','application/json','application/xml','text/xml','text/plain','text/csv']);
const quota=2147483648;
export function uploadInput(input){
  const extension=typeof input?.name==='string'?input.name.split('.').at(-1)?.toLowerCase():'';
  const providedMime=input?.mime?.toLowerCase();
  const kind=types[providedMime]||(fileExtensions.has(extension)&&fileMimes.has(providedMime)?(['html','htm'].includes(extension)?'html':'file'):null);
  if(!input||typeof input.name!=='string'||!input.name.trim()||input.name.length>255||!kind||!Number.isInteger(input.size)||input.size<1)throw workspaceError(400,'Archivo inválido o tipo no compatible.');
  if(input.size>104857600)throw workspaceError(413,'Cada archivo debe pesar como máximo 100 MB.');
  if(!UUID_PATTERN.test(input.projectId)||input.assetId&&!UUID_PATTERN.test(input.assetId))throw workspaceError(400,'Proyecto o pieza inválidos.');
  return {...input,mime:kind==='file'&&providedMime==='application/octet-stream'?fileTypes[extension]:providedMime,name:input.name.trim(),requestId:requestId(input.requestId),kind};
}
export function mediaSignature(bytes,mime){
  if(mime==='image/png')return bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));
  if(mime==='image/jpeg')return bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(mime==='image/webp')return bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
  if(mime==='application/pdf')return bytes.subarray(0,5).toString()==='%PDF-';
  if(mime==='video/mp4')return bytes.length>=12&&bytes.subarray(4,8).toString()==='ftyp';
  if(mime.startsWith('application/vnd.openxmlformats-officedocument.')||mime.startsWith('application/vnd.oasis.opendocument.')||mime==='application/zip'||mime==='application/x-zip-compressed')return bytes.subarray(0,2).toString()==='PK';
  if(mime==='application/msword'||mime==='application/vnd.ms-powerpoint'||mime==='application/vnd.ms-excel')return bytes.subarray(0,8).equals(Buffer.from('d0cf11e0a1b11ae1','hex'));
  if(mime==='application/octet-stream')return bytes.subarray(0,2).toString()==='PK'||bytes.subarray(0,5).toString()==='%PDF-';
  if(bytes.includes(0))return false;
  try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,Math.min(bytes.length,4096)))!=='';}catch{return false;}
}
export function sharedMediaService(repository,storage,inspect=inspectLink){
  const file=async(db,space,id)=>{
    const row=(await db.query('SELECT * FROM shared_media_files WHERE workspace_id=$1 AND id=$2 FOR UPDATE',[space,id])).rows[0];
    if(!row)throw workspaceError(404,'Archivo no disponible.');await repository.project(db,space,row.project_id);return row;
  };
  return {
    async addLink(space,actor,input){
      if(typeof input.name!=='string'||!input.name.trim()||input.name.length>255)throw workspaceError(400,'Indica un nombre de hasta 255 caracteres.');
      const key=requestId(input.requestId);
      // Authorize and dedupe before any network call, then inspect the URL with
      // no transaction open: a slow host (up to 4 redirects x 8 s) must not hold
      // the workspace lock or a pool connection. The write re-checks both.
      const authorizeAndFind=async(db,role)=>{
        requireReviewAction(role,'upload');await repository.project(db,space,input.projectId);
        const existing=(await db.query('SELECT * FROM shared_assets WHERE workspace_id=$1 AND created_by=$2 AND request_id=$3',[space,actor,key])).rows[0];
        if(existing&&existing.project_id!==input.projectId)throw workspaceError(409,'Solicitud ya usada en otro proyecto.');
        return existing&&{asset:assetDto(existing)};
      };
      const prior=await repository.access(space,actor,authorizeAndFind);
      if(prior)return prior;
      const link=await inspect(input.url);
      return repository.access(space,actor,async(db,role)=>{
        const existing=await authorizeAndFind(db,role);
        if(existing)return existing;
        const asset=(await db.query('INSERT INTO shared_assets(workspace_id,project_id,name,kind,created_by,request_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[space,input.projectId,input.name.trim(),link.type,actor,key])).rows[0];
        const version=(await db.query('INSERT INTO shared_versions(workspace_id,project_id,asset_id,number,external_url,external_mime) VALUES($1,$2,$3,1,$4,$5) RETURNING id',[space,input.projectId,asset.id,link.url,link.mime])).rows[0];
        await db.query('UPDATE shared_assets SET active_version_id=$1 WHERE id=$2',[version.id,asset.id]);
        await recordEvent(db,space,actor,'review.link_created',{projectId:input.projectId,assetId:asset.id,versionId:version.id});
        return {asset:assetDto({...asset,active_version_id:version.id})};
      },true);
    },
    async readVersion(space,actor,c){return repository.access(space,actor,async(db,role)=>{const asset=await repository.asset(db,space,c.projectId,c.assetId);const counts=(await db.query("SELECT count(*) FILTER(WHERE status='open')::integer AS open_comments FROM shared_version_comments WHERE version_id=$1",[asset.active_version_id])).rows[0];return {role,asset:assetDto({...asset,...counts}),version:await versionDto(db,await repository.version(db,space,c.projectId,c.assetId,c.versionId)),members:(await db.query('SELECT u.id,u.name,m.role FROM workspace_members m JOIN users u ON u.id=m.user_id WHERE m.workspace_id=$1 ORDER BY u.name,u.id',[space])).rows};});},
    async listAssets(space,actor,projectId,trashed=false){
      return repository.access(space,actor,async(db,role)=>{await repository.project(db,space,projectId);if(trashed)requireReviewAction(role,'upload');const rows=(await db.query(`SELECT a.*,v.file_id AS preview_file_id,f.size AS preview_size,v.number AS version_number,(SELECT count(*)::integer FROM shared_version_comments c WHERE c.version_id=a.active_version_id AND c.status='open') AS open_comments,(SELECT count(*)::integer FROM shared_review_decisions d WHERE d.version_id=a.active_version_id AND d.active=true) AS reviewer_count,(SELECT count(*)::integer FROM shared_review_decisions d WHERE d.version_id=a.active_version_id AND d.active=true AND d.decision='approved') AS approved_count FROM shared_assets a LEFT JOIN shared_versions v ON v.id=a.active_version_id LEFT JOIN shared_media_files f ON f.id=v.file_id WHERE a.workspace_id=$1 AND a.project_id=$2 AND a.deleted_at IS ${trashed?'NOT NULL':'NULL'} ORDER BY a.sort_order,a.created_at,a.id`,[space,projectId])).rows;return {assets:rows.map(assetDto)};});
    },
    async orderAssets(space,actor,projectId,{order,previousOrder}){
      if(!Array.isArray(order)||!Array.isArray(previousOrder)||order.length>10000||order.some(id=>!UUID_PATTERN.test(id))||new Set(order).size!==order.length)throw workspaceError(400,'Orden inválido.');
      return repository.access(space,actor,async(db,role)=>{
        requireReviewAction(role,'upload');await repository.project(db,space,projectId);
        const rows=(await db.query('SELECT id FROM shared_assets WHERE workspace_id=$1 AND project_id=$2 AND deleted_at IS NULL ORDER BY sort_order,created_at,id FOR UPDATE',[space,projectId])).rows;
        const ids=rows.map(r=>r.id);
        if(JSON.stringify(ids)!==JSON.stringify(previousOrder)||order.length!==ids.length||order.some(id=>!ids.includes(id)))throw workspaceError(409,'La entrega cambió. Actualiza antes de organizar.');
        await db.query('UPDATE shared_assets SET sort_order=-1 WHERE workspace_id=$1 AND project_id=$2 AND deleted_at IS NOT NULL',[space,projectId]);
        for(let index=0;index<order.length;index++)await db.query('UPDATE shared_assets SET sort_order=$1 WHERE workspace_id=$2 AND project_id=$3 AND id=$4',[index,space,projectId,order[index]]);
        await recordEvent(db,space,actor,'review.assets_ordered',{projectId,order});return {ok:true};
      },true);
    },
    async setAssetDeleted(space,actor,projectId,assetId,deleted,{revision}){
      if(!Number.isInteger(revision))throw workspaceError(400,'Revisión inválida.');
      return repository.access(space,actor,async(db,role)=>{
        requireReviewAction(role,'upload');await repository.project(db,space,projectId);
        const row=(await db.query('SELECT * FROM shared_assets WHERE workspace_id=$1 AND project_id=$2 AND id=$3 FOR UPDATE',[space,projectId,assetId])).rows[0];
        if(!row)throw workspaceError(404,'Pieza no disponible.');
        if(row.revision!==revision)throw workspaceError(409,'La pieza cambió. Actualiza antes de continuar.');
        await db.query('UPDATE shared_assets SET deleted_at=CASE WHEN $1 THEN now() ELSE NULL END,revision=revision+1 WHERE id=$2',[deleted,assetId]);
        await recordEvent(db,space,actor,deleted?'review.asset_trashed':'review.asset_restored',{projectId,assetId});return {ok:true};
      },true);
    },
    async trashAssets(space,actor,projectId,{assets}){
      if(!Array.isArray(assets)||assets.length<1||assets.length>100||assets.some(item=>!item||!UUID_PATTERN.test(item.id)||!Number.isInteger(item.revision))||new Set(assets.map(item=>item.id)).size!==assets.length)throw workspaceError(400,'La selección de piezas no es válida.');
      return repository.access(space,actor,async(db,role)=>{
        requireReviewAction(role,'upload');await repository.project(db,space,projectId);
        const ids=assets.map(item=>item.id).sort();
        const rows=(await db.query('SELECT id,revision,deleted_at FROM shared_assets WHERE workspace_id=$1 AND project_id=$2 AND id=ANY($3::uuid[]) ORDER BY id FOR UPDATE',[space,projectId,ids])).rows;
        if(rows.length!==assets.length||rows.some(row=>row.deleted_at))throw workspaceError(404,'Una o más piezas ya no están disponibles. Actualiza la entrega.');
        const revisions=new Map(assets.map(item=>[item.id,item.revision]));
        if(rows.some(row=>row.revision!==revisions.get(row.id)))throw workspaceError(409,'Una o más piezas cambiaron. Actualiza antes de continuar.');
        await db.query('UPDATE shared_assets SET deleted_at=now(),revision=revision+1 WHERE workspace_id=$1 AND project_id=$2 AND id=ANY($3::uuid[])',[space,projectId,ids]);
        for(const assetId of ids)await recordEvent(db,space,actor,'review.asset_trashed',{projectId,assetId});
        return {ok:true,count:ids.length};
      },true);
    },
    async listVersions(space,actor,projectId,assetId){
      return repository.access(space,actor,async db=>{
        const asset=await repository.asset(db,space,projectId,assetId);
        const rows=(await db.query('SELECT id FROM shared_versions WHERE asset_id=$1 ORDER BY number DESC',[assetId])).rows;
        return {asset:assetDto(asset),versions:await Promise.all(rows.map(async r=>versionDto(db,await repository.version(db,space,projectId,assetId,r.id))))};
      });
    },
    async completeUpload(space,actor,id){
      return repository.access(space,actor,async(db,role)=>{
        requireReviewAction(role,'upload');const upload=await file(db,space,id);
        if(upload.created_by!==actor)throw workspaceError(403,'Esta carga pertenece a otro miembro.');
        const prior=(await db.query('SELECT id,asset_id FROM shared_versions WHERE file_id=$1',[id])).rows[0];
        if(prior)return {asset:assetDto(await repository.asset(db,space,upload.project_id,prior.asset_id)),version:await versionDto(db,await repository.version(db,space,upload.project_id,prior.asset_id,prior.id))};
        if(upload.state!=='received'||upload.expires_at<=new Date())throw workspaceError(409,'Primero completa la subida.');
        let asset;
        if(upload.asset_id)asset=await repository.asset(db,space,upload.project_id,upload.asset_id,true);
        else asset=(await db.query('INSERT INTO shared_assets(workspace_id,project_id,name,kind,created_by,request_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[space,upload.project_id,upload.name,upload.kind,actor,upload.request_id])).rows[0];
        const previous=(await db.query('SELECT id,number FROM shared_versions WHERE asset_id=$1 ORDER BY number DESC LIMIT 1',[asset.id])).rows[0];
        const key=`${space}/${id}`;
        // Deterministic key permits retry after filesystem rename but SQL rollback.
        await storage.finalize({temporaryKey:upload.object_key,key});
        await db.query("UPDATE shared_media_files SET state='ready',object_key=$1,asset_id=$2 WHERE id=$3",[key,asset.id,id]);
        const created=(await db.query('INSERT INTO shared_versions(workspace_id,project_id,asset_id,file_id,number) VALUES($1,$2,$3,$4,$5) RETURNING id',[space,upload.project_id,asset.id,id,(previous?.number||0)+1])).rows[0];
        if(previous)await db.query("INSERT INTO shared_review_decisions(version_id,user_id) SELECT $1,d.user_id FROM shared_review_decisions d JOIN workspace_members m ON m.workspace_id=$2 AND m.user_id=d.user_id WHERE d.version_id=$3 AND d.active=true",[created.id,space,previous.id]);
        await db.query('UPDATE shared_assets SET active_version_id=$1,revision=revision+1 WHERE id=$2',[created.id,asset.id]);
        await recordEvent(db,space,actor,'review.version_created',{projectId:upload.project_id,assetId:asset.id,versionId:created.id});
        return {asset:assetDto(await repository.asset(db,space,upload.project_id,asset.id)),version:await versionDto(db,await repository.version(db,space,upload.project_id,asset.id,created.id))};
      },true);
    },
    async setReviewers(space,actor,{projectId,assetId,versionId,reviewerIds,revision}){
      if(!Array.isArray(reviewerIds)||reviewerIds.length>100||new Set(reviewerIds).size!==reviewerIds.length||reviewerIds.some(id=>typeof id!=='string'||!UUID_PATTERN.test(id))||!Number.isInteger(revision))throw workspaceError(400,'Revisores inválidos.');
      return repository.access(space,actor,async(db,role)=>{
        requireReviewAction(role,'assign');const v=await repository.version(db,space,projectId,assetId,versionId,true);
        if(v.revision!==revision)throw workspaceError(409,'La revisión cambió; actualiza los datos.');
        if(v.status==='approved')throw workspaceError(409,'La versión aprobada es de solo lectura.');
        const members=(await db.query('SELECT user_id FROM workspace_members WHERE workspace_id=$1 AND user_id=ANY($2::uuid[])',[space,reviewerIds])).rows;
        if(members.length!==reviewerIds.length)throw workspaceError(400,'Todos los revisores deben pertenecer al espacio.');
        await db.query('UPDATE shared_review_decisions SET active=false WHERE version_id=$1',[versionId]);
        for(const user of reviewerIds)await db.query("INSERT INTO shared_review_decisions(version_id,user_id) VALUES($1,$2) ON CONFLICT(version_id,user_id) DO UPDATE SET active=true,decision='pending',request_id=NULL,decided_at=NULL",[versionId,user]);
        await db.query('UPDATE shared_versions SET revision=revision+1 WHERE id=$1',[versionId]);
        await recordEvent(db,space,actor,'review.reviewers_changed',{versionId,reviewerIds});
        return {version:await versionDto(db,await repository.version(db,space,projectId,assetId,versionId))};
      },true);
    },
    async reserve(space,actor,input){
      const value=uploadInput(input);
      return repository.access(space,actor,async(db,role)=>{
        requireReviewAction(role,'upload');await repository.project(db,space,value.projectId);
        if(value.assetId){const asset=await repository.asset(db,space,value.projectId,value.assetId);if(asset.kind!==value.kind)throw workspaceError(400,'La nueva versión debe conservar el tipo de medio.');}
        const prior=(await db.query('SELECT * FROM shared_media_files WHERE workspace_id=$1 AND created_by=$2 AND request_id=$3',[space,actor,value.requestId])).rows[0];
        if(prior){
          const piece=prior.asset_id?await repository.asset(db,space,prior.project_id,prior.asset_id):null;
          const originalAssetId=piece?.request_id===prior.request_id&&piece?.created_by===actor?null:prior.asset_id;
          if(prior.name!==value.name||prior.mime!==value.mime||Number(prior.size)!==value.size||prior.project_id!==value.projectId||originalAssetId!==(value.assetId||null))throw workspaceError(409,'La solicitud ya pertenece a otra carga.');
          if(prior.state==='ready'||prior.expires_at>new Date()&&prior.state!=='failed')return {uploadId:prior.id};
          if(prior.state==='failed'&&!prior.object_key){
            const occupied=Number((await db.query("SELECT COALESCE(sum(size),0) AS size FROM shared_media_files WHERE workspace_id=$1 AND (state='ready' OR object_key IS NOT NULL OR (state IN ('staging','received') AND expires_at>now()))",[space])).rows[0].size);
            if(occupied+value.size>quota)throw workspaceError(413,'Límite del prototipo: 2 GB por espacio.');
            await db.query("UPDATE shared_media_files SET state='staging',expires_at=now()+interval '1 hour' WHERE id=$1",[prior.id]);return {uploadId:prior.id};
          }
          throw workspaceError(409,'La carga caducó o falló. Inicia otra carga.');
        }
        const used=Number((await db.query("SELECT COALESCE(sum(size),0) AS size FROM shared_media_files WHERE workspace_id=$1 AND (state='ready' OR object_key IS NOT NULL OR (state IN ('staging','received') AND expires_at>now()))",[space])).rows[0].size);
        if(used+value.size>quota)throw workspaceError(413,'Límite del prototipo: 2 GB por espacio.');
        const row=(await db.query('INSERT INTO shared_media_files(workspace_id,project_id,asset_id,created_by,request_id,name,mime,size,kind) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',[space,value.projectId,value.assetId||null,actor,value.requestId,value.name,value.mime,value.size,value.kind])).rows[0];
        return {uploadId:row.id};
      },true);
    },
    async receive(space,actor,id,stream){
      const upload=await repository.access(space,actor,async(db,role)=>{
        requireReviewAction(role,'upload');const row=await file(db,space,id);
        if(row.created_by!==actor)throw workspaceError(403,'Esta carga pertenece a otro miembro.');
        if(['received','ready'].includes(row.state))return {...row,done:true};
        if(row.state!=='staging'||row.expires_at<=new Date())throw workspaceError(409,'Carga no disponible.');
        if(row.object_key)throw workspaceError(409,'La carga está en proceso.');
        await db.query('UPDATE shared_media_files SET object_key=$1 WHERE id=$2',[`${space}/${id}.part`,id]);return row;
      },true);
      if(upload.done){stream.resume?.();return {ok:true};}
      const key=`${space}/${id}.part`;
      try{
        const received=await storage.stage({workspaceId:space,uploadId:id,stream,maxBytes:Number(upload.size)});
        if(received.size!==Number(upload.size))throw workspaceError(400,'Carga incompleta.');
        if(!mediaSignature(await storage.prefix(key),upload.mime))throw workspaceError(415,'Contenido no compatible con el tipo declarado.');
        await repository.access(space,actor,async(db,role)=>{
          requireReviewAction(role,'upload');const row=await file(db,space,id);
          if(row.state!=='staging'||row.expires_at<=new Date())throw workspaceError(409,'Carga caducada.');
          await db.query("UPDATE shared_media_files SET state='received' WHERE id=$1",[id]);
        },true);
        return {ok:true};
      }catch(error){const cleaned=await storage.discardTemporary({key}).then(()=>true).catch(()=>false);await repository.failUpload(space,actor,id,cleaned);throw error;}
    },
    async readFile(space,actor,id,{download=false,range}={}){
      return repository.access(space,actor,async(db,role)=>{
        requireReviewAction(role,download?'download':'read');const row=await file(db,space,id);
        if(row.state!=='ready')throw workspaceError(404,'Archivo no disponible.');
        // Saved media URLs obey the same trash boundary as the review room.
        await repository.asset(db,space,row.project_id,row.asset_id);
        let bounds;try{bounds=parseRange(range,Number(row.size));}catch(error){error.size=Number(row.size);throw error;}
        return {stream:storage.open({key:row.object_key,...bounds}),size:Number(row.size),mime:row.mime,name:row.name,kind:row.kind,range:bounds};
      });
    },
  };
}
