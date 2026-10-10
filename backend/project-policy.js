import { workspaceError } from './workspace-policy.js';
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function requireProjectEditor(role) {
  if (!['admin', 'editor'].includes(role)) throw workspaceError(403, 'Solo un administrador o editor puede gestionar proyectos y resolver comentarios.');
}
export function projectInput(input) {
  if (!input || Array.isArray(input) || typeof input !== 'object') throw workspaceError(400, 'Datos de proyecto inválidos.');
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const client = typeof input.client === 'string' ? input.client.trim() : '';
  if (!name || name.length > 100 || client.length > 100) throw workspaceError(400, 'Indica un nombre de 1 a 100 caracteres; cliente máximo 100.');
  return { name, client };
}
export function requestId(value) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw workspaceError(400, 'Identificador de solicitud inválido.');
  return value;
}
export function commentInput(input) {
  if (!input || Array.isArray(input) || typeof input !== 'object') throw workspaceError(400, 'Datos de comentario inválidos.');
  const text = typeof input.text === 'string' ? input.text.trim() : '';
  if (!text || text.length > 2000) throw workspaceError(400, 'Escribe un comentario de 1 a 2000 caracteres.');
  return text;
}
