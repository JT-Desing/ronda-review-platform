import {sharedProjectRepository} from './shared-projects.js';
import {workspaceError} from '../workspace-policy.js';
export function sharedReviewRepository(pool){
  const projects=sharedProjectRepository(pool);
  return {...projects,
    failUpload(space,actor,id,cleaned){return pool.query("UPDATE shared_media_files SET state='failed',object_key=CASE WHEN $4 THEN NULL ELSE object_key END WHERE workspace_id=$1 AND created_by=$2 AND id=$3 AND state='staging'",[space,actor,id,cleaned]);},
    async expiredUploads(limit){return (await pool.query("SELECT id,workspace_id FROM shared_media_files f WHERE expires_at<=now() AND (state IN ('staging','received') OR (state='failed' AND object_key IS NOT NULL)) AND NOT EXISTS(SELECT 1 FROM shared_versions v WHERE v.file_id=f.id) ORDER BY expires_at,id LIMIT $1",[limit])).rows;},
    async reconcileUpload(space,id,cleanup){
      const db=await pool.connect();try{
        await db.query('BEGIN');await db.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE',[space]);
        const row=(await db.query("SELECT * FROM shared_media_files f WHERE workspace_id=$1 AND id=$2 AND state<>'ready' AND expires_at<=now() AND NOT EXISTS(SELECT 1 FROM shared_versions v WHERE v.file_id=f.id) FOR UPDATE",[space,id])).rows[0];
        if(!row){await db.query('COMMIT');return false;}
        if(row.object_key)await cleanup(row);
        await db.query("UPDATE shared_media_files SET state='failed',object_key=NULL WHERE id=$1",[id]);await db.query('COMMIT');return true;
      }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
    },
    async asset(db,space,project,id,lock=false){
      const row=(await db.query(`SELECT * FROM shared_assets WHERE workspace_id=$1 AND project_id=$2 AND id=$3 AND deleted_at IS NULL${lock?' FOR UPDATE':''}`,[space,project,id])).rows[0];
      if(!row)throw workspaceError(404,'Pieza no disponible.');
      return row;
    },
    async version(db,space,project,asset,id,lock=false){
      await projects.project(db,space,project);
      const row=(await db.query(`SELECT v.*,COALESCE(f.name,a.name) AS name,COALESCE(f.mime,v.external_mime) AS mime,f.size,a.kind FROM shared_versions v LEFT JOIN shared_media_files f ON f.id=v.file_id JOIN shared_assets a ON a.id=v.asset_id WHERE v.workspace_id=$1 AND v.project_id=$2 AND v.asset_id=$3 AND v.id=$4 AND a.deleted_at IS NULL${lock?' FOR UPDATE OF v':''}`,[space,project,asset,id])).rows[0];
      if(!row)throw workspaceError(404,'Versión no disponible.');
      return row;
    },
  };
}
