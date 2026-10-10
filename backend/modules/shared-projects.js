import { reply, body } from '../http.js';
import { sharedProjectRepository } from '../repositories/shared-projects.js';
import { sharedProjectService } from '../shared-project-service.js';
import { workspaceError } from '../workspace-policy.js';
async function input(req, max) {
  const value = await body(req, max);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw workspaceError(400, 'Se requiere un objeto JSON.');
  return value;
}
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
export async function handleSharedProjects({ req, res, path, account, pool }) {
  if (!account) return reply(res, 401, { error: 'Inicia sesión.' });
  const match = path.match(new RegExp(`^/api/workspaces/(${uuid})/projects(?:/(${uuid})(?:/(comments)(?:/(${uuid}))?)?)?$`));
  if (!match) return reply(res, 404, { error: 'Ruta no disponible.' });
  const [, space, project, comments, comment] = match;
  const service = sharedProjectService(sharedProjectRepository(pool));
  if (!project && req.method === 'GET') return reply(res, 200, await service.list(space, account.id));
  if (!project && req.method === 'POST') return reply(res, 201, await service.create(space, account.id, await input(req)));
  if (project && !comments && req.method === 'GET') return reply(res, 200, await service.read(space, account.id, project));
  if (project && !comments && req.method === 'PATCH') return reply(res, 200, await service.update(space, account.id, project, await input(req)));
  if (comments && !comment && req.method === 'POST') return reply(res, 201, await service.comment(space, account.id, project, await input(req, 16384)));
  if (comment && req.method === 'PATCH') return reply(res, 200, await service.resolve(space, account.id, project, comment, await input(req)));
  return reply(res, 405, { error: 'Método no permitido.' });
}
