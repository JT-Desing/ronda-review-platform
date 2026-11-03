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
import {handlePlatform,isPlatformPath} from './modules/platform.js';
import {handleInvitationEntry,isInvitationEntryPath} from './modules/invitation-entry.js';
import {handleNotifications,isNotificationsPath} from './modules/notifications.js';
import {accountPlan,accountStorageUsed,workspacePlan} from './repositories/plans.js';
import {withPrivacy,requirePrivacyAcceptance,recordPrivacyAcceptance} from './privacy.js';
import {inspectLink} from './external-link.js';
import {body} from './http.js';
import {rateLimiter} from './rate-limit.js';
import {requireActivePlan} from './plans.js';
import {deleteAccount} from './account-deletion.js';
import {handleAccountSettings,isAccountSettingsPath} from './modules/account-settings.js';

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
        if(!await rateLimiter(pool)('links:'+account.id,15,60))return reply(res,429,{error:'Espera un minuto antes de consultar más enlaces.'});
        if(path==='/api/links/inspect')return reply(res,200,await inspectLink((await body(req))?.url));
      }
      const context = { req, res, path, account, sessionToken, pool, cookie, sharedStorage, fileRoot, mailer, origin };
      if(isInvitationEntryPath(path))return await handleInvitationEntry(context);
      if(isNotificationsPath(path))return await handleNotifications(context);
      if(isPlatformPath(path))return await handlePlatform(context);
      if(req.method==='GET'&&path==='/api/account/plan'){
        if(!account)return reply(res,401,{error:'Inicia sesión.'});
        const {plan,status,extraPacks,limits}=await accountPlan(pool,account.id);
        return reply(res,200,{plan,status,extraPacks,limits,usage:{storageBytes:await accountStorageUsed(pool,account.id)}});
      }
      const teamContent=path?.match(/^\/api\/workspaces\/([0-9a-f-]{36})\/(?:projects|media|uploads)(?:\/|$)/);
      if(teamContent&&account&&!['GET','HEAD'].includes(req.method)){
        const plan=await workspacePlan(pool,teamContent[1]);
        if(plan)requireActivePlan(plan.status);
      }
      if(isSharedReviewPath(path))return await handleSharedReview(context);
      if (/^\/api\/workspaces\/[^/]+\/projects(?:\/|$)/.test(path)) return await handleSharedProjects(context);
      if (path === '/api/workspaces' || path?.startsWith('/api/workspaces/') || path === '/api/workspace-invitations/accept') return await handleWorkspaces(context);
      if (req.method === 'GET' && path === '/api/auth/session') return reply(res, 200, { user: withPlatformRole(withPrivacy(account)) });
      if (req.method === 'POST' && path === '/api/account/privacy') {
        if (!account) return reply(res, 401, { error: 'Inicia sesión.' });
        requirePrivacyAcceptance(await body(req));
        await recordPrivacyAcceptance(pool, account.id);
        return reply(res, 200, { privacyAccepted: true });
      }
      if(isAccountSettingsPath(path))return await handleAccountSettings(context);
      if (req.method === 'POST' && path === '/api/account/delete') {
        if (!account) return reply(res, 401, { error: 'Inicia sesión.' });
        const result = await deleteAccount({ pool, account, input: await body(req), fileRoot });
        return reply(res, 200, result, { 'Set-Cookie': cookie('', 0) });
      }
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
