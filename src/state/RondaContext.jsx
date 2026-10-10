import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { COMMENT_STATUS, getPlanUsage, getVersionStatus, validateReviewDecision } from '../domain/review.js';
import { normalizeSocialPreview } from '../domain/social-preview.js';
import { appendAssetVersion } from '../domain/asset-versions.js';
import {canCreateComment,safeCommentChanges} from '../domain/comments.js';
import { createSeedState, STATE_VERSION, STORAGE_KEY } from '../data/seed.js';
import { migrateLegacyComments, normalizeRondaState, persistRondaState } from './migration.js';

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
  [...new Set(recipients.filter(id=>id&&state.members[id]))].forEach((memberId, index) => {
    if (memberId === state.currentUserId) return;
    const id = `${event.id}-notification-${index}`;
    notifications[id] = { id, memberId, eventId: event.id, readAt: null, createdAt: event.occurredAt, projectId: detail.projectId, versionId: detail.versionId, commentId: detail.commentId ?? null };
  });
  return { ...state, activity: [event, ...state.activity], notifications };
};

export function rondaReducer(state, action) {
  const { payload } = action;
  switch (action.type) {
    case 'asset/versionAdd': return appendAssetVersion(state,payload,action.meta.occurredAt);
    case 'social/save': { const project = state.projects[payload.projectId]; if (!project) return state; return {...state, projects:{...state.projects,[project.id]:{...project,socialPreview:normalizeSocialPreview(payload.config,state.assets||[],project.id)}}}; }
    case 'asset/add': {const id=`asset-${payload.id}-v1`;return {...state,assets:[...(state.assets||[]),payload],versions:{...state.versions,[id]:{id,projectId:payload.projectId,number:1,name:payload.name,reviewerIds:Object.keys(state.members),decisions:{}}}};}
    case 'asset/order': {const assets=state.assets||[];if(payload.order.length!==assets.length||new Set(payload.order).size!==assets.length||payload.order.some(id=>!assets.some(a=>a.id===id)))return state;return {...state,assets:payload.order.map(id=>assets.find(a=>a.id===id))};}
    case 'annotations/save': return { ...state, annotations: { ...state.annotations, [payload.context]: payload.marks } };
    case 'project/add': {
      const name = String(payload.name || '').trim(); if (!name) return state;
      const id = makeId('project');
      return { ...state, projects: { ...state.projects, [id]: { id, name, client: String(payload.client || '').trim(), activeVersionId: null } } };
    }
    case 'workspace/update': return { ...state, workspace: { ...state.workspace, ...payload } };
    case 'member/add': {
      const email = String(payload.email || '').trim().toLowerCase();
      const limit = getPlanUsage({ plan: state.workspace.plan, members: Object.values(state.members) }).seats.limit;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || Object.values(state.members).some(m => m.email.toLowerCase() === email) || Object.keys(state.members).length >= limit) return state;
      const id = makeId('member');
      return { ...state, members: { ...state.members, [id]: { id, email, name: email.split('@')[0], initials: email.slice(0, 2).toUpperCase(), role: 'reviewer', status: 'pending' } } };
    }
    case 'member/update': {
      const member = state.members[payload.id];
      if (!member || !['admin', 'editor', 'reviewer'].includes(payload.role) || (member.role === 'admin' && payload.role !== 'admin' && Object.values(state.members).filter(m => m.role === 'admin').length === 1)) return state;
      return { ...state, members: { ...state.members, [member.id]: { ...member, role: payload.role } } };
    }
    case 'member/remove': {
      const member = state.members[payload.id];
      if (!member || member.id === state.currentUserId || (member.role === 'admin' && Object.values(state.members).filter(m => m.role === 'admin').length === 1)) return state;
      const members = { ...state.members }; delete members[member.id];
      const versions = Object.fromEntries(Object.entries(state.versions).map(([id, v]) => { const decisions = { ...v.decisions }; delete decisions[member.id]; return [id, { ...v, reviewerIds: v.reviewerIds.filter(x => x !== member.id), decisions }]; }));
      return { ...state, members, versions };
    }
    case 'comment/add': { if(!canCreateComment(state,payload))return state; const comment = { ...payload, id: payload.id ?? makeId('comment'), status: payload.status ?? COMMENT_STATUS.OPEN, createdAt: action.meta.occurredAt }; const next = { ...state, comments: { ...state.comments, [comment.id]: comment } }; return addEvent(next, action, 'comment.created', { projectId: comment.projectId, versionId: comment.versionId, commentId: comment.id }, [comment.assigneeId]); }
    case 'comment/update': { const current = state.comments[payload.id]; if (!current) return state; const changes=safeCommentChanges(payload.changes);if(changes.assigneeId&&!state.members[changes.assigneeId])return state;if(!Object.keys(changes).length)return state; const comment = { ...current, ...changes }; const next = { ...state, comments: { ...state.comments, [comment.id]: comment } }; const recipients = current.assigneeId !== comment.assigneeId ? [comment.assigneeId] : []; return addEvent(next, action, 'comment.updated', { projectId: comment.projectId, versionId: comment.versionId, commentId: comment.id, changes: Object.keys(changes) }, recipients); }
    case 'comment/resolve':
    case 'comment/reopen': { const comment = state.comments[payload.id]; if (!comment) return state; const status = action.type === 'comment/resolve' ? COMMENT_STATUS.RESOLVED : COMMENT_STATUS.OPEN; const next = { ...state, comments: { ...state.comments, [comment.id]: { ...comment, status, resolvedAt: status === COMMENT_STATUS.RESOLVED ? action.meta.occurredAt : null } } }; return addEvent(next, action, status === COMMENT_STATUS.RESOLVED ? 'comment.resolved' : 'comment.reopened', { projectId: comment.projectId, versionId: comment.versionId, commentId: comment.id }, [comment.authorId, comment.assigneeId]); }
    case 'review/decide': { if (!validateReviewDecision(state,payload).allowed) return state; const version = state.versions[payload.versionId]; if (!version || !version.reviewerIds.includes(payload.reviewerId)) return state; const updated = { ...version, decisions: { ...version.decisions, [payload.reviewerId]: payload.decision } }; const versions = { ...state.versions, [version.id]: updated }; const next = { ...state, versions }; return addEvent(next, action, 'review.decided', { projectId: version.projectId, versionId: version.id, reviewerId: payload.reviewerId, decision: payload.decision }, version.reviewerIds); }
    case 'notification/read': { const item = state.notifications[payload.id]; return item ? { ...state, notifications: { ...state.notifications, [item.id]: { ...item, readAt: action.meta.occurredAt } } } : state; }
    case 'notification/readAll': { const notifications = Object.fromEntries(Object.entries(state.notifications).map(([id, item]) => [id, item.memberId === (payload.memberId ?? state.currentUserId) ? { ...item, readAt: item.readAt ?? action.meta.occurredAt } : item])); return { ...state, notifications }; }
    default: return state;
  }
}

export function loadRondaState(storage = typeof localStorage === 'undefined' ? null : localStorage) {
  const seed = createSeedState();
  if (!storage) return seed;
  try { const saved = JSON.parse(storage.getItem(STORAGE_KEY)); if (saved?.schemaVersion === STATE_VERSION && saved.comments && saved.members && saved.projects && saved.versions && Array.isArray(saved.activity) && saved.notifications) return normalizeRondaState(saved); } catch { /* recover with seed */ }
  return migrateLegacyComments(seed, storage);
}

export function selectVersionStatus(state, versionId) {
  const version = state.versions[versionId];
  if (!version) return null;
  return getVersionStatus({ reviewerIds: version.reviewerIds, decisions: version.decisions, comments: state.comments, versionId });
}

export const selectUnreadNotifications = (state, memberId = state.currentUserId) => Object.values(state.notifications).filter(item => item.memberId === memberId && !item.readAt);
export const selectPlanUsage = state => getPlanUsage({ plan: state.workspace.plan, members: Object.values(state.members), reviewers: Object.values(state.members).filter(member => member.role === 'reviewer') });

export function RondaProvider({ children, storage, initialState, ephemeral = false }) {
  const resolvedStorage = storage ?? (typeof localStorage === 'undefined' ? null : localStorage);
  const [state, dispatch] = useReducer(rondaReducer, resolvedStorage, value=>initialState ?? loadRondaState(value));
  const [persistenceError,setPersistenceError]=useState(null);
  const save=useCallback(()=>{const result=persistRondaState(resolvedStorage,STORAGE_KEY,state);setPersistenceError(result.ok?null:result.reason);return result.ok},[resolvedStorage,state]);
  useEffect(() => { if(!ephemeral)save(); }, [save,ephemeral]);
  const act = useCallback((type, payload) => dispatch(createRondaAction(type, payload)), []);
  const value = useMemo(() => ({ state, dispatch, act, persistenceError, retryPersistence:save }), [state, act, persistenceError, save]);
  return <RondaContext.Provider value={value}>{children}</RondaContext.Provider>;
}

export function useRonda() {
  const context = useContext(RondaContext);
  if (!context) throw new Error('useRonda debe usarse dentro de RondaProvider');
  return context;
}
