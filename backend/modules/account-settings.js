import { reply, body } from '../http.js';
import { rateLimiter } from '../rate-limit.js';
import { readSettings, updateSettings, changePassword, requestPlanChange } from '../account-settings.js';

const PATHS = new Set(['/api/account/settings', '/api/account/password', '/api/account/plan-request']);
export const isAccountSettingsPath = path => PATHS.has(path);

export async function handleAccountSettings({ req, res, path, account, pool, sessionToken, mailer, origin }) {
  if (!account) return reply(res, 401, { error: 'Inicia sesión.' });
  const allow = rateLimiter(pool);
  if (path === '/api/account/settings' && req.method === 'GET') return reply(res, 200, await readSettings(pool, account.id));
  if (path === '/api/account/settings' && req.method === 'PATCH') return reply(res, 200, await updateSettings(pool, account.id, await body(req)));
  if (path === '/api/account/password' && req.method === 'POST') {
    if (!await allow(`password-change:${account.id}`, 5, 900)) return reply(res, 429, { error: 'Demasiados intentos. Espera unos minutos.' });
    return reply(res, 200, await changePassword(pool, account.id, sessionToken, await body(req)));
  }
  if (path === '/api/account/plan-request' && req.method === 'POST') {
    if (!await allow(`plan-request:${account.id}`, 3, 3600)) return reply(res, 429, { error: 'Ya enviaste varias solicitudes. Te responderemos pronto.' });
    return reply(res, 200, await requestPlanChange({ pool, mailer, origin, account, input: await body(req) }));
  }
  return reply(res, 405, { error: 'Método no permitido.' });
}
