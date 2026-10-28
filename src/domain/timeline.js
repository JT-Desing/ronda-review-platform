export function groupTimelineComments(comments, duration, versionId, fps = 24) {
  if (!Number.isFinite(duration) || duration <= 0) return [];
  const groups = new Map();
  comments.filter(c => c.versionId === versionId && Number.isFinite(c.timeSeconds) && c.timeSeconds >= 0 && c.timeSeconds <= duration).forEach(comment => {
    const frame = Math.floor(comment.timeSeconds * fps + 1e-7);
    if (!groups.has(frame)) groups.set(frame, { frame, percent: comment.timeSeconds / duration * 100, comments: [] });
    groups.get(frame).comments.push(comment);
  });
  return [...groups.values()].sort((a,b) => a.frame-b.frame);
}
