export function activityItem(state,event){
 const actor=state.members[event.actorId],comment=state.comments[event.commentId],version=state.versions[event.versionId];
 const projectId=event.projectId||comment?.projectId,project=state.projects[projectId]?.name||'Proyecto no disponible';
 const isComment=event.kind.startsWith('comment');
 const action=event.kind==='comment.created'?'creó un comentario':event.kind==='comment.resolved'?'resolvió un comentario':event.kind==='comment.reopened'?'reabrió un comentario':'registró una decisión';
 return {id:event.id,who:actor?.name||'Cuenta retirada',initials:actor?.initials||'CR',color:'#67a9d4',action,where:project+(version?.name?' · '+version.name:''),project,projectId,commentId:event.commentId,detail:isComment?(comment?.text||'Comentario no disponible'):(event.decision==='approved'?'Aprobó la versión':'Solicitó cambios'),time:event.occurredAt?new Date(event.occurredAt).toLocaleString('es-CO'):'Fecha no disponible',occurredAt:event.occurredAt,type:event.kind==='comment.resolved'?'resolved':isComment?'comment':'approval'};
}
