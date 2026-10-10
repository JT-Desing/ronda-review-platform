import { requireWorkspaceMember, workspaceError } from '../workspace-policy.js';
export function sharedProjectRepository(pool) {
  return {
    async access(workspaceId, userId, operation, write = false) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const space = (await client.query(`SELECT id,name FROM workspaces WHERE id=$1 FOR ${write ? 'UPDATE' : 'SHARE'}`, [workspaceId])).rows[0];
        const role = (await client.query('SELECT role FROM workspace_members WHERE workspace_id=$1 AND user_id=$2', [workspaceId, userId])).rows[0]?.role;
        requireWorkspaceMember(role);
        const result = await operation(client, role, space);
        await client.query('COMMIT');
        return result;
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    },
    async project(client, workspaceId, id) {
      const result = (await client.query('SELECT id,workspace_id,name,client,revision,created_at,updated_at FROM shared_projects WHERE workspace_id=$1 AND id=$2', [workspaceId, id])).rows[0];
      if (!result) throw workspaceError(404, 'Proyecto no disponible.');
      return result;
    },
  };
}
