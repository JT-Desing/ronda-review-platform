import React, { useState } from 'react';
import { api } from '../state/accountStorage.js';

// Ends the account for good: personal work is erased, team work stays with the team.
export function AccountDeletion({ email, onClose }) {
  const [typed, setTyped] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const matches = typed.trim().toLowerCase() === (email || '').toLowerCase();
  async function confirm(event) {
    event.preventDefault();
    if (!matches || busy) return;
    setBusy(true); setError('');
    try {
      await api('/api/account/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmEmail: typed }) });
      try { Object.keys(localStorage).filter(key => key.startsWith('ronda')).forEach(key => localStorage.removeItem(key)); } catch { /* storage may be blocked */ }
      location.replace('/');
    } catch (reason) { setError(reason.message); setBusy(false); }
  }
  return <div className="modal-layer"><button className="modal-scrim" aria-label="Cancelar" disabled={busy} onClick={onClose}/>
    <form className="modal project-delete-dialog" onKeyDown={event => { if (event.key === 'Escape' && !busy) onClose(); }} role="dialog" aria-modal="true" aria-labelledby="account-delete-title" onSubmit={confirm}>
      <h2 id="account-delete-title">Eliminar tu cuenta</h2>
      <p>Se borran tus proyectos personales, archivos y notificaciones, y sales de todos los equipos. Lo que subiste o comentaste en un equipo se queda con ese equipo, firmado como "Cuenta eliminada". No se puede deshacer.</p>
      <label>Escribe tu correo para confirmar<input autoFocus type="email" autoComplete="off" value={typed} disabled={busy} onChange={event => setTyped(event.target.value)}/></label>
      <footer><button type="button" disabled={busy} onClick={onClose}>Cancelar</button><button type="submit" className="project-delete-confirm" disabled={!matches || busy}>{busy ? 'Eliminando…' : 'Eliminar cuenta'}</button></footer>
      {error && <p role="alert">{error}</p>}
    </form></div>;
}
