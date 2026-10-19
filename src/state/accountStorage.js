import {demoSession} from './demoSession.js';
import {jsonRequest} from './jsonRequest.js';
let accountId = null;
let data = {};
let revision = 0;
let timer;
let inFlight;
let dirty = false;
let failure = null;
export const currentAccountId = () => accountId;
export async function api(path, options = {}) {
  return jsonRequest(path,options);
}
const notify = (message, error = false) => window.dispatchEvent(new CustomEvent('ronda-sync', { detail: { message, error } }));
const backupKey = id => `ronda-account:${id}`;
const dismissedKey = id => `ronda-account-dismissed:${id}`;
let recoveryArchiveSequence = 0;
const recoveryKey = (id, revision) => `ronda-account-recovery:${id}:${revision}:${Date.now()}:${++recoveryArchiveSequence}`;
const copyIdentity = copy => JSON.stringify({ revision: copy.revision, data: copy.data });
const backup = () => {
  const next = { data, revision, dirty: true };
  const nextRaw = JSON.stringify(next);
  const dismissed = localStorage.getItem(dismissedKey(accountId));
  const existing = localStorage.getItem(backupKey(accountId));
  if (dismissed && existing) {
    let previous;
    try { previous = JSON.parse(existing); } catch { /* A malformed older copy cannot match a dismissal. */ }
    if (previous && copyIdentity(previous) === dismissed) {
      // Preserve the resolved copy before the next write replaces the active recovery slot.
      // If archiving fails (for example, local storage is full), abort this backup write.
      localStorage.setItem(recoveryKey(accountId, previous.revision), existing);
    }
  }
  localStorage.setItem(backupKey(accountId), nextRaw);
  if (dismissed && dismissed !== copyIdentity(next)) localStorage.removeItem(dismissedKey(accountId));
};
export function initializeAccount(user, snapshot) {
  clearTimeout(timer); accountId = user.id; data = { ...snapshot.data }; revision = snapshot.revision; dirty = false; failure = null;
}
export function pendingAccountCopy() {
  try {
    const copy = JSON.parse(localStorage.getItem(backupKey(accountId)));
    if (!copy?.dirty || localStorage.getItem(dismissedKey(accountId)) === copyIdentity(copy)) return null;
    return copy;
  } catch { return null; }
}
export function dismissPendingCopy(copy) {
  if (!accountId || !copy?.dirty) throw new Error('No hay una copia pendiente que resolver.');
  const raw = localStorage.getItem(backupKey(accountId));
  if (!raw) throw new Error('La copia pendiente ya no está disponible.');
  const current = JSON.parse(raw);
  const identity = copyIdentity(copy);
  if (copyIdentity(current) !== identity) throw new Error('La copia cambió mientras se resolvía. Vuelve a revisar sus opciones.');
  localStorage.setItem(dismissedKey(accountId), identity);
}
export const accountStorage = {
  getItem: key => (demoSession()?.data ?? data)[key] ?? null,
  setItem(key, value) {
    if (demoSession()) { demoSession().data[key]=String(value); return; }
    if (data[key] === value) return;
    data = { ...data, [key]: String(value) }; dirty = true;
    try { backup(); } catch { notify('No hay espacio para copia local; se intentará guardar en el servidor.', true); }
    notify('Cambios pendientes de guardar');
    clearTimeout(timer); timer = setTimeout(() => flushAccount().catch(() => {}), 600);
  },
};
export async function flushAccount() {
  clearTimeout(timer);
  if (inFlight) { await inFlight; if (dirty) return flushAccount(); return; }
  if (failure) throw new Error(failure);
  if (!dirty) return;
  const sent = data;
  notify('Guardando en el servidor…');
  inFlight = api('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: sent, revision }) }).then(result => {
    revision = result.revision; dirty = data !== sent;
    try { localStorage.setItem(`ronda-account:${accountId}`, JSON.stringify({ data, revision, dirty })); } catch { /* Remote save succeeded; no local quota may report it as failed. */ }
    notify(dirty ? 'Cambios pendientes de guardar' : 'Guardado en el servidor');
  }).catch(error => { failure = error.message; notify(error.message, true); throw error; }).finally(() => { inFlight = null; });
  await inFlight;
  if (dirty) await flushAccount();
}
export async function retryAccount() { failure = null; return flushAccount(); }
export function accountSnapshot() { return { ...data }; }
export function recoverCopy(copy) {
  if (copy.revision !== revision) throw new Error('El servidor tiene otra revisión. No se reemplazará automáticamente; conserva la copia para recuperar los cambios.');
  data = { ...copy.data }; dirty = true; try { backup(); } catch { /* Recovery can still be saved remotely. */ }
}
window.addEventListener('beforeunload', event => { if (dirty || inFlight) { event.preventDefault(); event.returnValue = ''; } });
