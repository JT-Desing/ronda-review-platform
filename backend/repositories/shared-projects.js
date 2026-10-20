import { requireWorkspaceMember, workspaceError } from '../workspace-policy.js';
import {selectedProjectRole} from '../project-membership.js';
export function sharedProjectRepository(pool,{projectId}={}) {
  return {
    async access(workspaceId, userId, operation, write = false) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const space = (await client.query(`SELECT id,name,kind FROM workspaces WHERE id=$1 FOR ${write ? 'UPDATE' : 'SHARE'}`, [workspaceId])).rows[0];
        if (!space || space.kind !== 'team') throw workspaceError(404, 'Espacio de equipo no disponible.');
        let role = (await client.query('SELECT role FROM workspace_members WHERE workspace_id=$1 AND user_id=$2', [workspaceId, userId])).rows[0]?.role;
        requireWorkspaceMember(role);
        client.rondaActor=userId;client.rondaWorkspaceRole=role;
        if(projectId){const p=(await client.query('SELECT created_by,restricted FROM shared_projects WHERE workspace_id=$1 AND id=$2',[workspaceId,projectId])).rows[0];if(!p)throw workspaceError(404,'Proyecto no disponible.');const member=(await client.query('SELECT role FROM shared_project_members WHERE workspace_id=$1 AND project_id=$2 AND user_id=$3',[workspaceId,projectId,userId])).rows[0];role=selectedProjectRole({workspaceRole:role,creatorId:p.created_by,actor:userId,restricted:p.restricted,memberRole:member?.role});}
        const result = await operation(client, role, space);
        await client.query('COMMIT');
        return result;
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    },
    async project(client, workspaceId, id) {
      const result = (await client.query('SELECT id,workspace_id,name,client,revision,created_at,updated_at,restricted,created_by FROM shared_projects WHERE workspace_id=$1 AND id=$2 AND deleted_at IS NULL', [workspaceId, id])).rows[0];
      if (!result) throw workspaceError(404, 'Proyecto no disponible.');
      if(client.rondaActor){const member=(await client.query('SELECT role FROM shared_project_members WHERE workspace_id=$1 AND project_id=$2 AND user_id=$3',[workspaceId,id,client.rondaActor])).rows[0];selectedProjectRole({workspaceRole:client.rondaWorkspaceRole,creatorId:result.created_by,actor:client.rondaActor,restricted:result.restricted,memberRole:member?.role});}
      return result;
    },
  };
}
