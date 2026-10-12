import {sharedProjectRepository} from './shared-projects.js';
import {workspaceError} from '../workspace-policy.js';
export function sharedReviewRepository(pool){
  const projects=sharedProjectRepository(pool);
  return {...projects,
    async asset(db,space,project,id,lock=false){
      const row=(await db.query(`SELECT * FROM shared_assets WHERE workspace_id=$1 AND project_id=$2 AND id=$3${lock?' FOR UPDATE':''}`,[space,project,id])).rows[0];
      if(!row)throw workspaceError(404,'Pieza no disponible.');
      return row;
    },
    async version(db,space,project,asset,id,lock=false){
      const row=(await db.query(`SELECT v.*,f.name,f.mime,f.size,a.kind FROM shared_versions v JOIN shared_media_files f ON f.id=v.file_id JOIN shared_assets a ON a.id=v.asset_id WHERE v.workspace_id=$1 AND v.project_id=$2 AND v.asset_id=$3 AND v.id=$4${lock?' FOR UPDATE OF v':''}`,[space,project,asset,id])).rows[0];
      if(!row)throw workspaceError(404,'Versión no disponible.');
      return row;
    },
  };
}
