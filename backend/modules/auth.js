import { token, digest } from '../security.js';
import { reply, body } from '../http.js';
import { authService } from '../auth-service.js';
import { userRepository } from '../repositories/users.js';
export async function handleAuth({ req, res, path, sessionToken, pool, cookie }) {
  if (req.method === 'POST' && path === '/api/auth/logout') {
    if (sessionToken) await pool.query('DELETE FROM sessions WHERE token_hash=$1', [digest(sessionToken)]);
    return reply(res, 200, { ok: true }, { 'Set-Cookie': cookie('', 0) });
  }
  if (req.method === 'POST' && ['/api/auth/register', '/api/auth/login'].includes(path)) {
    const globalLimit=await pool.query(`INSERT INTO auth_attempts(key,attempts) VALUES('global-auth',1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN auth_attempts.window_start<now()-interval '1 minute' THEN 1 ELSE auth_attempts.attempts+1 END, window_start=CASE WHEN auth_attempts.window_start<now()-interval '1 minute' THEN now() ELSE auth_attempts.window_start END RETURNING attempts`);
    if(globalLimit.rows[0].attempts>60)return reply(res,429,{error:'Servicio de acceso ocupado; vuelve a intentar en un minuto.'},{'Retry-After':'60'});
    const input = await body(req);
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const password = typeof input.password === 'string' ? input.password : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 12 || password.length > 128) return reply(res, 400, { error: 'Usa un correo válido y una contraseña de 12 a 128 caracteres.' });
    const key = digest(email);
    const limit = await pool.query(`INSERT INTO auth_attempts(key,attempts) VALUES($1,1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN auth_attempts.window_start<now()-interval '15 minutes' THEN 1 ELSE auth_attempts.attempts+1 END, window_start=CASE WHEN auth_attempts.window_start<now()-interval '15 minutes' THEN now() ELSE auth_attempts.window_start END RETURNING attempts`, [key]);
    if (limit.rows[0].attempts > 10) return reply(res, 429, { error: 'Demasiados intentos. Espera 15 minutos.' }, { 'Retry-After': '900' });
    const service = authService(userRepository(pool));
    const user = path.endsWith('/register')
      ? await service.register({ email, password, name: input.name })
      : await service.login({ email, password });
    const value = token();
    await pool.query("INSERT INTO sessions VALUES($1,$2,now()+interval '7 days')", [digest(value), user.id]);
    return reply(res, 200, { user }, { 'Set-Cookie': cookie(value, 604800) });
  }
  return reply(res, 404, { error: 'Ruta no disponible.' });
}
