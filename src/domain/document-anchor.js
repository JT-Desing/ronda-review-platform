export function resolveFigureAnchor(annotations, comment, currentContext) {
  if (!comment.annotationId || !comment.annotationContext) return null;
  const base=context=>context.replace(/:page-\d+$/, '');
  if (base(comment.annotationContext)!==base(currentContext)) return null;
  const mark=annotations?.[comment.annotationContext]?.find(mark=>mark.id===comment.annotationId);
  return mark?{context:comment.annotationContext,mark,page:comment.page||null}:null;
}
