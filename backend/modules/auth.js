import { token, digest } from '../security.js';
import { reply, body } from '../http.js';
import { authService } from '../auth-service.js';
import { userRepository } from '../repositories/users.js';
import { clientAddress, rateLimiter } from '../rate-limit.js';
import {withPlatformRole} from '../platform-access.js';
import { requestPasswordReset, deliverPasswordReset, completePasswordReset } from '../password-reset.js';
export async function handleAuth({ req, res, path, sessionToken, pool, cookie, mailer, origin }) {
  if (req.method === 'POST' && path === '/api/auth/password-reset/request') {
    const input = await body(req);
    if (!mailer?.enabled) return reply(res, 503, { error: 'La recuperación de contraseña no está disponible en este momento.' });
    const result = await requestPasswordReset({ pool, origin, email: input?.email, requestAddress: clientAddress(req) });
    if (result.delivery) setImmediate(() => { void deliverPasswordReset({ pool, mailer, delivery: result.delivery }); });
    return reply(res, 202, { accepted: true });
  }
  if (req.method === 'POST' && path === '/api/auth/password-reset/complete') {
    const input = await body(req);
    const result = await completePasswordReset({ pool, value: input?.token, password: input?.password });
    return reply(res, 200, result);
  }
  if (req.method === 'POST' && path === '/api/auth/logout') {
    if (sessionToken) await pool.query('DELETE FROM sessions WHERE token_hash=$1', [digest(sessionToken)]);
    return reply(res, 200, { ok: true }, { 'Set-Cookie': cookie('', 0) });
  }
  if (req.method === 'POST' && ['/api/auth/register', '/api/auth/login'].includes(path)) {
    // Per address, not global: a single source must not be able to lock everyone out.
    const allow = rateLimiter(pool), address = digest(clientAddress(req));
    if (!await allow(`auth-ip:${address}`, 30, 300)) return reply(res, 429, { error: 'Demasiados intentos desde esta conexión. Espera 5 minutos.' }, { 'Retry-After': '300' });
    const input = await body(req);
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const password = typeof input.password === 'string' ? input.password : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 12 || password.length > 128) return reply(res, 400, { error: 'Usa un correo válido y una contraseña de 12 a 128 caracteres.' });
    // Scoped to email and address so nobody can lock a victim's account from elsewhere;
    // the per-email cap still bounds distributed guessing.
    if (!await allow(`auth-email-ip:${digest(`${email}\n${address}`)}`, 10, 900) || !await allow(`auth-email:${digest(email)}`, 50, 3600)) return reply(res, 429, { error: 'Demasiados intentos. Espera 15 minutos.' }, { 'Retry-After': '900' });
    const service = authService(userRepository(pool));
    const user = path.endsWith('/register')
      ? await service.register({ email, password, name: input.name })
      : await service.login({ email, password });
    const value = token();
    await pool.query("INSERT INTO sessions VALUES($1,$2,now()+interval '7 days')", [digest(value), user.id]);
    return reply(res, 200, { user: withPlatformRole(user) }, { 'Set-Cookie': cookie(value, 604800) });
  }
  return reply(res, 404, { error: 'Ruta no disponible.' });
}
