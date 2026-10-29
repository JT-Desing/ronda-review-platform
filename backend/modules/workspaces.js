import { reply, body } from '../http.js';
import {restrictedWorkspaceAdministration} from '../platform-view-policy.js';
import {requireWorkspaceMember} from '../workspace-policy.js';
import {requireProjectEditor} from '../project-policy.js';
import { workspaceRepository } from '../repositories/workspaces.js';
import { workspaceService } from '../workspace-service.js';
import { sendInvitationMail } from '../invitation-mail.js';
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
async function objectBody(req) {
  const value = await body(req);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Object.assign(new Error('El cuerpo debe ser un objeto JSON.'), { status: 400 });
  return value;
}
export async function handleWorkspaces({ req, res, path, account, pool, mailer, origin }) {
  if (!account) return reply(res, 401, { error: 'Inicia sesión.' });
  if(restrictedWorkspaceAdministration({path,method:req.method,account}))return reply(res,403,{error:'La administración del equipo está reservada al superadministrador.'});
  const repository = workspaceRepository(pool), service = workspaceService(repository);
  const reviewActivity=path.match(new RegExp(`^/api/workspaces/(${uuid})/review-activity$`));
  if(reviewActivity&&req.method==='GET')return reply(res,200,await repository.reviewActivity(reviewActivity[1],account.id));
  const planUsage=path.match(new RegExp(`^/api/workspaces/(${uuid})/plan$`));
  if(planUsage&&req.method==='GET')return reply(res,200,await repository.planUsage(planUsage[1],account.id));
  const candidates=path.match(new RegExp(`^/api/workspaces/(${uuid})/project-candidates$`));
  if(candidates&&req.method==='GET'){
    const space=candidates[1];
    const role=(await pool.query("SELECT m.role FROM workspace_members m JOIN workspaces w ON w.id=m.workspace_id WHERE m.workspace_id=$1 AND m.user_id=$2 AND w.kind='team'",[space,account.id])).rows[0]?.role;
    requireWorkspaceMember(role);requireProjectEditor(role);
    const members=(await pool.query('SELECT u.id,u.name,m.role FROM workspace_members m JOIN users u ON u.id=m.user_id WHERE m.workspace_id=$1 ORDER BY u.name,u.id',[space])).rows;
    return reply(res,200,{members});
  }
  if (path === '/api/workspaces' && req.method === 'GET') return reply(res, 200, { workspaces: await repository.list(account.id) });
  if (path === '/api/workspaces' && req.method === 'POST') return reply(res, 201, await service.createTeam(account.id,await objectBody(req)));
  if (path === '/api/workspace-invitations/accept' && req.method === 'POST') return reply(res, 200, await service.accept(account, (await objectBody(req)).token));
  const match = path.match(new RegExp(`^/api/workspaces/(${uuid})(?:/(members|invitations)(?:/(${uuid}))?)?$`));
  if (!match) return reply(res, 404, { error: 'Ruta no disponible.' });
  const [, id, kind, target] = match;
  if (!kind && req.method === 'GET') return reply(res, 200, await repository.read(id, account.id));
  if (kind === 'invitations' && !target && req.method === 'POST') {
    const result = await service.invite(id, account.id, await objectBody(req));
    const emailDelivery = await sendInvitationMail({mailer, origin, result});
    return reply(res, 201, {...result, emailDelivery});
  }
  if (kind === 'invitations' && target && req.method === 'DELETE') return reply(res, 200, await service.revoke(id, account.id, target));
  if (kind === 'invitations' && target && req.method === 'PATCH') return reply(res, 200, await service.updateInvitation(id, account.id, target, (await objectBody(req)).role));
  if (kind === 'members' && target && ['PATCH', 'DELETE'].includes(req.method)) return reply(res, 200, await service.updateMember(id, account.id, target, req.method === 'DELETE' ? null : (await objectBody(req)).role));
  return reply(res, 405, { error: 'Método no permitido.' });
}
