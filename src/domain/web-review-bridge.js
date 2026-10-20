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
  };
}
