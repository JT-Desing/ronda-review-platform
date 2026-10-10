import { reply, body } from '../http.js';
export async function handleAccountData({ req, res, path, account, pool }) {
  if (path === '/api/data') {
    if (!account) return reply(res, 401, { error: 'Inicia sesión para guardar tus datos.' });
    await pool.query('INSERT INTO account_data(user_id) VALUES($1) ON CONFLICT DO NOTHING', [account.id]);
    if (req.method === 'GET') {
      const result = await pool.query('SELECT data,revision FROM account_data WHERE user_id=$1', [account.id]);
      return reply(res, 200, result.rows[0]);
    }
    if (req.method === 'PUT') {
      const input = await body(req, 20 * 1024 * 1024);
      const allowed = ['ronda-state:v1', 'ronda-pauta:v1', 'ronda-activity-read'];
      if (!Number.isInteger(input.revision) || !input.data || Array.isArray(input.data) || typeof input.data !== 'object' || Object.entries(input.data).some(([key, value]) => !allowed.includes(key) || typeof value !== 'string')) return reply(res, 400, { error: 'Datos inválidos.' });
      for (const value of Object.values(input.data)) { try { JSON.parse(value); } catch { return reply(res, 400, { error: 'Contenido inválido.' }); } }
      const result = await pool.query('UPDATE account_data SET data=$1, revision=revision+1, updated_at=now() WHERE user_id=$2 AND revision=$3 RETURNING revision', [input.data, account.id, input.revision]);
      if (!result.rows.length) return reply(res, 409, { error: 'Hay cambios de otra sesión. Recarga antes de continuar; tus cambios locales se conservan.' });
      return reply(res, 200, { revision: result.rows[0].revision });
    }
  }
  return reply(res, 405, { error: 'Método no permitido.' }, { Allow: 'GET, PUT' });
}
