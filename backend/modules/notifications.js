import { reply, body } from '../http.js';
import { listNotifications, markNotificationsRead } from '../notifications.js';

export const isNotificationsPath = path => path === '/api/notifications' || path === '/api/notifications/read';

export async function handleNotifications({ req, res, path, pool, account }) {
  if (!account) return reply(res, 401, { error: 'Inicia sesión.' });
  if (path === '/api/notifications' && req.method === 'GET') return reply(res, 200, await listNotifications(pool, account.id));
  if (path === '/api/notifications/read' && req.method === 'POST') return reply(res, 200, await markNotificationsRead(pool, account.id, await body(req)));
  return reply(res, 405, { error: 'Método no permitido.' });
}
