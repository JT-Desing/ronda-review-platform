import React, { useEffect, useRef, useState } from 'react';
import { useAccountActions } from './AccountAccess.jsx';

export function AccountProfileMenu({ initials, onNavigate }) {
  const { user, status, busy, retrySave, openImport, logout } = useAccountActions();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const closeOnOutside = event => { if (!menuRef.current?.contains(event.target)) setOpen(false); };
    const closeOnEscape = event => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'Mi cuenta';
  const closeAnd = action => { setOpen(false); action?.(); };
  return <div className="account-profile-menu" ref={menuRef}>
    <button className={`account-profile-trigger${status.error ? ' has-sync-error' : ''}`} type="button" aria-label={`Perfil de ${user?.name || 'mi cuenta'}. ${status.message}`} aria-expanded={open} aria-controls="account-profile-popover" onClick={() => setOpen(value => !value)}>
      <span className="avatar small" aria-hidden="true">{initials || firstName.slice(0, 2).toUpperCase()}</span>
      <span className="account-profile-trigger-copy"><strong>{firstName}</strong>{status.error && <small>Hay un problema al guardar</small>}</span>
      <span className="account-profile-chevron" aria-hidden="true">⌄</span>
    </button>
    {open && <section className="account-profile-popover" id="account-profile-popover" aria-label="Perfil y cuenta">
      <header className="account-profile-heading"><span className="avatar small" aria-hidden="true">{initials || firstName.slice(0, 2).toUpperCase()}</span><span><strong>{user?.name}</strong><small>{user?.email}</small></span></header>
      <div className={`account-profile-sync${status.error ? ' is-error' : ''}`} role="status" aria-live="polite">
        <span className="account-profile-sync-dot" aria-hidden="true"/>
        <span><strong>{status.message}</strong><small>{status.error ? 'Tus cambios pueden seguir pendientes.' : 'Estado de sincronización de tu cuenta'}</small></span>
      </div>
      {status.error && <button className="account-profile-action" type="button" onClick={retrySave}>Reintentar guardado</button>}
      {onNavigate && <nav className="account-profile-links" aria-label="Accesos de cuenta">
        <button type="button" onClick={() => closeAnd(() => onNavigate('personal'))}>Mis proyectos personales</button>
        <button type="button" onClick={() => closeAnd(() => onNavigate('settings'))}>Configuración</button>
      </nav>}
      <div className="account-profile-actions">
        <button className="account-profile-action" type="button" onClick={() => closeAnd(openImport)}>Importar copia local</button>
        <button className="account-profile-action is-logout" type="button" disabled={busy} onClick={() => closeAnd(logout)}>{busy ? 'Guardando y cerrando…' : 'Cerrar sesión'}</button>
      </div>
    </section>}
  </div>;
}
