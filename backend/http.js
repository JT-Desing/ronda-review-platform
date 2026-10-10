export function reply(res, status, data, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(JSON.stringify(data));
}
export async function body(req, max = 8192) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw Object.assign(new Error('Se requiere JSON.'), { status: 415 });
  let value = '';
  for await (const chunk of req) {
    value += chunk;
    if (Buffer.byteLength(value) > max) throw Object.assign(new Error('Solicitud demasiado grande.'), { status: 413 });
  }
  try { return JSON.parse(value); } catch { throw Object.assign(new Error('JSON inválido.'), { status: 400 }); }
}
