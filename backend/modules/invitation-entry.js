import { token, digest, hashPassword } from '../security.js';
import { reply, body } from '../http.js';
import { clientAddress, rateLimiter } from '../rate-limit.js';
import { withPlatformRole } from '../platform-access.js';
import { workspaceError } from '../workspace-policy.js';
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const pending = 'accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now()';

export const isInvitationEntryPath = path => path === '/api/workspace-invitations/preview' || path === '/api/workspace-invitations/enter';

function readToken(value) {
  if (typeof value !== 'string' || !TOKEN.test(value)) throw workspaceError(400, 'Código de invitación inválido.');
  return digest(value);
}

// What the invitation link needs to show before anyone signs in. Only the token
// holder learns the invited address, the team name and whether that address has an account.
async function preview(pool, value) {
  const row = (await pool.query(`SELECT i.email,i.role,i.invitee_name AS name,w.name AS "workspaceName",
      EXISTS(SELECT 1 FROM users u WHERE u.email=i.email) AS "accountExists"
    FROM workspace_invitations i JOIN workspaces w ON w.id=i.workspace_id WHERE i.token_hash=$1 AND ${pending.replace(/(accepted_at|revoked_at|expires_at)/g, 'i.$1')}`, [readToken(value)])).rows[0];
  if (!row) throw workspaceError(404, 'Invitación vencida, revocada o ya utilizada.');
  return { ...row, oneClick: Boolean(row.name) && !row.accountExists };
}

// One-click entry: creates the invited account and its session in one step. It never
// signs in to an existing account, since the inviting admin can also see the code.
async function enter(pool, value) {
  const hash = readToken(value);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const invitation = (await client.query(`SELECT id,workspace_id,email,role,invitee_name AS name FROM workspace_invitations WHERE token_hash=$1 AND ${pending} FOR UPDATE`, [hash])).rows[0];
    if (!invitation) throw workspaceError(404, 'Invitación vencida, revocada o ya utilizada.');
    if (!invitation.name) throw workspaceError(409, 'Esta invitación necesita que completes tus datos para crear la cuenta.');
    if ((await client.query('SELECT 1 FROM users WHERE email=$1', [invitation.email])).rows.length) throw workspaceError(409, 'Ya tienes una cuenta en Ronda. Inicia sesión con ella para aceptar la invitación.');
    // No password: like Google accounts, a random hash; the person can set one with password reset.
    const user = (await client.query('INSERT INTO users(email,name,password_hash) VALUES($1,$2,$3) RETURNING id,email,name', [invitation.email, invitation.name, await hashPassword(token())])).rows[0];
    const personal = (await client.query('INSERT INTO workspaces(name) VALUES($1) RETURNING id', [`Espacio de ${invitation.name}`])).rows[0];
    await client.query("INSERT INTO workspace_members(workspace_id,user_id,role) VALUES($1,$2,'admin')", [personal.id, user.id]);
    await client.query('INSERT INTO workspace_members(workspace_id,user_id,role) VALUES($1,$2,$3)', [invitation.workspace_id, user.id, invitation.role]);
    await client.query('UPDATE workspace_invitations SET accepted_at=now() WHERE id=$1', [invitation.id]);
    await client.query("INSERT INTO workspace_events(workspace_id,actor_id,action,details) VALUES($1,$2,'invitation.accepted',$3)", [invitation.workspace_id, user.id, { userId: user.id, oneClick: true }]);
    const session = token();
    await client.query("INSERT INTO sessions VALUES($1,$2,now()+interval '7 days')", [digest(session), user.id]);
    await client.query('COMMIT');
    return { user, workspaceId: invitation.workspace_id, session };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function handleInvitationEntry({ req, res, path, pool, cookie }) {
  if (!await rateLimiter(pool)(`invitation-entry:${digest(clientAddress(req))}`, 30, 300)) return reply(res, 429, { error: 'Demasiados intentos desde esta conexión. Espera 5 minutos.' }, { 'Retry-After': '300' });
  if (path === '/api/workspace-invitations/preview' && req.method === 'GET') return reply(res, 200, await preview(pool, new URL(req.url, 'http://ronda.invalid').searchParams.get('token')));
  if (path === '/api/workspace-invitations/enter' && req.method === 'POST') {
    const { user, workspaceId, session } = await enter(pool, (await body(req))?.token);
    return reply(res, 200, { user: withPlatformRole(user), workspaceId }, { 'Set-Cookie': cookie(session, 604800) });
  }
  return reply(res, 405, { error: 'Método no permitido.' });
}
