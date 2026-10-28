import { getVersionStatus } from './review.js';

export const projectStatusLabels = { draft: 'Sin piezas', in_review: 'En revisión', changes_requested: 'Cambios solicitados', approved: 'Aprobado' };
export function projectDetailMessage(project) {
  const count = project.assets?.length ?? project.assetCount ?? 0;
  if (count === 0) return 'Este proyecto aún no tiene piezas. Agrega un archivo o un enlace para iniciar su revisión.';
  const noun = count === 1 ? 'pieza' : 'piezas';
  const action = count === 1 ? 'organizarla' : 'organizarlas';
  return `Este proyecto ya tiene ${count} ${noun}. Abre la parrilla para ${action} o continuar la revisión.`;
}

export function presentProject(state, project) {
  const assets = (state.assets || []).filter(asset => asset.projectId === project.id);
  const version = state.versions[project.activeVersionId];
  const versionIds = new Set(Object.values(state.versions).filter(item => item.projectId === project.id).map(item => item.id));
  const comments = Object.values(state.comments).filter(item => versionIds.has(item.versionId) && item.status === 'open');
  const status = version ? getVersionStatus({ ...version, versionId: version.id, comments: state.comments }) : 'draft';
  const palette = [...project.id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 4;
  return { ...project, assets, pending: comments.length, status, palette, version };
}
export function projectOverview(state) {
  const projects = Object.values(state.projects).filter(project=>!project.deletedAt).map(project => presentProject(state, project));
  return { projects, pending: projects.reduce((sum, project) => sum + project.pending, 0), approved: projects.filter(project => project.status === 'approved').length, assets: projects.reduce((sum,project)=>sum+project.assets.length,0) };
}
