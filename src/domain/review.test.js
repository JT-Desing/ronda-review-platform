import test from 'node:test';
import assert from 'node:assert/strict';
import { canFinalizeApproval, COMMENT_PRIORITY, COMMENT_STATUS, getVersionStatus, REVIEW_DECISION } from './review.js';

const base = { reviewerIds: ['a', 'b'], decisions: { a: REVIEW_DECISION.APPROVED, b: REVIEW_DECISION.APPROVED }, versionId: 'v1' };

test('finaliza cuando todos aprueban y no hay bloqueantes', () => {
  assert.equal(canFinalizeApproval({ ...base, comments: {} }).allowed, true);
  assert.equal(getVersionStatus({ ...base, comments: {} }), 'approved');
});

test('un comentario bloqueante abierto impide la aprobación', () => {
  const comments = { c1: { id: 'c1', versionId: 'v1', status: COMMENT_STATUS.OPEN, priority: COMMENT_PRIORITY.BLOCKING } };
  const result = canFinalizeApproval({ ...base, comments });
  assert.equal(result.allowed, false);
  assert.equal(result.blockers.length, 1);
});

test('una solicitud de cambios domina el estado', () => {
  const decisions = { a: REVIEW_DECISION.APPROVED, b: REVIEW_DECISION.CHANGES_REQUESTED };
  assert.equal(getVersionStatus({ ...base, decisions, comments: {} }), 'changes_requested');
});
