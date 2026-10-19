import { requireWorkspaceAdmin, requireWorkspaceMember, workspaceError, WORKSPACE_SEAT_LIMIT } from '../workspace-policy.js';
export function workspaceRepository(pool) {
  return {
    async createTeam(actorId,input){
      const client=await pool.connect();
      try{
        await client.query('BEGIN');await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[actorId]);
        const existing=(await client.query('SELECT id,name,kind FROM workspaces WHERE created_by=$1 AND request_id=$2 FOR SHARE',[actorId,input.requestId])).rows[0];
        if(existing){
          const role=(await client.query('SELECT role FROM workspace_members WHERE workspace_id=$1 AND user_id=$2',[existing.id,actorId])).rows[0]?.role;
          requireWorkspaceMember(role);
          if(existing.name!==input.name)throw workspaceError(409,'Esta solicitud ya creó otro equipo.');
          await client.query('COMMIT');return {workspace:{...existing,role}};
        }
        const count=Number((await client.query("SELECT count(*) FROM workspaces WHERE created_by=$1 AND kind='team'",[actorId])).rows[0].count);
        if(count>=20)throw workspaceError(409,'Límite inicial: 20 equipos creados por cuenta.');
        const workspace=(await client.query("INSERT INTO workspaces(name,kind,created_by,request_id) VALUES($1,'team',$2,$3) RETURNING id,name,kind",[input.name,actorId,input.requestId])).rows[0];
        await client.query("INSERT INTO workspace_members(workspace_id,user_id,role) VALUES($1,$2,'admin')",[workspace.id,actorId]);
        await client.query("INSERT INTO workspace_events(workspace_id,actor_id,action,details) VALUES($1,$2,'workspace.created',$3)",[workspace.id,actorId,{name:input.name}]);
        await client.query('COMMIT');return {workspace:{...workspace,role:'admin'}};
      }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
    },
    async list(userId) {
      return (await pool.query('SELECT w.id,w.name,w.kind,m.role FROM workspaces w JOIN workspace_members m ON m.workspace_id=w.id WHERE m.user_id=$1 ORDER BY w.created_at,w.id', [userId])).rows;
    },
    async read(workspaceId, userId) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Serialize against membership writes so removal cannot race the read.
        const space = (await client.query("SELECT id,name,kind FROM workspaces WHERE id=$1 FOR SHARE", [workspaceId])).rows[0];
        if (!space || space.kind !== 'team') throw workspaceError(404, 'Espacio de equipo no disponible.');
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
        const space = (await client.query('SELECT id,kind FROM workspaces WHERE id=$1 FOR UPDATE', [workspaceId])).rows[0];
        if (!space || space.kind !== 'team') throw workspaceError(404, 'Espacio de equipo no disponible.');
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
