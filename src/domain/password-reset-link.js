const STORAGE_KEY = 'ronda-password-reset:v1';
const TOKEN_TTL_MS = 30 * 60 * 1000;

function extractToken(locationLike) {
  const search = new URLSearchParams(locationLike.search || '');
  const candidates = search.has('reset') ? [{ token: search.get('reset') || '', source: 'search' }] : [];
  const hash = String(locationLike.hash || '').replace(/^#/, '');
  const fragment = new URLSearchParams(hash);
  if (fragment.has('reset')) candidates.push({ token: fragment.get('reset') || '', source: 'hash' });
  return candidates.find(candidate => /^[A-Za-z0-9_-]{43}$/.test(candidate.token)) || candidates[0] || null;
}

export function hasInvalidPasswordResetToken(locationLike = globalThis.location) {
  const search = new URLSearchParams(locationLike.search || '');
  const hash = new URLSearchParams(String(locationLike.hash || '').replace(/^#/, ''));
  const candidates = [search, hash].filter(params => params.has('reset'));
  return candidates.length > 0 && !candidates.some(params => /^[A-Za-z0-9_-]{43}$/.test(params.get('reset') || ''));
}

function scrubResetToken(locationLike, historyLike) {
  const next = new URL(`${locationLike.pathname || '/'}${locationLike.search || ''}${locationLike.hash || ''}`, 'http://ronda.local');
  next.searchParams.delete('reset');
  const rawHash = next.hash.slice(1);
  const fragment = new URLSearchParams(rawHash);
  if (fragment.has('reset')) {
    fragment.delete('reset');
    next.hash = fragment.toString();
  }
  historyLike.replaceState(null, '', `${next.pathname}${next.search}${next.hash}`);
}

function availableStorage(storage) {
  if (storage !== undefined) return storage;
  try { return globalThis.sessionStorage; } catch { return null; }
}

export function readPasswordResetToken(storage, now = Date.now()) {
  storage = availableStorage(storage);
  try {
    const saved = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null');
    if (typeof saved?.token === 'string' && saved.token && Number.isFinite(saved.expiresAt) && saved.expiresAt > now) return saved.token;
    storage?.removeItem(STORAGE_KEY);
  } catch { /* Storage may be disabled; a token in the current URL can still be used. */ }
  return '';
}

export function passwordResetTokenFromUrl(locationLike = globalThis.location) {
  const candidate = extractToken(locationLike);
  return candidate && /^[A-Za-z0-9_-]{43}$/.test(candidate.token) ? candidate.token : '';
}

export function capturePasswordResetLink({ locationLike = globalThis.location, historyLike = globalThis.history, storage, now = Date.now() } = {}) {
  storage = availableStorage(storage);
  const fromUrl = extractToken(locationLike);
  if (!fromUrl) return readPasswordResetToken(storage, now);
  if (!/^[A-Za-z0-9_-]{43}$/.test(fromUrl.token)) {
    try { storage?.removeItem(STORAGE_KEY); } catch { /* Ignore unavailable storage. */ }
    scrubResetToken(locationLike, historyLike);
    return '';
  }
  let persisted = false;
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify({ token: fromUrl.token, expiresAt: now + TOKEN_TTL_MS }));
    persisted = Boolean(storage);
  } catch { /* Leave the token in the URL so a reload does not destroy the link. */ }
  if (persisted) scrubResetToken(locationLike, historyLike);
  return fromUrl.token;
}

export function clearPasswordResetToken(storage) {
  storage = availableStorage(storage);
  try { storage?.removeItem(STORAGE_KEY); } catch { /* Best effort; token expires shortly. */ }
}

export function clearPasswordResetLink({ locationLike = globalThis.location, historyLike = globalThis.history, storage } = {}) {
  clearPasswordResetToken(storage);
  const next = new URL(`${locationLike.pathname || '/'}${locationLike.search || ''}${locationLike.hash || ''}`, 'http://ronda.local');
  next.searchParams.delete('reset');
  const rawHash = next.hash.slice(1);
  const fragment = new URLSearchParams(rawHash);
  if (fragment.has('reset')) {
    fragment.delete('reset');
    next.hash = fragment.toString();
  }
  historyLike.replaceState(null, '', `${next.pathname}${next.search}${next.hash}`);
}
