const clampUnit=value=>Math.max(0,Math.min(1,value));

export function annotationVisibleAt(mark, timeSeconds, isImage = false, fps = 24) {
  if (isImage) return true;
  if (!Number.isFinite(mark.timeSeconds) || !Number.isFinite(timeSeconds)) return false;
  return Math.floor(Math.max(0, mark.timeSeconds) * fps + 1e-7) === Math.floor(Math.max(0, timeSeconds) * fps + 1e-7);
}

export function toNormalizedPoint(event, rect) {
  if (!rect.width || !rect.height) return {x:0,y:0};
  return {x:clampUnit((event.clientX-rect.left)/rect.width),y:clampUnit((event.clientY-rect.top)/rect.height)};
}

export function finalizeAnnotation(tool,color,points,text='') {
  if (tool==='type') return text.trim()&&points.length?{tool,color,text:text.trim(),points:[points[0]]}:null;
  if (!['pen','arrow','square'].includes(tool)||points.length<2) return null;
  return {tool,color,points:[...points]};
}
