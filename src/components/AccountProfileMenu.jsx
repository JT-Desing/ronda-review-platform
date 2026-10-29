import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAccountActions } from './AccountAccess.jsx';
import Icon from './Icon.jsx';
import {canAccessStudioView} from '../domain/platform-access.js';

export function AccountProfileMenu({ initials, onNavigate }) {
  const { user, status, busy, retrySave, openImport, logout } = useAccountActions();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const [popoverPosition, setPopoverPosition] = useState(null);
  const updatePopoverPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
    const height = Math.min(popoverRef.current?.scrollHeight || 420, window.innerHeight - 24);
    const top = rect.bottom + 10 + height > window.innerHeight - 12
      ? Math.max(12, rect.top - height - 10)
      : rect.bottom + 10;
    setPopoverPosition({ top, left, width, maxHeight: window.innerHeight - 24 });
  }, []);
  useEffect(() => {
    if (!open) return;
    const closeOnOutside = event => {
      if (!menuRef.current?.contains(event.target) && !popoverRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = event => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', updatePopoverPosition);
    window.addEventListener('scroll', updatePopoverPosition, true);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition, true);
    };
  }, [open, updatePopoverPosition]);
  useLayoutEffect(() => {
    if (open) updatePopoverPosition();
    else setPopoverPosition(null);
  }, [open, updatePopoverPosition]);
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'Mi cuenta';
  const closeAnd = action => { setOpen(false); action?.(); };
  return <div className="account-profile-menu" ref={menuRef}>
    <button ref={triggerRef} className={`account-profile-trigger${status.error ? ' has-sync-error' : ''}`} type="button" aria-label={`Perfil de ${user?.name || 'mi cuenta'}. ${status.message}`} aria-expanded={open} aria-controls="account-profile-popover" onClick={() => setOpen(value => !value)}>
      <span className="avatar small" aria-hidden="true">{initials || firstName.slice(0, 2).toUpperCase()}</span>
      <span className="account-profile-trigger-copy"><strong>{firstName}</strong>{status.error && <small>Hay un problema al guardar</small>}</span>
      <Icon name="chevron" size={14} className="account-profile-chevron"/>
    </button>
    {open && popoverPosition && createPortal(<section ref={popoverRef} className="account-profile-popover" id="account-profile-popover" style={popoverPosition} aria-label="Perfil y cuenta">
      <header className="account-profile-heading"><span className="avatar small" aria-hidden="true">{initials || firstName.slice(0, 2).toUpperCase()}</span><span><strong>{user?.name}</strong><small>{user?.email}</small></span></header>
      <div className={`account-profile-sync${status.error ? ' is-error' : ''}`} role="status" aria-live="polite">
        <span className="account-profile-sync-dot" aria-hidden="true"/>
        <span><small className="account-profile-section-label">SINCRONIZACIÓN</small><strong>{status.message}</strong><small>{status.error ? 'Tus cambios pueden seguir pendientes.' : 'Tu cuenta está al día'}</small></span>
      </div>
      {status.error && <button className="account-profile-action" type="button" onClick={retrySave}>Reintentar guardado</button>}
      {onNavigate && <nav className="account-profile-links" aria-label="Accesos de cuenta">
        <small className="account-profile-section-label">TU ESPACIO</small>
        <button type="button" onClick={() => closeAnd(() => onNavigate('personal'))}><span className="account-profile-link-icon"><Icon name="folder" size={17}/></span><span><strong>Mis proyectos personales</strong><small>Archivos y revisiones privadas</small></span><Icon name="chevron" size={15}/></button>
        {canAccessStudioView(user,'platform')&&<button type="button" onClick={() => closeAnd(() => onNavigate('platform'))}><span className="account-profile-link-icon"><Icon name="users" size={17}/></span><span><strong>Planes y empresas</strong><small>Activar planes y crear empresas</small></span><Icon name="chevron" size={15}/></button>}
        {canAccessStudioView(user,'settings')&&<button type="button" onClick={() => closeAnd(() => onNavigate('settings'))}><span className="account-profile-link-icon"><Icon name="settings" size={17}/></span><span><strong>Configuración</strong><small>Preferencias de tu cuenta</small></span><Icon name="chevron" size={15}/></button>}
      </nav>}
      <div className="account-profile-actions">
        <small className="account-profile-section-label">DATOS Y SESIÓN</small>
        <button className="account-profile-action" type="button" onClick={() => closeAnd(openImport)}><Icon name="folder" size={16}/><span>Importar copia local</span><Icon className="account-profile-action-tail" name="chevron" size={14}/></button>
        <button className="account-profile-action is-logout" type="button" disabled={busy} onClick={() => closeAnd(logout)}><Icon name="logout" size={16}/><span>{busy ? 'Guardando y cerrando…' : 'Cerrar sesión'}</span></button>
      </div>
    </section>, document.body)}
  </div>;
}
