export const COMMENT_STATUS = Object.freeze({ OPEN: 'open', RESOLVED: 'resolved' });
export const COMMENT_PRIORITY = Object.freeze({ LOW: 'low', NORMAL: 'normal', HIGH: 'high', BLOCKING: 'blocking' });
export const REVIEW_DECISION = Object.freeze({ PENDING: 'pending', APPROVED: 'approved', CHANGES_REQUESTED: 'changes_requested' });

export const PLAN_LIMITS = Object.freeze({
  free: { seats: 1, reviewers: 2, versions: 2, historyDays: 7 },
  creator: { seats: 2, reviewers: 10, versions: 10, historyDays: 90 },
  studio: { seats: 5, reviewers: Infinity, versions: Infinity, historyDays: Infinity },
  agency: { seats: 20, reviewers: Infinity, versions: Infinity, historyDays: Infinity },
  enterprise: { seats: Infinity, reviewers: Infinity, versions: Infinity, historyDays: Infinity },
});

export function isBlockingComment(comment) {
  return comment.status === COMMENT_STATUS.OPEN && comment.priority === COMMENT_PRIORITY.BLOCKING;
}

export function openCommentsForVersion(comments, versionId) {
  return Object.values(comments).filter(comment => comment.versionId === versionId && comment.status === COMMENT_STATUS.OPEN);
}

export function getApprovalSummary({ reviewerIds = [], decisions = {} }) {
  const values = reviewerIds.map(id => decisions[id] ?? REVIEW_DECISION.PENDING);
  const approved = values.filter(value => value === REVIEW_DECISION.APPROVED).length;
  const changesRequested = values.filter(value => value === REVIEW_DECISION.CHANGES_REQUESTED).length;
  return {
    approved,
    changesRequested,
    pending: reviewerIds.length - approved - changesRequested,
    total: reviewerIds.length,
  };
}

export function canFinalizeApproval({ reviewerIds = [], decisions = {}, comments = {}, versionId }) {
  const blockers = openCommentsForVersion(comments, versionId).filter(isBlockingComment);
  const summary = getApprovalSummary({ reviewerIds, decisions });
  const reasons = [];
  if (blockers.length) reasons.push(`${blockers.length} comentario${blockers.length === 1 ? '' : 's'} bloqueante${blockers.length === 1 ? '' : 's'} abierto${blockers.length === 1 ? '' : 's'}`);
  if (summary.changesRequested) reasons.push(`${summary.changesRequested} solicitud${summary.changesRequested === 1 ? '' : 'es'} de cambios`);
  if (summary.pending) reasons.push(`${summary.pending} aprobación${summary.pending === 1 ? '' : 'es'} pendiente${summary.pending === 1 ? '' : 's'}`);
  return { allowed: reasons.length === 0 && reviewerIds.length > 0, reasons, blockers, summary };
}

export function getVersionStatus(input) {
  const result = canFinalizeApproval(input);
  if (result.summary.changesRequested > 0) return 'changes_requested';
  if (result.allowed) return 'approved';
  return 'in_review';
}

export function getPlanUsage({ plan = 'studio', members = [], reviewers = [] }) {
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.studio;
  return {
    plan,
    seats: { used: members.length, limit: limits.seats, exceeded: members.length > limits.seats },
    reviewers: { used: reviewers.length, limit: limits.reviewers, exceeded: reviewers.length > limits.reviewers },
  };
}

export function canAddSeat(input) {
  const usage = getPlanUsage(input);
  return usage.seats.limit === Infinity || usage.seats.used < usage.seats.limit;
}
