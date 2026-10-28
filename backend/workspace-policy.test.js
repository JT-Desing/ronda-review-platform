import test from 'node:test';
import assert from 'node:assert/strict';
import { requireWorkspaceMember, requireWorkspaceAdmin, validateRole, protectLastAdmin } from './workspace-policy.js';
test('workspace policies deny outsiders and prevent privilege escalation', () => {
  assert.throws(() => requireWorkspaceMember(undefined), { status: 404 });
  for (const role of ['editor', 'reviewer']) {
    assert.doesNotThrow(() => requireWorkspaceMember(role));
    assert.throws(() => requireWorkspaceAdmin(role), { status: 403 });
  }
  assert.doesNotThrow(() => requireWorkspaceAdmin('admin'));
  assert.throws(() => validateRole('owner'), { status: 400 });
});
test('last administrator cannot be removed or demoted', () => {
  for (const next of [null, 'reviewer', 'editor']) assert.throws(() => protectLastAdmin('admin', next, 1), { status: 409 });
  assert.doesNotThrow(() => protectLastAdmin('admin', 'reviewer', 2));
  assert.doesNotThrow(() => protectLastAdmin('editor', null, 1));
});
