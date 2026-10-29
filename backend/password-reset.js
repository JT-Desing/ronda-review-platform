import { randomInt } from 'node:crypto';
import { token, digest, hashPassword } from './security.js';
import { transactionalEmail, rondaEmailLogoAttachment } from './email-template.js';

const invalid = (message, status = 400) => Object.assign(new Error(message), { status });
const validEmail = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const validToken = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);

async function rateLimit(pool, key, interval, maxAttempts, message) {
  const result = await pool.query(`INSERT INTO auth_attempts(key,attempts) VALUES($1,1)
    ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN auth_attempts.window_start<now()-$2::interval THEN 1 ELSE auth_attempts.attempts+1 END,
    window_start=CASE WHEN auth_attempts.window_start<now()-$2::interval THEN now() ELSE auth_attempts.window_start END RETURNING attempts`, [key, interval]);
  if (result.rows[0].attempts > maxAttempts) throw invalid(message, 429);
}

// purpose 'welcome' is the first password of an account created from an invitation:
// same single-use token, a longer life and its own wording.
export async function requestPasswordReset({ pool, origin, email, requestAddress = 'unknown', minimumDelay = true, purpose = 'reset' }) {
  const welcome = purpose === 'welcome';
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!validEmail(normalizedEmail)) throw invalid('Usa un correo válido.');
  await rateLimit(pool, `password-reset-ip:${digest(String(requestAddress))}`, '1 hour', 100, 'Has hecho muchas solicitudes desde esta conexión. Espera antes de volver a intentarlo.');
  await rateLimit(pool, 'password-reset-global', '1 hour', 1000, 'El servicio de recuperación está ocupado. Inténtalo más tarde.');

  const client = await pool.connect();
  let value, tokenHash;
  let user;
  try {
    await client.query('BEGIN');
    await client.query(`WITH stale AS (
      SELECT token_hash FROM password_reset_tokens
      WHERE expires_at<now()-interval '7 days' OR used_at<now()-interval '7 days'
      ORDER BY created_at LIMIT 100
    ) DELETE FROM password_reset_tokens AS tokens USING stale WHERE tokens.token_hash=stale.token_hash`);
    user = (await client.query('SELECT id FROM users WHERE email=$1 FOR UPDATE', [normalizedEmail])).rows[0];
    value = token();
    tokenHash = digest(value);
    await client.query('UPDATE password_reset_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL', [user?.id ?? null]);
    await client.query("INSERT INTO password_reset_tokens(token_hash,user_id,expires_at,used_at) VALUES($1,$2,now()+$3::interval,CASE WHEN $2::uuid IS NULL THEN now() ELSE NULL END)", [tokenHash, user?.id ?? null, welcome ? '3 days' : '30 minutes']);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  if (minimumDelay) await new Promise(resolve => setTimeout(resolve, 120 + randomInt(0, 81)));
  if (!user) return { accepted: true };
  const resetUrl = new URL('/', origin);
  resetUrl.hash = new URLSearchParams({ reset: value }).toString();
  const resetLink=resetUrl.href;
  const message = welcome ? {
    to: normalizedEmail,
    subject: 'Crea tu contraseña de Ronda',
    text: `Ya entraste a Ronda desde tu invitación. Para volver a entrar después, crea tu contraseña con este enlace (vence en 3 días):\n${resetLink}`,
    html:transactionalEmail({
      preheader:'Elige una contraseña para tus próximos ingresos.',
      eyebrow:'Bienvenida a Ronda',title:'Crea tu contraseña',
      paragraphs:['Ya entraste a Ronda desde tu invitación. Para volver a entrar desde otro equipo o cuando se cierre la sesión, elige una contraseña.'],
      actionLabel:'Crear contraseña',actionUrl:resetLink,
      details:['El enlace vence en 3 días y solo puede utilizarse una vez.','Si vence, usa "Olvidé mi contraseña" en la pantalla de inicio.'],
    }),
    attachments:[rondaEmailLogoAttachment],
  } : {
    to: normalizedEmail,
    subject: 'Restablece tu contraseña de Ronda',
    text: `Recibimos una solicitud para cambiar la contraseña de tu cuenta de Ronda.\n\nAbre este enlace en los próximos 30 minutos:\n${resetLink}\n\nSi no solicitaste este cambio, ignora este mensaje.`,
    html:transactionalEmail({
      preheader:'Usa el enlace seguro para elegir una contraseña nueva.',
      eyebrow:'Seguridad de la cuenta',title:'Restablece tu contraseña',
      paragraphs:['Recibimos una solicitud para cambiar la contraseña de tu cuenta de Ronda. Puedes elegir una nueva desde el enlace seguro.'],
      actionLabel:'Crear contraseña nueva',actionUrl:resetLink,
      details:['El enlace vence en 30 minutos y solo puede utilizarse una vez.','Si no solicitaste este cambio, ignora este mensaje. Tu contraseña actual seguirá funcionando.'],
    }),
    attachments:[rondaEmailLogoAttachment],
  };
  return { accepted: true, delivery: { tokenHash, message } };
}

export async function deliverPasswordReset({ pool, mailer, delivery }) {
  try {
    const result = await mailer.send(delivery.message);
    const normalize = item => typeof item === 'string' ? item.toLowerCase() : item?.address?.toLowerCase();
    const to = delivery.message.to.toLowerCase();
    const accepted = Array.isArray(result?.accepted) && result.accepted.some(item => normalize(item) === to);
    const rejected = Array.isArray(result?.rejected) && result.rejected.some(item => normalize(item) === to);
    if (accepted && !rejected) return true;
  } catch {
    // Do not reveal whether the address belongs to an account or log user/token data.
  }
  await pool.query('UPDATE password_reset_tokens SET used_at=now() WHERE token_hash=$1 AND used_at IS NULL', [delivery.tokenHash]).catch(() => {});
  return false;
}

export async function completePasswordReset({ pool, value, password }) {
  if (!validToken(value) || typeof password !== 'string' || password.length < 12 || password.length > 128) {
    throw invalid('El enlace no es válido o venció. Solicita uno nuevo.');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const candidate = (await client.query('SELECT user_id FROM password_reset_tokens WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now()', [digest(value)])).rows[0];
    if (!candidate?.user_id) throw invalid('El enlace no es válido o venció. Solicita uno nuevo.');
    const lockedUser = (await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [candidate.user_id])).rows[0];
    if (!lockedUser) throw invalid('El enlace no es válido o venció. Solicita uno nuevo.');
    const row = (await client.query('SELECT user_id FROM password_reset_tokens WHERE token_hash=$1 AND user_id=$2 AND used_at IS NULL AND expires_at>now() FOR UPDATE', [digest(value), candidate.user_id])).rows[0];
    if (!row) throw invalid('El enlace no es válido o venció. Solicita uno nuevo.');
    const passwordHash = await hashPassword(password);
    await client.query('UPDATE users SET password_hash=$1 WHERE id=$2', [passwordHash, row.user_id]);
    await client.query('UPDATE password_reset_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL', [row.user_id]);
    await client.query('DELETE FROM sessions WHERE user_id=$1', [row.user_id]);
    await client.query('COMMIT');
    return { ok: true };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
