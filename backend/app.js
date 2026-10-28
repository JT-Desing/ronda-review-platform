import { reply } from './http.js';
import {withPlatformRole} from './platform-access.js';
import { googleEnabled, googleStart, googleCallback } from './google.js';
import { sessionRepository } from './repositories/sessions.js';
import { handleAuth } from './modules/auth.js';
import { handleAccountData } from './modules/account-data.js';
import { handleFiles } from './modules/files.js';
import { handleWorkspaces } from './modules/workspaces.js';
import { handleSharedProjects } from './modules/shared-projects.js';
import {handleSharedReview,isSharedReviewPath} from './modules/shared-review.js';
import {inspectLink} from './external-link.js';
import {body} from './http.js';

// Composition root: infrastructure is supplied, no listening or schema mutation here.
export function createApp({ pool, origin, mailer, sharedStorage, fileRoot }) {
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
      if(req.method==='POST'&&(path==='/api/links/inspect'||/^\/api\/workspaces\/[^/]+\/projects\/[^/]+\/assets$/.test(path))){
        if(!account)return reply(res,401,{error:'Inicia sesión.'});
        const limit=await pool.query("INSERT INTO auth_attempts(key,attempts) VALUES($1,1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN auth_attempts.window_start<now()-interval '1 minute' THEN 1 ELSE auth_attempts.attempts+1 END,window_start=CASE WHEN auth_attempts.window_start<now()-interval '1 minute' THEN now() ELSE auth_attempts.window_start END RETURNING attempts",['links:'+account.id]);
        if(limit.rows[0].attempts>15)return reply(res,429,{error:'Espera un minuto antes de consultar más enlaces.'});
        if(path==='/api/links/inspect')return reply(res,200,await inspectLink((await body(req))?.url));
      }
      const context = { req, res, path, account, sessionToken, pool, cookie, sharedStorage, fileRoot, mailer, origin };
      if(isSharedReviewPath(path))return await handleSharedReview(context);
      if (/^\/api\/workspaces\/[^/]+\/projects(?:\/|$)/.test(path)) return await handleSharedProjects(context);
      if (path === '/api/workspaces' || path?.startsWith('/api/workspaces/') || path === '/api/workspace-invitations/accept') return await handleWorkspaces(context);
      if (req.method === 'GET' && path === '/api/auth/session') return reply(res, 200, { user: withPlatformRole(account) });
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
