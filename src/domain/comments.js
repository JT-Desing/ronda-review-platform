export function getCommentEmptyState({ total, filter, search }) {
  const query=String(search??'').trim();
  if (total === 0) return { kind:'empty', title:'Aún no hay comentarios', detail:'Pausa en un cuadro y deja la primera indicación.', action:null };
  if (query) return { kind:'search', title:`No encontramos “${query}”`, detail:'Prueba otro término o limpia la búsqueda.', action:'Limpiar búsqueda' };
  if (filter !== 'Todos') return { kind:'filter', title:`No hay comentarios ${filter.toLowerCase()}`, detail:'La revisión no tiene elementos en este estado.', action:'Ver todos' };
  return null;
}
