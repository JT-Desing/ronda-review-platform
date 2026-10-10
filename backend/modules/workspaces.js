import { reply, body } from '../http.js';
import { workspaceRepository } from '../repositories/workspaces.js';
import { workspaceService } from '../workspace-service.js';
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
export async function handleWorkspaces({ req, res, path, account, pool }) {
  if (!account) return reply(res, 401, { error: 'Inicia sesión.' });
  const repository = workspaceRepository(pool), service = workspaceService(repository);
  if (path === '/api/workspaces' && req.method === 'GET') return reply(res, 200, { workspaces: await repository.list(account.id) });
  if (path === '/api/workspace-invitations/accept' && req.method === 'POST') return reply(res, 200, await service.accept(account, (await body(req)).token));
  const match = path.match(new RegExp(`^/api/workspaces/(${uuid})(?:/(members|invitations)(?:/(${uuid}))?)?$`));
  if (!match) return reply(res, 404, { error: 'Ruta no disponible.' });
  const [, id, kind, target] = match;
  if (!kind && req.method === 'GET') return reply(res, 200, await repository.read(id, account.id));
  if (kind === 'invitations' && !target && req.method === 'POST') return reply(res, 201, await service.invite(id, account.id, await body(req)));
  if (kind === 'invitations' && target && req.method === 'DELETE') return reply(res, 200, await service.revoke(id, account.id, target));
  if (kind === 'members' && target && ['PATCH', 'DELETE'].includes(req.method)) return reply(res, 200, await service.updateMember(id, account.id, target, req.method === 'DELETE' ? null : (await body(req)).role));
  return reply(res, 405, { error: 'Método no permitido.' });
}
