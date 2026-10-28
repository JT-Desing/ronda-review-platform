const MAX_DIMENSION = 100_000_000;

export function normalizeWebReviewMetrics(value) {
  if (!value || typeof value !== 'object') return null;
  const numbers = ['scrollX', 'scrollY', 'viewportWidth', 'viewportHeight', 'documentWidth', 'documentHeight'];
  if (numbers.some(key => !Number.isFinite(value[key]) || value[key] < 0 || value[key] > MAX_DIMENSION)) return null;
  if (value.viewportWidth < 1 || value.viewportHeight < 1 || value.documentWidth < value.viewportWidth || value.documentHeight < value.viewportHeight) return null;
  return Object.fromEntries(numbers.map(key => [key, value[key]]));
}

export function viewportMarkToDocument(mark, metrics) {
  if (!mark || !metrics || !Array.isArray(mark.points)) return mark;
  return {
    ...mark,
    coordinateSpace: 'document',
    documentSize: {width:metrics.documentWidth,height:metrics.documentHeight},
    points: mark.points.map(point => ({
      x: Math.max(0, Math.min(1, (metrics.scrollX + point.x * metrics.viewportWidth) / metrics.documentWidth)),
      y: Math.max(0, Math.min(1, (metrics.scrollY + point.y * metrics.viewportHeight) / metrics.documentHeight)),
    })),
  };
}

export function documentMarkToViewport(mark, metrics) {
  if (!mark || mark.coordinateSpace !== 'document' || !metrics || !Array.isArray(mark.points)) return mark;
  return {
    ...mark,
    points: mark.points.map(point => ({
      x: (point.x * metrics.documentWidth - metrics.scrollX) / metrics.viewportWidth,
      y: (point.y * (mark.documentSize?.height || metrics.documentHeight) - metrics.scrollY) / metrics.viewportHeight,
    })),
    ...(mark.selectionRects?{selectionRects:mark.selectionRects.map(rect=>({
      x:(rect.x*(mark.documentSize?.width||metrics.documentWidth)-metrics.scrollX)/metrics.viewportWidth,
      y:(rect.y*(mark.documentSize?.height||metrics.documentHeight)-metrics.scrollY)/metrics.viewportHeight,
      width:rect.width*(mark.documentSize?.width||metrics.documentWidth)/metrics.viewportWidth,
      height:rect.height*(mark.documentSize?.height||metrics.documentHeight)/metrics.viewportHeight,
    }))}:{}),
  };
}

export function selectionToDocumentMark(selection, metrics, color = '#b89be8') {
  if (!selection || typeof selection.quote !== 'string' || !metrics || !Array.isArray(selection.rects) || !selection.rects.length) return null;
  const quote = selection.quote.replace(/\s+/g, ' ').trim().slice(0, 2000);
  const rect = selection.rects.find(item => item && Number.isFinite(item.left) && Number.isFinite(item.top) && Number.isFinite(item.width) && Number.isFinite(item.height) && item.width > 0 && item.height > 0);
  if (!quote || !rect) return null;
  const x = metrics.scrollX + rect.left + rect.width / 2;
  const y = metrics.scrollY + rect.top + rect.height / 2;
  const selectionRects = selection.rects.slice(0,80).filter(item=>item&&Number.isFinite(item.left)&&Number.isFinite(item.top)&&Number.isFinite(item.width)&&Number.isFinite(item.height)&&item.width>0&&item.height>0).map(item=>({
    x:Math.max(0,Math.min(1,(metrics.scrollX+item.left)/metrics.documentWidth)),
    y:Math.max(0,Math.min(1,(metrics.scrollY+item.top)/metrics.documentHeight)),
    width:Math.max(0,Math.min(1,item.width/metrics.documentWidth)),
    height:Math.max(0,Math.min(1,item.height/metrics.documentHeight)),
  }));
  if(!selectionRects.length)return null;
  return {
    id: crypto.randomUUID(),
    tool: 'selection',
    color,
    textQuote: quote,
    selectionRects,
    coordinateSpace: 'document',
    documentSize: {width: metrics.documentWidth, height: metrics.documentHeight},
    points: [{
      x: Math.max(0, Math.min(1, x / metrics.documentWidth)),
      y: Math.max(0, Math.min(1, y / metrics.documentHeight)),
    }],
  };
}
