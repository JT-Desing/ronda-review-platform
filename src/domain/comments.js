export function getCommentEmptyState({ total, filter, search }) {
  const query=String(search??'').trim();
  if (total === 0) return { kind:'empty', title:'Aún no hay comentarios', detail:'Pausa en un cuadro y deja la primera indicación.', action:null };
  if (query) return { kind:'search', title:`No encontramos “${query}”`, detail:'Prueba otro término o limpia la búsqueda.', action:'Limpiar búsqueda' };
  if (filter !== 'Todos') return { kind:'filter', title:`No hay comentarios ${filter.toLowerCase()}`, detail:'La revisión no tiene elementos en este estado.', action:'Ver todos' };
  return null;
}

export function canCreateComment(state,payload){
  const version=state.versions[payload.versionId];
  return Boolean(version&&state.projects[version.projectId]&&payload.projectId===version.projectId&&payload.authorId===state.currentUserId&&state.members[payload.authorId]&&(!payload.assigneeId||state.members[payload.assigneeId])&&(!payload.id||!state.comments[payload.id])&&(String(payload.text||'').trim()||(Array.isArray(payload.attachments)&&payload.attachments.length)));
}
export function safeCommentChanges(changes={}){
  // Identifiers, attribution and historical timestamps never move on edits.
  const allowed=['text','priority','assigneeId','replies','attachments'];
  return Object.fromEntries(Object.entries(changes).filter(([key])=>allowed.includes(key)));
}
