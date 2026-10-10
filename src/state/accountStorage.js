import {demoSession} from './demoSession.js';
let accountId = null;
let data = {};
let revision = 0;
let timer;
let inFlight;
let dirty = false;
let failure = null;
export const currentAccountId = () => accountId;
export async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options });
  let result;
  try { result = await response.json(); } catch { throw new Error('El servidor de Ronda no está disponible. Revisa Docker y vuelve a intentar.'); }
  if (!response.ok) throw new Error(result.error ?? 'No se pudo completar la operación.');
  return result;
}
const notify = (message, error = false) => window.dispatchEvent(new CustomEvent('ronda-sync', { detail: { message, error } }));
const backup = () => localStorage.setItem(`ronda-account:${accountId}`, JSON.stringify({ data, revision, dirty: true }));
export function initializeAccount(user, snapshot) {
  clearTimeout(timer); accountId = user.id; data = { ...snapshot.data }; revision = snapshot.revision; dirty = false; failure = null;
}
export function pendingAccountCopy() {
  try { const copy = JSON.parse(localStorage.getItem(`ronda-account:${accountId}`)); return copy?.dirty ? copy : null; } catch { return null; }
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
