export const WORKSPACE_ROLES = ['admin', 'editor', 'reviewer'];
export const WORKSPACE_SEAT_LIMIT = 20; // Operational cap, not a paid-plan entitlement.
export const workspaceError = (status, message) => Object.assign(new Error(message), { status });
export function requireWorkspaceMember(role) {
  if (!WORKSPACE_ROLES.includes(role)) throw workspaceError(404, 'Espacio no disponible.');
}
export function requireWorkspaceAdmin(role) {
  requireWorkspaceMember(role);
  if (role !== 'admin') throw workspaceError(403, 'Solo un administrador puede gestionar el equipo.');
}
export function validateRole(role) {
  if (!WORKSPACE_ROLES.includes(role)) throw workspaceError(400, 'Rol inválido.');
}
export function protectLastAdmin(currentRole, nextRole, adminCount) {
  if (currentRole === 'admin' && nextRole !== 'admin' && adminCount <= 1) throw workspaceError(409, 'El espacio necesita al menos un administrador.');
}
