import React, { useEffect, useState } from 'react';
import './account-access.css';
import {readLegacyFile, fileStore} from './DeliveryGrid.jsx';
import {importAccountState} from '../domain/account-import.js';
import { createSeedState, STORAGE_KEY } from '../data/seed.js';
import { RondaProvider } from '../state/RondaContext.jsx';
import { api, accountStorage, initializeAccount, flushAccount, retryAccount, pendingAccountCopy, recoverCopy } from '../state/accountStorage.js';

function freshState(user) {
  const state = createSeedState();
  state.currentUserId = user.id;
  state.workspace = { id: `account-${user.id}`, name: `Espacio de ${user.name}`, plan: 'free' };
  state.members = { [user.id]: { ...user, initials: user.name.slice(0, 2).toUpperCase(), role: 'admin', status: 'active' } };
  state.projects['project-amara'] = { ...state.projects['project-amara'], name: 'Mi primera revisión', client: '' };
  state.versions['version-amara-v3'] = { ...state.versions['version-amara-v3'], name: 'Primera revisión', reviewerIds: [user.id], decisions: {} };
  state.comments = {}; state.annotations = {}; state.assets = [];
  return state;
}
export default function AccountAccess({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('login');
  const [error, setError] = useState(new URLSearchParams(location.search).has('authError') ? 'No se pudo completar el acceso con Google. Si ya tienes cuenta con ese correo, usa tu contraseña.' : '');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ message: 'Guardado en el servidor', error: false });
  const [ready, setReady] = useState(false);
  const [importing, setImporting] = useState(false);
  const [mount, setMount] = useState(0);
  const [pending, setPending] = useState(null);
  const [google, setGoogle] = useState(false);
  async function enter(account) {
    const snapshot = await api('/api/data');
    initializeAccount(account, snapshot);
    const copy = pendingAccountCopy(); setPending(copy);
    if (!snapshot.data[STORAGE_KEY] && !copy) accountStorage.setItem(STORAGE_KEY, JSON.stringify(freshState(account)));
    setUser(account); setReady(true);
  }
  useEffect(() => { api('/api/auth/session').then(async result => { if (result.user) await enter(result.user); }).catch(e => setError(e.message)).finally(() => setLoading(false)); }, []);
  useEffect(() => { api('/api/health').then(result => setGoogle(result.google)).catch(() => {}); }, []);
  useEffect(() => { const listener = event => setStatus(event.detail); window.addEventListener('ronda-sync', listener); return () => window.removeEventListener('ronda-sync', listener); }, []);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const input = Object.fromEntries(new FormData(event.currentTarget));
    try { const result = await api(`/api/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }); await enter(result.user); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError('');
    try { await flushAccount(); await api('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); setUser(null); setReady(false); }
    catch (e) { setError(`No se cerró la sesión para no perder cambios: ${e.message}`); } finally { setBusy(false); }
  }
  async function importLocal() {
    setBusy(true); setError('');
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) throw new Error('No hay datos anteriores en este navegador.');
      const old = JSON.parse(raw);
      const imported = importAccountState(old,user);
      // Upload original IndexedDB media before importing references; old local data stays intact.
      const pauta = JSON.parse(localStorage.getItem('ronda-pauta:v1') || '{"groups":[],"campaigns":[]}');
      const ids = new Set([...(old.assets ?? []).map(a => a.id), ...(pauta.campaigns ?? []).flatMap(c => c.pieces ?? []).map(p => p.assetId).filter(Boolean)]);
      for (const id of ids) {
        const file = await readLegacyFile(id);
        if (!file) throw new Error('Falta un archivo de la copia local; no se importaron los datos.');
        await fileStore(id, file);
      }
      accountStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
      accountStorage.setItem('ronda-pauta:v1', JSON.stringify(pauta));
      await flushAccount(); setImporting(false); setMount(v => v + 1);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  if (loading) return <main className="account-access"><p role="status">Comprobando tu sesión…</p></main>;
  if (!user || !ready) return <main className="account-access"><section className="account-card">
    <span className="account-wordmark">ronda<span>®</span></span>
    <h1>{mode === 'login' ? 'Tu próxima ronda empieza aquí.' : 'Crea tu espacio de revisión.'}</h1>
    <p>Proyectos, archivos y comentarios guardados en tu servidor.</p>
    <div className="account-tabs"><button aria-pressed={mode === 'login'} onClick={() => { setMode('login'); setError(''); }}>Iniciar sesión</button><button aria-pressed={mode === 'register'} onClick={() => { setMode('register'); setError(''); }}>Crear cuenta</button></div>
    {google && <button className="account-primary" onClick={() => location.assign('/api/auth/google')}>Continuar con Google</button>}
    <form onSubmit={submit}>
      {mode === 'register' && <label>Nombre<input name="name" autoComplete="name" required maxLength={100}/></label>}
      <label>Correo<input name="email" type="email" autoComplete="email" required maxLength={254}/></label>
      <label>Contraseña<input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={12} maxLength={128}/></label>
      {mode === 'register' && <small>Usa al menos 12 caracteres. La verificación por correo y recuperación aún no están habilitadas.</small>}
      {error && <p role="alert" className="account-error">{error}</p>}
      <button className="account-primary" disabled={busy}>{busy ? 'Conectando…' : mode === 'login' ? 'Entrar a Ronda' : 'Crear cuenta'}</button>
    </form>
    <p className="account-note">{!google && 'Google pendiente de configuración. '}Los datos viven en el PC que aloja Ronda; si está apagado, el servicio no estará disponible.</p>
  </section></main>;
  return <>
    <div className="account-bar"><span>{user.name} <small>{user.email}</small></span><span role="status" className={status.error ? 'account-error' : ''}>{status.message}</span>{status.error && <button onClick={() => retryAccount().catch(e => setError(e.message))}>Reintentar</button>}<button onClick={() => setImporting(v => !v)}>Importar copia local</button><button disabled={busy} onClick={logout}>Cerrar sesión</button></div>
    {error && <div className="account-alert" role="alert">{error}</div>}
    {pending ? <div className="account-alert">Hay una copia local con cambios pendientes.
      <button disabled={busy} onClick={async () => { try { recoverCopy(pending); await flushAccount(); setMount(v => v + 1); setPending(null); } catch (e) { setError(e.message); } }}>Recuperar copia</button>
      <button onClick={() => { if (!accountStorage.getItem(STORAGE_KEY)) accountStorage.setItem(STORAGE_KEY, JSON.stringify(freshState(user))); setPending(null); }}>Usar versión del servidor</button>
      <button onClick={() => { const url=URL.createObjectURL(new Blob([JSON.stringify(pending)],{type:'application/json'})); const link=document.createElement('a'); link.href=url;link.download='ronda-cambios-pendientes.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }}>Descargar copia pendiente</button>
    </div> : <>
      {importing && <section className="account-import"><h2>Importar datos de este navegador</h2><p>Reemplaza los datos de esta cuenta con la copia anterior, incluyendo Pauta y medios disponibles. No borra el original. Los nombres del equipo importado son referencias locales, no cuentas invitadas.</p><button disabled={busy} onClick={importLocal}>{busy ? 'Importando…' : 'Confirmar importación'}</button><button disabled={busy} onClick={() => setImporting(false)}>Cancelar</button></section>}
      <RondaProvider key={`${user.id}:${mount}`} storage={accountStorage}>{children}</RondaProvider>
    </>}
  </>;
}
