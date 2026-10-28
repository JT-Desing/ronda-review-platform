const commentFingerprint = comment => `${comment.projectId ?? 'project-amara'}|${comment.versionId ?? 'version-amara-v3'}|${String(comment.text ?? '').trim().toLocaleLowerCase()}|${Number(comment.frame ?? 0)}|${comment.annotationId ?? ''}|${comment.annotationContext ?? ''}`;

const parseLegacyTime = (value, frame) => {
  if (Number.isFinite(value) && (value > 0 || !frame)) return value;
  if (typeof value === 'string') {
    const parts = value.split(':').map(Number);
    if (parts.length === 3 && parts.every(Number.isFinite)) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return Number(frame ?? 0) / 24;
};

export function normalizeRondaState(state) {
  const seen = new Set();
  const comments = {};
  Object.values(state.comments ?? {}).sort((a, b) => Number(a.id.startsWith('legacy-')) - Number(b.id.startsWith('legacy-'))).forEach(comment => {
    const fingerprint = commentFingerprint(comment);
    if (seen.has(fingerprint)) return;
    seen.add(fingerprint);
    comments[comment.id] = { ...comment, timeSeconds: parseLegacyTime(comment.timeSeconds ?? comment.time, comment.frame) };
  });
  return { ...state, comments };
}

export function migrateLegacyComments(state, storage) {
  if (!storage) return normalizeRondaState(state);
  try {
    const legacy = JSON.parse(storage.getItem('ronda-comments'));
    if (!Array.isArray(legacy) || !legacy.length) return normalizeRondaState(state);
    const comments = { ...state.comments };
    legacy.forEach(item => {
      if (!item || !String(item.text ?? '').trim()) return;
      const id = `legacy-${item.id}`;
      const frame = Number(item.frame ?? 0);
      comments[id] = { id, projectId: 'project-amara', versionId: 'version-amara-v3', authorId: item.author === 'Julian T.' ? 'member-julian' : null, authorSnapshot: item.author ?? null, assigneeId: null, priority: 'normal', status: item.status ?? 'open', text: item.text, replies: Array.isArray(item.replies) ? item.replies : [], legacyReplyCount: Number.isFinite(item.replies) ? item.replies : 0, timeSeconds: parseLegacyTime(item.timeSeconds ?? item.time, frame), frame, createdAt: item.createdAt ?? new Date().toISOString() };
    });
    return normalizeRondaState({ ...state, comments });
  } catch { return normalizeRondaState(state); }
}

export function persistRondaState(storage, key, state) {
  if (!storage) return { ok: false, reason: 'unavailable' };
  try {
    storage.setItem(key, JSON.stringify(state));
    return { ok: true, reason: null };
  } catch (error) {
    return { ok: false, reason: error?.name === 'QuotaExceededError' ? 'quota' : 'blocked' };
  }
}

export function loadSessionDraft(storage, key) {
  if (!storage) return '';
  try { return String(storage.getItem(key) ?? ''); } catch { return ''; }
}

export function saveSessionDraft(storage, key, value) {
  if (!storage) return false;
  try {
    if (value) storage.setItem(key, value); else storage.removeItem(key);
    return true;
  } catch { return false; }
}

export function readDraftForContext(cache, storage, key) {
  return Object.prototype.hasOwnProperty.call(cache, key) ? cache[key] : loadSessionDraft(storage, key);
}
