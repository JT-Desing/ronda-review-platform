import { token, digest } from './security.js';
import { validateRole, protectLastAdmin, workspaceError, WORKSPACE_SEAT_LIMIT } from './workspace-policy.js';
async function event(client, workspaceId, actorId, action, details) {
  await client.query('INSERT INTO workspace_events(workspace_id,actor_id,action,details) VALUES($1,$2,$3,$4)', [workspaceId, actorId, action, details]);
}
export function workspaceService(repository) {
  return {
    async invite(workspaceId, actorId, input) {
      validateRole(input.role);
      const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw workspaceError(400, 'Indica un correo válido.');
      return repository.transaction(workspaceId, actorId, async client => {
        const duplicate = await client.query('SELECT 1 FROM workspace_members m JOIN users u ON u.id=m.user_id WHERE m.workspace_id=$1 AND u.email=$2', [workspaceId, email]);
        if (duplicate.rows.length) throw workspaceError(409, 'Esta persona ya pertenece al equipo.');
        const pending = await client.query('SELECT 1 FROM workspace_invitations WHERE workspace_id=$1 AND email=$2 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now()', [workspaceId, email]);
        if (pending.rows.length) throw workspaceError(409, 'Ya existe una invitación pendiente; revócala para generar otra.');
        const count = await client.query('SELECT (SELECT count(*) FROM workspace_members WHERE workspace_id=$1)+(SELECT count(*) FROM workspace_invitations WHERE workspace_id=$1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now()) AS count', [workspaceId]);
        if (Number(count.rows[0].count) >= WORKSPACE_SEAT_LIMIT) throw workspaceError(409, 'Límite operativo inicial: 20 miembros e invitaciones por espacio.');
        const value = token();
        const invitation = (await client.query("INSERT INTO workspace_invitations(workspace_id,email,role,token_hash,created_by,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '7 days') RETURNING id,email,role,expires_at", [workspaceId, email, input.role, digest(value), actorId])).rows[0];
        await event(client, workspaceId, actorId, 'invitation.created', { email, role: input.role });
        return { invitation, token: value }; // Raw token returned once; never stored or logged.
      });
    },
    async accept(account, value) {
      if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value)) throw workspaceError(400, 'Código de invitación inválido.');
      const hash = digest(value);
      const workspaceId = await repository.locateInvitation(hash);
      if (!workspaceId) throw workspaceError(404, 'Invitación no disponible.');
      return repository.transaction(workspaceId, account.id, async client => {
        const invitation = (await client.query('SELECT id,email,role FROM workspace_invitations WHERE token_hash=$1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now() FOR UPDATE', [hash])).rows[0];
        if (!invitation) throw workspaceError(404, 'Invitación vencida, revocada o ya utilizada.');
        if (invitation.email !== account.email.toLowerCase()) throw workspaceError(403, 'Inicia sesión con el correo al que se dirigió esta invitación.');
        await client.query('INSERT INTO workspace_members(workspace_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [workspaceId, account.id, invitation.role]);
        await client.query('UPDATE workspace_invitations SET accepted_at=now() WHERE id=$1', [invitation.id]);
        await event(client, workspaceId, account.id, 'invitation.accepted', { userId: account.id });
        return { workspaceId };
      }, false);
    },
    async updateMember(workspaceId, actorId, memberId, role) {
      if (role !== null) validateRole(role);
      return repository.transaction(workspaceId, actorId, async client => {
        const members = (await client.query('SELECT user_id,role FROM workspace_members WHERE workspace_id=$1', [workspaceId])).rows;
        const member = members.find(item => item.user_id === memberId);
        if (!member) throw workspaceError(404, 'Miembro no disponible.');
        protectLastAdmin(member.role, role, members.filter(item => item.role === 'admin').length);
        if (role === null) await client.query('DELETE FROM workspace_members WHERE workspace_id=$1 AND user_id=$2', [workspaceId, memberId]);
        else await client.query('UPDATE workspace_members SET role=$3 WHERE workspace_id=$1 AND user_id=$2', [workspaceId, memberId, role]);
        await event(client, workspaceId, actorId, role === null ? 'member.removed' : 'member.role_changed', { userId: memberId, before: member.role, after: role });
        return { ok: true };
      });
    },
    async revoke(workspaceId, actorId, id) {
      return repository.transaction(workspaceId, actorId, async client => {
        const result = await client.query('UPDATE workspace_invitations SET revoked_at=now() WHERE id=$1 AND workspace_id=$2 AND accepted_at IS NULL AND revoked_at IS NULL RETURNING id', [id, workspaceId]);
        if (!result.rows.length) throw workspaceError(404, 'Invitación no disponible.');
        await event(client, workspaceId, actorId, 'invitation.revoked', { invitationId: id });
        return { ok: true };
      });
    },
  };
}
