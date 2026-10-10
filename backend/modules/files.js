import { mkdir, rename, unlink, stat } from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { reply } from '../http.js';
export async function handleFiles({ req, res, path, account, pool }) {
  const fileMatch = path?.match(/^\/api\/files\/([0-9a-f-]{36})$/);
  if (fileMatch) {
    if (!account) return reply(res, 401, { error: 'Inicia sesión.' });
    const id = fileMatch[1];
    const dir = `/data/files/${account.id}`;
    const location = `${dir}/${id}`;
    if (req.method === 'PUT') {
      const size = Number(req.headers['content-length']);
      if (!Number.isInteger(size) || size < 1 || size > 100 * 1024 * 1024) return reply(res, 413, { error: 'Máximo 100 MB por archivo.' });
      const owner = await pool.query('SELECT user_id FROM files WHERE id=$1 AND user_id=$2', [id, account.id]);
      if (owner.rows.length) { req.resume(); return reply(res, 200, { id }); }
      // Serialize per-user quota and writes, preventing concurrent quota bypass.
      const client = await pool.connect();
      const temporary = `${location}.${randomUUID()}.part`;
      let moved = false;
      try {
        await client.query('BEGIN');
        await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [account.id]);
        const total = await client.query('SELECT COALESCE(sum(size),0) AS size FROM files WHERE user_id=$1', [account.id]);
        if (Number(total.rows[0].size) + size > 2 * 1024 * 1024 * 1024) throw Object.assign(new Error('Límite inicial: 2 GB por cuenta.'), { status: 413 });
        await mkdir(dir, { recursive: true });
        let received = 0;
        const limit = new Transform({ transform(chunk, encoding, callback) { received += chunk.length; callback(received > size ? new Error('Tamaño incorrecto') : null, chunk); } });
        await pipeline(req, limit, createWriteStream(temporary, { flags: 'wx', mode: 0o600 }));
        if (received !== size) throw new Error('Carga incompleta');
        const name = decodeURIComponent(String(req.headers['x-file-name'] ?? 'archivo')).slice(0, 255);
        const mime = String(req.headers['content-type'] ?? 'application/octet-stream').slice(0, 100);
        await client.query('INSERT INTO files(id,user_id,name,mime,size) VALUES($1,$2,$3,$4,$5)', [id, account.id, name, mime, size]);
        await rename(temporary, location); moved = true;
        await client.query('COMMIT');
        return reply(res, 201, { id });
      } catch (error) {
        await client.query('ROLLBACK'); await unlink(temporary).catch(() => {});
        if (moved) await unlink(location).catch(() => {});
        throw error;
      } finally { client.release(); }
    }
    if (req.method === 'GET') {
      const result = await pool.query('SELECT name,mime,size FROM files WHERE id=$1 AND user_id=$2', [id, account.id]);
      if (!result.rows.length) return reply(res, 404, { error: 'Archivo no disponible.' });
      await stat(location);
      // Never execute uploaded HTML/SVG on Ronda's origin; clients fetch as Blob.
      res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': result.rows[0].size, 'Content-Disposition': 'attachment', 'X-File-Name': encodeURIComponent(result.rows[0].name), 'X-File-Type': result.rows[0].mime, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store' });
      await pipeline(createReadStream(location), res); return;
    }
  }
  return reply(res, 405, { error: 'Método no permitido.' }, { Allow: 'GET, PUT' });
}
