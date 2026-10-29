import { notifyFromEvent } from './notifications.js';
import { projectInput, commentInput, requestId, requireProjectEditor } from './project-policy.js';
import { workspaceError } from './workspace-policy.js';
import {validateProjectMembers,replaceProjectMembers} from './project-membership.js';
const event = async (db, space, actor, action, details) => {
  await db.query('INSERT INTO workspace_events(workspace_id,actor_id,action,details) VALUES($1,$2,$3,$4)', [space, actor, action, details]);
  await notifyFromEvent(db, space, actor, action, details);
};
export function sharedProjectService(repository) {
  return {
    list(space, actor) {
      return repository.access(space, actor, async (db, role, workspace) => {
        const projects = (await db.query("SELECT p.id,p.name,p.client,p.revision,p.updated_at,(SELECT count(*)::integer FROM shared_assets a WHERE a.project_id=p.id AND a.deleted_at IS NULL) AS asset_count,(SELECT count(*)::integer FROM shared_version_comments c WHERE c.project_id=p.id AND c.status='open' AND EXISTS(SELECT 1 FROM shared_assets a WHERE a.id=c.asset_id AND a.deleted_at IS NULL AND a.active_version_id=c.version_id)) AS open_review_comments,(SELECT count(*)::integer FROM shared_project_comments c WHERE c.project_id=p.id AND c.status='open') AS open_comments FROM shared_projects p WHERE p.workspace_id=$1 AND p.deleted_at IS NULL AND (NOT p.restricted OR $3::boolean OR p.created_by=$2 OR EXISTS(SELECT 1 FROM shared_project_members pm WHERE pm.workspace_id=$1 AND pm.project_id=p.id AND pm.user_id=$2)) ORDER BY p.created_at DESC,p.id LIMIT 100", [space,actor,role==='admin'])).rows;
        const deletedProjects=role==='admin'?(await db.query('SELECT id,name,revision,deleted_at FROM shared_projects WHERE workspace_id=$1 AND deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT 100',[space])).rows:[];
        return { workspace: { ...workspace, role }, projects, deletedProjects };
      });
    },
    create(space, actor, input) {
      const fields = projectInput(input), key = requestId(input.requestId);
      return repository.access(space, actor, async (db, role) => {
        requireProjectEditor(role);
        const members=await validateProjectMembers(db,space,input.members);
        const existing = (await db.query('SELECT id,name,client,restricted FROM shared_projects WHERE workspace_id=$1 AND created_by=$2 AND request_id=$3', [space, actor, key])).rows[0];
        if (existing) {
          if (existing.name !== fields.name || existing.client !== fields.client || existing.restricted!==(members!==null)) throw workspaceError(409, 'Esta solicitud ya creó otro proyecto.');
          if(members!==null){const stored=(await db.query('SELECT user_id AS "userId",role FROM shared_project_members WHERE workspace_id=$1 AND project_id=$2 ORDER BY user_id',[space,existing.id])).rows;if(JSON.stringify(stored)!==JSON.stringify(members))throw workspaceError(409,'Esta solicitud ya creó un proyecto con otros participantes.');}
          return { project: await repository.project(db, space, existing.id) };
        }
        const count = (await db.query('SELECT count(*)::integer AS count FROM shared_projects WHERE workspace_id=$1', [space])).rows[0].count;
        if (count >= 100) throw workspaceError(409, 'Límite operativo inicial: 100 proyectos por espacio.');
        const created = (await db.query('INSERT INTO shared_projects(workspace_id,name,client,created_by,request_id) VALUES($1,$2,$3,$4,$5) RETURNING id', [space, fields.name, fields.client, actor, key])).rows[0];
        await replaceProjectMembers(db,space,created.id,members);
        await event(db, space, actor, 'project.created', { projectId: created.id, name: fields.name });
        return { project: await repository.project(db, space, created.id) };
      }, true);
    },
    read(space, actor, id) {
      return repository.access(space, actor, async (db, role, workspace) => {
        const project = await repository.project(db, space, id);
        const comments = (await db.query('SELECT c.id,c.text,c.status,c.revision,c.created_at,c.resolved_at,u.name AS author FROM shared_project_comments c LEFT JOIN users u ON u.id=c.author_id WHERE c.project_id=$1 ORDER BY c.created_at DESC,c.id DESC LIMIT 100', [id])).rows.reverse();
        const membership=(await db.query('SELECT user_id AS "userId",role FROM shared_project_members WHERE workspace_id=$1 AND project_id=$2',[space,id])).rows;
        return { project, comments, membership, canManageMembers:role==='admin'||project.created_by===actor&&role==='editor', workspace: { ...workspace, role } };
      });
    },
    updateMembers(space,actor,id,input){
      if(!Number.isInteger(input.revision)||input.revision<0)throw workspaceError(400,'Revisión inválida.');
      return repository.access(space,actor,async(db,role)=>{
        const project=await repository.project(db,space,id);
        if(role!=='admin'&&!(project.created_by===actor&&role==='editor'))throw workspaceError(403,'Solo el creador o un administrador del equipo puede gestionar participantes.');
        const members=await validateProjectMembers(db,space,input.members);
        if(project.revision!==input.revision)throw workspaceError(409,'El proyecto cambió. Actualiza antes de guardar.');
        await replaceProjectMembers(db,space,id,members);
        await db.query('UPDATE shared_projects SET revision=revision+1,updated_at=now() WHERE workspace_id=$1 AND id=$2',[space,id]);
        await event(db,space,actor,'project.members_updated',{projectId:id,restricted:members!==null,count:members?.length||0});
        return {ok:true};
      },true);
    },
    update(space, actor, id, input) {
      const fields = projectInput(input);
      if (!Number.isInteger(input.revision) || input.revision < 0) throw workspaceError(400, 'Revisión inválida.');
      return repository.access(space, actor, async (db, role) => {
        requireProjectEditor(role); await repository.project(db, space, id);
        const result = await db.query('UPDATE shared_projects SET name=$1,client=$2,revision=revision+1,updated_at=now() WHERE id=$3 AND workspace_id=$4 AND revision=$5 RETURNING id', [fields.name, fields.client, id, space, input.revision]);
        if (!result.rows.length) throw workspaceError(409, 'El proyecto cambió en otra sesión. Actualiza antes de guardar.');
        await event(db, space, actor, 'project.updated', { projectId: id, name: fields.name });
        return { project: await repository.project(db, space, id) };
      }, true);
    },
    trash(space,actor,id,input,restore=false) {
      if(!Number.isInteger(input.revision)||input.revision<0||typeof input.confirmName!=='string')throw workspaceError(400,'Confirma el nombre y la revisión del proyecto.');
      return repository.access(space,actor,async(db,role)=>{
        if(role!=='admin')throw workspaceError(403,'Solo un administrador puede eliminar o restaurar proyectos.');
        const project=(await db.query('SELECT id,name,revision,deleted_at FROM shared_projects WHERE workspace_id=$1 AND id=$2 FOR UPDATE',[space,id])).rows[0];
        if(!project)throw workspaceError(404,'Proyecto no disponible.');
        if(project.revision!==input.revision||project.name!==input.confirmName)throw workspaceError(409,'El proyecto cambió. Actualiza antes de continuar.');
        if(Boolean(project.deleted_at)===!restore)throw workspaceError(409,'El estado del proyecto cambió. Actualiza.');
        await db.query('UPDATE shared_projects SET deleted_at=CASE WHEN $3 THEN NULL ELSE now() END,revision=revision+1,updated_at=now() WHERE workspace_id=$1 AND id=$2',[space,id,restore]);
        await event(db,space,actor,restore?'project.restored':'project.trashed',{projectId:id,name:project.name});
        return {ok:true};
      },true);
    },
    async deletePermanently(space,actor,id,input,storage) {
      if(!Number.isInteger(input.revision)||input.revision<0||typeof input.confirmName!=='string'||input.permanent!==true)throw workspaceError(400,'Confirma el nombre y la eliminación permanente del proyecto.');
      const files=await repository.access(space,actor,async(db,role)=>{
        if(role!=='admin')throw workspaceError(403,'Solo un administrador puede eliminar proyectos definitivamente.');
        const project=(await db.query('SELECT id,name,revision,deleted_at FROM shared_projects WHERE workspace_id=$1 AND id=$2 FOR UPDATE',[space,id])).rows[0];
        if(!project)throw workspaceError(404,'Proyecto no disponible.');
        if(!project.deleted_at)throw workspaceError(409,'Primero mueve el proyecto a la papelera.');
        if(project.revision!==input.revision||project.name!==input.confirmName)throw workspaceError(409,'El proyecto cambió. Actualiza antes de continuar.');
        const uploads=(await db.query('SELECT id FROM shared_media_files WHERE workspace_id=$1 AND project_id=$2',[space,id])).rows;
        await db.query('UPDATE shared_assets SET active_version_id=NULL WHERE workspace_id=$1 AND project_id=$2',[space,id]);
        await db.query('DELETE FROM shared_comment_replies WHERE version_id IN (SELECT id FROM shared_versions WHERE workspace_id=$1 AND project_id=$2)',[space,id]);
        await db.query('DELETE FROM shared_version_comments WHERE workspace_id=$1 AND project_id=$2',[space,id]);
        await db.query('DELETE FROM shared_review_decisions WHERE version_id IN (SELECT id FROM shared_versions WHERE workspace_id=$1 AND project_id=$2)',[space,id]);
        await db.query('DELETE FROM shared_versions WHERE workspace_id=$1 AND project_id=$2',[space,id]);
        await db.query('DELETE FROM shared_assets WHERE workspace_id=$1 AND project_id=$2',[space,id]);
        await db.query('DELETE FROM shared_media_files WHERE workspace_id=$1 AND project_id=$2',[space,id]);
        await event(db,space,actor,'project.permanently_deleted',{projectId:id,name:project.name});
        await db.query('DELETE FROM shared_projects WHERE workspace_id=$1 AND id=$2',[space,id]);
        return uploads.map(file=>file.id);
      },true);
      if(storage?.discardUncommitted){
        const results=await Promise.allSettled(files.map(uploadId=>storage.discardUncommitted({workspaceId:space,uploadId})));
        const failures=results.filter(result=>result.status==='rejected').length;
        if(failures)console.error('shared_project_file_cleanup_failed',failures);
      }
      return {ok:true};
    },
    comment(space, actor, id, input) {
      const text = commentInput(input), key = requestId(input.requestId);
      return repository.access(space, actor, async db => {
        await repository.project(db, space, id);
        const existing = (await db.query('SELECT id,text FROM shared_project_comments WHERE project_id=$1 AND author_id=$2 AND request_id=$3', [id, actor, key])).rows[0];
        if (existing) {
          if (existing.text !== text) throw workspaceError(409, 'Esta solicitud ya publicó otro comentario.');
          return { id: existing.id };
        }
        const count = (await db.query('SELECT count(*)::integer AS count FROM shared_project_comments WHERE project_id=$1', [id])).rows[0].count;
        if (count >= 1000) throw workspaceError(409, 'Límite operativo inicial: 1000 comentarios por proyecto.');
        const comment = (await db.query('INSERT INTO shared_project_comments(project_id,author_id,text,request_id) VALUES($1,$2,$3,$4) RETURNING id', [id, actor, text, key])).rows[0];
        await event(db, space, actor, 'project.comment_created', { projectId: id, commentId: comment.id });
        return comment;
      }, true);
    },
    resolve(space, actor, id, commentId, input) {
      if (!['open', 'resolved'].includes(input.status) || !Number.isInteger(input.revision) || input.revision < 0) throw workspaceError(400, 'Estado o revisión inválidos.');
      return repository.access(space, actor, async (db, role) => {
        requireProjectEditor(role); await repository.project(db, space, id);
        const target = (await db.query('SELECT id FROM shared_project_comments WHERE project_id=$1 AND id=$2', [id, commentId])).rows[0];
        if (!target) throw workspaceError(404, 'Comentario no disponible.');
        const result = await db.query("UPDATE shared_project_comments SET status=$1,revision=revision+1,resolved_at=CASE WHEN $1='resolved' THEN now() ELSE NULL END WHERE id=$2 AND project_id=$3 AND revision=$4 RETURNING id", [input.status, commentId, id, input.revision]);
        if (!result.rows.length) throw workspaceError(409, 'El comentario cambió en otra sesión. Actualiza antes de continuar.');
        await event(db, space, actor, 'project.comment_status', { projectId: id, commentId, status: input.status });
        return { ok: true };
      }, true);
    },
  };
}
