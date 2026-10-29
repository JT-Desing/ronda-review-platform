import { token, digest, hashPassword } from '../security.js';
import { reply, body } from '../http.js';
import { clientAddress, rateLimiter } from '../rate-limit.js';
import { withPlatformRole } from '../platform-access.js';
import { workspaceError } from '../workspace-policy.js';
import { requirePrivacyAcceptance, withPrivacy, PRIVACY_POLICY_VERSION } from '../privacy.js';
import { requestPasswordReset, deliverPasswordReset } from '../password-reset.js';
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
  // Without a name from the admin, the person types it on the same card.
  return { ...row, oneClick: !row.accountExists };
}

// One-click entry: creates the invited account and its session in one step. It never
// signs in to an existing account, since the inviting admin can also see the code.
async function enter(pool, input) {
  requirePrivacyAcceptance(input);
  const hash = readToken(input?.token);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const invitation = (await client.query(`SELECT id,workspace_id,email,role,invitee_name AS name FROM workspace_invitations WHERE token_hash=$1 AND ${pending} FOR UPDATE`, [hash])).rows[0];
    if (!invitation) throw workspaceError(404, 'Invitación vencida, revocada o ya utilizada.');
    const typed = typeof input?.name === 'string' ? input.name.trim() : '';
    if (typed.length > 100) throw workspaceError(400, 'El nombre puede tener hasta 100 caracteres.');
    invitation.name ||= typed;
    if (!invitation.name) throw workspaceError(400, 'Escribe tu nombre para entrar.');
    if ((await client.query('SELECT 1 FROM users WHERE email=$1', [invitation.email])).rows.length) throw workspaceError(409, 'Ya tienes una cuenta en Ronda. Inicia sesión con ella para aceptar la invitación.');
    // No password: like Google accounts, a random hash; the person can set one with password reset.
    const user = (await client.query('INSERT INTO users(email,name,password_hash,privacy_version,privacy_accepted_at) VALUES($1,$2,$3,$4,now()) RETURNING id,email,name,privacy_version', [invitation.email, invitation.name, await hashPassword(token()), PRIVACY_POLICY_VERSION])).rows[0];
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

// The account starts without a password; this email lets the person choose one for the next sign-in.
async function sendPasswordSetup({ pool, mailer, origin, user }) {
  if (!mailer?.enabled) return;
  const result = await requestPasswordReset({ pool, origin, email: user.email, minimumDelay: false, purpose: 'welcome' });
  if (result.delivery) await deliverPasswordReset({ pool, mailer, delivery: result.delivery });
}

export async function handleInvitationEntry({ req, res, path, pool, cookie, mailer, origin }) {
  if (!await rateLimiter(pool)(`invitation-entry:${digest(clientAddress(req))}`, 30, 300)) return reply(res, 429, { error: 'Demasiados intentos desde esta conexión. Espera 5 minutos.' }, { 'Retry-After': '300' });
  // POST keeps the code out of URLs and access logs.
  if (path === '/api/workspace-invitations/preview' && req.method === 'POST') return reply(res, 200, await preview(pool, (await body(req))?.token));
  if (path === '/api/workspace-invitations/enter' && req.method === 'POST') {
    const { user, workspaceId, session } = await enter(pool, await body(req));
    setImmediate(() => { void sendPasswordSetup({ pool, mailer, origin, user }).catch(() => {}); });
    return reply(res, 200, { user: withPlatformRole(withPrivacy(user)), workspaceId }, { 'Set-Cookie': cookie(session, 604800) });
  }
  return reply(res, 405, { error: 'Método no permitido.' });
}
