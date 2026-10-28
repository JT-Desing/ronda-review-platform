export function reply(res, status, data, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(JSON.stringify(data));
}
export async function body(req, max = 8192) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw Object.assign(new Error('Se requiere JSON.'), { status: 415 });
  // Count bytes per chunk; re-measuring the whole string each time is quadratic.
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) throw Object.assign(new Error('Solicitud demasiado grande.'), { status: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks, size).toString('utf8')); } catch { throw Object.assign(new Error('JSON inválido.'), { status: 400 }); }
}
