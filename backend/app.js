import { reply } from './http.js';
import { googleEnabled, googleStart, googleCallback } from './google.js';
import { sessionRepository } from './repositories/sessions.js';
import { handleAuth } from './modules/auth.js';
import { handleAccountData } from './modules/account-data.js';
import { handleFiles } from './modules/files.js';
import { handleWorkspaces } from './modules/workspaces.js';
import { handleSharedProjects } from './modules/shared-projects.js';

// Composition root: infrastructure is supplied, no listening or schema mutation here.
export function createApp({ pool, origin, mailer }) {
  if (!origin) throw new Error('APP_ORIGIN is required');
  const sessions = sessionRepository(pool);
  const cookie = (value, maxAge) => `ronda_session=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${origin.startsWith('https:') ? '; Secure' : ''}`;
  return async (req, res) => {
    try {
      const path = req.url?.split('?')[0];
      if (req.method === 'GET' && path === '/api/health') {
        await pool.query('SELECT 1');
        return reply(res, 200, { status: 'ok', storage: 'postgresql', auth: 'email-api', google: googleEnabled });
      }
      if (req.method === 'GET' && path === '/api/auth/google') return await googleStart(pool, res);
      if (req.method === 'GET' && path === '/api/auth/google/callback') return await googleCallback(pool, req, res, cookie);
      if (req.method !== 'GET' && req.headers.origin !== origin) return reply(res, 403, { error: 'Origen no permitido.' });
      const sessionToken = req.headers.cookie?.split(';').map(x => x.trim()).find(x => x.startsWith('ronda_session='))?.slice(14);
      const account = await sessions.findAccount(sessionToken);
      const context = { req, res, path, account, sessionToken, pool, cookie };
      if (/^\/api\/workspaces\/[^/]+\/projects(?:\/|$)/.test(path)) return await handleSharedProjects(context);
      if (path === '/api/workspaces' || path?.startsWith('/api/workspaces/') || path === '/api/workspace-invitations/accept') return await handleWorkspaces(context);
      if (req.method === 'GET' && path === '/api/auth/session') return reply(res, 200, { user: account });
      if (path === '/api/data') return await handleAccountData(context);
      if (/^\/api\/files\/[0-9a-f-]{36}$/.test(path)) return await handleFiles(context);
      if (path?.startsWith('/api/auth/')) return await handleAuth(context);
      return reply(res, 404, { error: 'Ruta no disponible.' });
    } catch (error) {
      console.error('api_error', error.code ?? error.status ?? 'internal');
      if (!res.headersSent) reply(res, error.status ?? 500, { error: error.status ? error.message : 'Servicio temporalmente no disponible.' });
      else res.destroy();
    }
  };
}
