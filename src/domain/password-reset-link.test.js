import test from 'node:test';
import assert from 'node:assert/strict';
import { capturePasswordResetLink, clearPasswordResetLink, hasInvalidPasswordResetToken, passwordResetTokenFromUrl, readPasswordResetToken } from './password-reset-link.js';

function setup(url) {
  const current = new URL(url);
  const storage = new Map();
  const storageApi = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  let replaced;
  const historyLike = { replaceState(_state, _title, value) { replaced = value; } };
  return { locationLike: current, storage, storageApi, historyLike, get replaced() { return replaced; } };
}

test('captures a fragment token, stores it for reload, and removes it from the visible URL', () => {
  const state = setup('https://ronda.example/projects#reset=' + 'a'.repeat(43));
  assert.equal(capturePasswordResetLink({ locationLike: state.locationLike, historyLike: state.historyLike, storage: state.storageApi, now: 100 }), 'a'.repeat(43));
  assert.equal(state.replaced, '/projects');
  assert.equal(readPasswordResetToken(state.storageApi, 101), 'a'.repeat(43));
  assert.equal(readPasswordResetToken(state.storageApi, 100 + 30 * 60 * 1000), '');
});

test('preserves a valid token across reload without extending its original expiry', () => {
  const first = setup('https://ronda.example/#reset=' + 'b'.repeat(43));
  capturePasswordResetLink({ locationLike: first.locationLike, historyLike: first.historyLike, storage: first.storageApi, now: 100 });
  const reloaded = setup('https://ronda.example/');
  reloaded.storageApi = first.storageApi;
  assert.equal(capturePasswordResetLink({ locationLike: reloaded.locationLike, historyLike: reloaded.historyLike, storage: reloaded.storageApi, now: 101 }), 'b'.repeat(43));
  assert.equal(readPasswordResetToken(reloaded.storageApi, 30 * 60 * 1000 + 100), '');
});

test('supports legacy query links but scrubs only the reset parameter', () => {
  const state = setup('https://ronda.example/?keep=yes&reset=' + 'c'.repeat(43) + '#section');
  capturePasswordResetLink({ locationLike: state.locationLike, historyLike: state.historyLike, storage: state.storageApi });
  assert.equal(state.replaced, '/?keep=yes#section');
});

test('drops malformed tokens and can explicitly clear the stored bearer token', () => {
  const state = setup('https://ronda.example/#reset=bad');
  assert.equal(hasInvalidPasswordResetToken(state.locationLike), true);
  assert.equal(capturePasswordResetLink({ locationLike: state.locationLike, historyLike: state.historyLike, storage: state.storageApi }), '');
  assert.equal(state.replaced, '/');
  const valid = setup('https://ronda.example/#reset=' + 'd'.repeat(43));
  capturePasswordResetLink({ locationLike: valid.locationLike, historyLike: valid.historyLike, storage: valid.storageApi });
  let replaced;
  clearPasswordResetLink({ locationLike: valid.locationLike, historyLike: { replaceState(_state, _title, value) { replaced = value; } }, storage: valid.storageApi });
  assert.equal(replaced, '/');
  assert.equal(readPasswordResetToken(valid.storageApi), '');
});

test('does not flag a valid token or unrelated route as an invalid recovery link', () => {
  assert.equal(hasInvalidPasswordResetToken(setup('https://ronda.example/#reset=' + 'a'.repeat(43)).locationLike), false);
  assert.equal(hasInvalidPasswordResetToken(setup('https://ronda.example/#team/abc').locationLike), false);
  assert.equal(hasInvalidPasswordResetToken(setup('https://ronda.example/?reset=bad#reset=' + 'b'.repeat(43)).locationLike), false);
});

test('clearing recovery never canonicalizes an unrelated hash route', () => {
  const state = setup('https://ronda.example/#team/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
  clearPasswordResetLink({ locationLike: state.locationLike, historyLike: state.historyLike, storage: state.storageApi });
  assert.equal(state.replaced, '/#team/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
});

test('a valid fragment token wins over a malformed query token and both are scrubbed', () => {
  const valid = 'e'.repeat(43);
  const state = setup('https://ronda.example/?reset=bad&keep=yes#reset=' + valid + '&team=active');
  assert.equal(passwordResetTokenFromUrl(state.locationLike), valid);
  assert.equal(capturePasswordResetLink({ locationLike: state.locationLike, historyLike: state.historyLike, storage: state.storageApi }), valid);
  assert.equal(state.replaced, '/?keep=yes#team=active');
});

test('blocked sessionStorage getter degrades without throwing', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  try {
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
    assert.equal(readPasswordResetToken(), '');
    const state = setup('https://ronda.example/#reset=' + 'f'.repeat(43));
    assert.equal(capturePasswordResetLink({ locationLike: state.locationLike, historyLike: state.historyLike }), 'f'.repeat(43));
    assert.equal(state.replaced, undefined, 'keep a URL fallback when session storage is blocked');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'sessionStorage', previous);
    else delete globalThis.sessionStorage;
  }
});
