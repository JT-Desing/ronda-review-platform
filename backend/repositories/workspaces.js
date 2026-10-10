import { requireWorkspaceAdmin, requireWorkspaceMember, workspaceError, WORKSPACE_SEAT_LIMIT } from '../workspace-policy.js';
export function workspaceRepository(pool) {
  return {
    async list(userId) {
      return (await pool.query('SELECT w.id,w.name,m.role FROM workspaces w JOIN workspace_members m ON m.workspace_id=w.id WHERE m.user_id=$1 ORDER BY w.created_at,w.id', [userId])).rows;
    },
    async read(workspaceId, userId) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Serialize against membership writes so removal cannot race the read.
        const space = (await client.query('SELECT id,name FROM workspaces WHERE id=$1 FOR SHARE', [workspaceId])).rows[0];
        const role = (await client.query('SELECT role FROM workspace_members WHERE workspace_id=$1 AND user_id=$2', [workspaceId, userId])).rows[0]?.role;
        requireWorkspaceMember(role);
        const members = (await client.query('SELECT u.id,u.name,u.email,m.role FROM workspace_members m JOIN users u ON u.id=m.user_id WHERE m.workspace_id=$1 ORDER BY u.name,u.id', [workspaceId])).rows;
        const invitations = role === 'admin' ? (await client.query('SELECT id,email,role,expires_at FROM workspace_invitations WHERE workspace_id=$1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now() ORDER BY created_at', [workspaceId])).rows : [];
        const events = (await client.query('SELECT e.id,e.action,e.details,e.created_at,u.name AS actor FROM workspace_events e LEFT JOIN users u ON u.id=e.actor_id WHERE e.workspace_id=$1 ORDER BY e.created_at DESC,e.id LIMIT 30', [workspaceId])).rows;
        await client.query('COMMIT');
        return { workspace: { ...space, role }, members, invitations, events, seatLimit: WORKSPACE_SEAT_LIMIT };
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    },
    async transaction(workspaceId, actorId, operation, admin = true) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const space = (await client.query('SELECT id FROM workspaces WHERE id=$1 FOR UPDATE', [workspaceId])).rows[0];
        if (!space) throw workspaceError(404, 'Espacio no disponible.');
        if (admin) {
          const role = (await client.query('SELECT role FROM workspace_members WHERE workspace_id=$1 AND user_id=$2', [workspaceId, actorId])).rows[0]?.role;
          requireWorkspaceAdmin(role);
        }
        const result = await operation(client);
        await client.query('COMMIT');
        return result;
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    },
    async locateInvitation(hash) {
      return (await pool.query('SELECT workspace_id FROM workspace_invitations WHERE token_hash=$1', [hash])).rows[0]?.workspace_id;
    },
  };
}
