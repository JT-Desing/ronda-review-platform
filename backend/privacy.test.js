import test from 'node:test';
import assert from 'node:assert/strict';
import { PRIVACY_POLICY_VERSION, withPrivacy, requirePrivacyAcceptance, acceptedPrivacy } from './privacy.js';

test('accounts expose whether they accepted the current policy, not the raw version', () => {
  assert.deepEqual(withPrivacy({ id: 'u', privacy_version: PRIVACY_POLICY_VERSION }), { id: 'u', privacyAccepted: true });
  assert.deepEqual(withPrivacy({ id: 'u', privacy_version: '0.9' }), { id: 'u', privacyAccepted: false });
  assert.deepEqual(withPrivacy({ id: 'u', privacy_version: null }), { id: 'u', privacyAccepted: false });
  assert.equal(withPrivacy(null), null);
});

test('only an explicit true counts as acceptance', () => {
  assert.equal(acceptedPrivacy({ acceptPrivacy: true }), true);
  for (const value of ['on', 'true', 1, undefined]) assert.equal(acceptedPrivacy({ acceptPrivacy: value }), false);
  assert.throws(() => requirePrivacyAcceptance({}), error => error.status === 400 && /política/.test(error.message));
});
