export const sharedApprovalBlocked=counts=>counts.blocking>0||Boolean(counts.partial);
export function filterSharedComments(comments,filter,search){
 const query=search.trim().toLowerCase();
 return comments.filter(c=>(filter==='Todos'||c.status===(filter==='Abiertos'?'open':'resolved'))&&[c.author,c.text,...(c.replies||[]).map(r=>r.text)].join(' ').toLowerCase().includes(query));
}
export function sharedCommentCounts(room){
 const stats=room?.commentStats;
 if(stats&&['total','open','resolved','blocking'].every(k=>Number.isInteger(stats[k])&&stats[k]>=0))return {...stats,partial:false};
 const comments=room?.comments||[];
 return {total:comments.length,open:comments.filter(c=>c.status==='open').length,resolved:comments.filter(c=>c.status==='resolved').length,blocking:comments.filter(c=>c.status==='open'&&c.priority==='blocking').length,partial:Boolean(room?.nextCursor)};
}
export function sharedCommentsEmptyMessage({comments,visible,filter,search,nextCursor}){
 if(visible.length)return '';
 if(!comments.length)return 'No hay comentarios en esta versión.';
 const message=search.trim()?'No hay coincidencias para tu búsqueda.':filter==='Abiertos'?'No hay comentarios abiertos.':filter==='Resueltos'?'No hay comentarios resueltos.':'No hay comentarios que mostrar.';
 return nextCursor?message+' Se han buscado solo los comentarios cargados; carga más para continuar.':message;
}
