export const sharedApprovalBlocked=counts=>counts.blocking>0||Boolean(counts.partial);
export function filterSharedComments(comments,filter,search){
 const query=search.trim().toLowerCase();
 const status=({Todos:'all',Abiertos:'open',Resueltos:'resolved',all:'all',open:'open',resolved:'resolved'})[filter]||'all';
 return comments.filter(c=>(status==='all'||c.status===status)&&[c.author,c.text,...(c.replies||[]).map(r=>r.text)].join(' ').toLowerCase().includes(query));
}
export function sharedCommentCounts(room){
 const stats=room?.commentStats;
 if(stats&&['total','open','resolved','blocking'].every(k=>Number.isInteger(stats[k])&&stats[k]>=0))return {...stats,partial:false};
 const comments=room?.comments||[];
 return {total:comments.length,open:comments.filter(c=>c.status==='open').length,resolved:comments.filter(c=>c.status==='resolved').length,blocking:comments.filter(c=>c.status==='open'&&c.priority==='blocking').length,partial:Boolean(room?.nextCursor)};
}
export function sharedCommentsEmptyMessage({comments,visible,filter,search,nextCursor}){
 if(visible.length)return '';
 const status=({Todos:'all',Abiertos:'open',Resueltos:'resolved',all:'all',open:'open',resolved:'resolved'})[filter]||'all';
 if(nextCursor&&!comments.some(c=>status==='all'||c.status===status))return 'Hay más comentarios por cargar.';
 const available=status==='all'?comments.length:comments.filter(c=>c.status===status).length;
 if(!available)return status==='resolved'?'No hay comentarios resueltos en esta versión.':'No hay comentarios pendientes en esta versión.';
 const message=search.trim()?'No hay coincidencias para tu búsqueda.':status==='resolved'?'No hay comentarios resueltos que mostrar.':'No hay comentarios pendientes que mostrar.';
 return nextCursor?message+' Se han buscado solo los comentarios cargados; carga más para continuar.':message;
}
