import { hashPassword, verifyPassword, digest } from './security.js';
import { workspaceError } from './workspace-policy.js';
import { PLAN_IDS, TEAM_PLANS } from './plans.js';
import { transactionalEmail, rondaEmailLogoAttachment } from './email-template.js';

export const EMAIL_PREFERENCES = ['all', 'mentions', 'none'];
const SALES_EMAIL = process.env.RONDA_SALES_EMAIL || 'ronda@repolite.link';

export async function readSettings(pool, userId) {
  const row = (await pool.query('SELECT name,email,email_notifications AS "emailNotifications",google_sub IS NOT NULL AS "google" FROM users WHERE id=$1', [userId])).rows[0];
  if (!row) throw workspaceError(404, 'Cuenta no disponible.');
  return row;
}

export async function updateSettings(pool, userId, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw workspaceError(400, 'Datos inválidos.');
  const changes = [], values = [userId];
  if (input.name !== undefined) {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!name || name.length > 100) throw workspaceError(400, 'Escribe un nombre de 1 a 100 caracteres.');
    values.push(name); changes.push(`name=$${values.length}`);
  }
  if (input.emailNotifications !== undefined) {
    if (!EMAIL_PREFERENCES.includes(input.emailNotifications)) throw workspaceError(400, 'Preferencia de correo inválida.');
    values.push(input.emailNotifications); changes.push(`email_notifications=$${values.length}`);
  }
  if (!changes.length) throw workspaceError(400, 'No hay cambios.');
  await pool.query(`UPDATE users SET ${changes.join(',')} WHERE id=$1`, values);
  return readSettings(pool, userId);
}

// Other sessions are closed so a stolen session does not survive a password change.
export async function changePassword(pool, userId, currentSession, input) {
  const next = input?.newPassword;
  if (typeof next !== 'string' || next.length < 12 || next.length > 128) throw workspaceError(400, 'La nueva contraseña debe tener entre 12 y 128 caracteres.');
  const row = (await pool.query('SELECT password_hash FROM users WHERE id=$1', [userId])).rows[0];
  if (!row || typeof input?.currentPassword !== 'string' || !await verifyPassword(input.currentPassword, row.password_hash)) throw workspaceError(403, 'La contraseña actual no coincide. Si no la tienes, usa "¿Olvidaste tu contraseña?" al iniciar sesión.');
  await pool.query('UPDATE users SET password_hash=$2 WHERE id=$1', [userId, await hashPassword(next)]);
  await pool.query('DELETE FROM sessions WHERE user_id=$1 AND token_hash<>$2', [userId, digest(currentSession || '')]);
  return { ok: true };
}

// Until online payment exists, a plan change is a request the platform owner handles.
export async function requestPlanChange({ pool, mailer, origin, account, input }) {
  const plan = input?.plan, note = typeof input?.note === 'string' ? input.note.trim().slice(0, 500) : '';
  if (!PLAN_IDS.includes(plan)) throw workspaceError(400, 'Elige un plan.');
  let space = null;
  if (input.workspaceId !== undefined && input.workspaceId !== null) {
    space = (await pool.query("SELECT w.id,w.name FROM workspaces w JOIN workspace_members m ON m.workspace_id=w.id WHERE w.id::text=$1 AND m.user_id=$2 AND m.role='admin' AND w.kind='team'", [String(input.workspaceId), account.id])).rows[0];
    if (!space) throw workspaceError(403, 'Solo un administrador del equipo puede pedir el cambio.');
    if (!TEAM_PLANS.includes(plan)) throw workspaceError(400, 'Un equipo necesita Estudio, Agencia o A medida.');
  } else if (TEAM_PLANS.includes(plan)) throw workspaceError(400, 'Para un plan de equipo, pídelo desde el equipo.');
  if (!mailer?.enabled) throw workspaceError(503, `El correo no está disponible. Escríbenos a ${SALES_EMAIL}.`);
  const target = space ? `el equipo "${space.name}"` : 'su cuenta personal';
  const lines = [`${account.name} (${account.email}) pide el plan ${plan} para ${target}.`, ...(note ? [`Nota: ${note}`] : [])];
  await mailer.send({ to: SALES_EMAIL, subject: `Solicitud de plan ${plan}`.slice(0, 180),
    text: lines.join('\n'), html: transactionalEmail({ preheader: lines[0], eyebrow: 'Solicitud de plan', title: `Plan ${plan}`, paragraphs: [...lines, `Responde a ${account.email}.`], actionLabel: 'Abrir Planes y empresas', actionUrl: new URL('/#view/platform', origin).href, details: [] }), attachments: [rondaEmailLogoAttachment] });
  return { ok: true };
}
