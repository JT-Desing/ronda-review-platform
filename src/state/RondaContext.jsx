import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { COMMENT_STATUS, getPlanUsage, getVersionStatus } from '../domain/review.js';
import { createSeedState, STATE_VERSION, STORAGE_KEY } from '../data/seed.js';

const RondaContext = createContext(null);

const makeId = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
export const createRondaAction = (type, payload = {}) => ({
  type,
  payload,
  meta: { id: makeId('event'), occurredAt: new Date().toISOString() },
});

const addEvent = (state, action, kind, detail, recipients = []) => {
  const event = { id: action.meta.id, kind, actorId: state.currentUserId, occurredAt: action.meta.occurredAt, ...detail };
  const notifications = { ...state.notifications };
  recipients.filter(Boolean).forEach((memberId, index) => {
    if (memberId === state.currentUserId) return;
    const id = `${event.id}-notification-${index}`;
    notifications[id] = { id, memberId, eventId: event.id, readAt: null, createdAt: event.occurredAt, projectId: detail.projectId, versionId: detail.versionId, commentId: detail.commentId ?? null };
  });
  return { ...state, activity: [event, ...state.activity], notifications };
};

export function rondaReducer(state, action) {
  const { payload } = action;
  switch (action.type) {
    case 'comment/add': { const comment = { ...payload, id: payload.id ?? makeId('comment'), status: payload.status ?? COMMENT_STATUS.OPEN, createdAt: action.meta.occurredAt }; const next = { ...state, comments: { ...state.comments, [comment.id]: comment } }; return addEvent(next, action, 'comment.created', { projectId: comment.projectId, versionId: comment.versionId, commentId: comment.id }, [comment.assigneeId]); }
    case 'comment/update': { const current = state.comments[payload.id]; if (!current) return state; const comment = { ...current, ...payload.changes }; const next = { ...state, comments: { ...state.comments, [comment.id]: comment } }; const recipients = current.assigneeId !== comment.assigneeId ? [comment.assigneeId] : []; return addEvent(next, action, 'comment.updated', { projectId: comment.projectId, versionId: comment.versionId, commentId: comment.id, changes: Object.keys(payload.changes) }, recipients); }
    case 'comment/resolve':
    case 'comment/reopen': { const comment = state.comments[payload.id]; if (!comment) return state; const status = action.type === 'comment/resolve' ? COMMENT_STATUS.RESOLVED : COMMENT_STATUS.OPEN; const next = { ...state, comments: { ...state.comments, [comment.id]: { ...comment, status, resolvedAt: status === COMMENT_STATUS.RESOLVED ? action.meta.occurredAt : null } } }; return addEvent(next, action, status === COMMENT_STATUS.RESOLVED ? 'comment.resolved' : 'comment.reopened', { projectId: comment.projectId, versionId: comment.versionId, commentId: comment.id }, [comment.authorId, comment.assigneeId]); }
    case 'review/decide': { const version = state.versions[payload.versionId]; if (!version || !version.reviewerIds.includes(payload.reviewerId)) return state; const updated = { ...version, decisions: { ...version.decisions, [payload.reviewerId]: payload.decision } }; const versions = { ...state.versions, [version.id]: updated }; const next = { ...state, versions }; return addEvent(next, action, 'review.decided', { projectId: version.projectId, versionId: version.id, reviewerId: payload.reviewerId, decision: payload.decision }, version.reviewerIds); }
    case 'notification/read': { const item = state.notifications[payload.id]; return item ? { ...state, notifications: { ...state.notifications, [item.id]: { ...item, readAt: action.meta.occurredAt } } } : state; }
    case 'notification/readAll': { const notifications = Object.fromEntries(Object.entries(state.notifications).map(([id, item]) => [id, item.memberId === (payload.memberId ?? state.currentUserId) ? { ...item, readAt: item.readAt ?? action.meta.occurredAt } : item])); return { ...state, notifications }; }
    default: return state;
  }
}

function migrateLegacyComments(state, storage) {
  if (!storage || storage.getItem('ronda-comments-migrated')) return state;
  try {
    const legacy = JSON.parse(storage.getItem('ronda-comments'));
    if (!Array.isArray(legacy) || !legacy.length) return state;
    const comments = { ...state.comments };
    legacy.forEach(item => { const id = `legacy-${item.id}`; comments[id] = { id, projectId: 'project-amara', versionId: 'version-amara-v3', authorId: item.author === 'Julian T.' ? 'member-julian' : null, assigneeId: null, priority: 'normal', status: item.status ?? 'open', text: item.text, timeSeconds: 0, frame: item.frame ?? 0, createdAt: new Date().toISOString() }; });
    storage.setItem('ronda-comments-migrated', 'true');
    return { ...state, comments };
  } catch { return state; }
}

export function loadRondaState(storage = typeof localStorage === 'undefined' ? null : localStorage) {
  const seed = createSeedState();
  if (!storage) return seed;
  try { const saved = JSON.parse(storage.getItem(STORAGE_KEY)); if (saved?.schemaVersion === STATE_VERSION) return saved; } catch { /* recover with seed */ }
  return migrateLegacyComments(seed, storage);
}

export function selectVersionStatus(state, versionId) {
  const version = state.versions[versionId];
  if (!version) return null;
  return getVersionStatus({ reviewerIds: version.reviewerIds, decisions: version.decisions, comments: state.comments, versionId });
}

export const selectUnreadNotifications = (state, memberId = state.currentUserId) => Object.values(state.notifications).filter(item => item.memberId === memberId && !item.readAt);
export const selectPlanUsage = state => getPlanUsage({ plan: state.workspace.plan, members: Object.values(state.members), reviewers: Object.values(state.members).filter(member => member.role === 'reviewer') });

export function RondaProvider({ children, storage }) {
  const resolvedStorage = storage ?? (typeof localStorage === 'undefined' ? null : localStorage);
  const [state, dispatch] = useReducer(rondaReducer, resolvedStorage, loadRondaState);
  useEffect(() => { if (resolvedStorage) resolvedStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [resolvedStorage, state]);
  const act = useCallback((type, payload) => dispatch(createRondaAction(type, payload)), []);
  const value = useMemo(() => ({ state, dispatch, act }), [state, act]);
  return <RondaContext.Provider value={value}>{children}</RondaContext.Provider>;
}

export function useRonda() {
  const context = useContext(RondaContext);
  if (!context) throw new Error('useRonda debe usarse dentro de RondaProvider');
  return context;
}
