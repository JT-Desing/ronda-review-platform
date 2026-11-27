import React, { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { setSharedProjectLocation } from '../domain/shared-project-link.js';
import { relativeTime } from '../domain/relative-time.js';
import './team-notifications.css';

const POLL_MS = 60000;
async function request(path, init) {
  const response = await fetch(path, { credentials: 'same-origin', ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'No se pudieron cargar las notificaciones.');
  return data;
}
const markRead = input => request('/api/notifications/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
const initials = name => String(name || '?').trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase();

// Bell backed by the server: new pieces, versions, comments, mentions and decisions of the teams.
export function TeamNotificationCenter() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ items: [], unread: 0 });
  const [error, setError] = useState('');
  const wrap = useRef(null);
  const load = useCallback(() => request('/api/notifications').then(value => { setData(value); setError(''); }).catch(failure => setError(failure.message)), []);

  useEffect(() => {
    load();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') load(); }, POLL_MS);
    const onFocus = () => load();
    addEventListener('focus', onFocus);
    return () => { clearInterval(timer); removeEventListener('focus', onFocus); };
  }, [load]);
  useEffect(() => {
    if (!open) return undefined;
    const close = event => { if (event.key === 'Escape' || (event.type === 'pointerdown' && !wrap.current?.contains(event.target))) setOpen(false); };
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', close);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close); };
  }, [open]);

  const openItem = async item => {
    setOpen(false);
    if (!item.readAt) markRead({ ids: [item.id] }).then(load).catch(() => {});
    if (item.details?.projectId) setSharedProjectLocation(window, item.workspaceId, item.details.projectId);
  };
  const readAll = () => markRead({ all: true }).then(load).catch(failure => setError(failure.message));
  const unreadCount = Number(data.unread) || 0;

  return <div className="notification-center team-notifications" ref={wrap}>
    <button className="notification-trigger" aria-label={`${unreadCount} notificaciones sin leer`} aria-expanded={open} aria-controls="team-notification-popover" onClick={() => { setOpen(!open); if (!open) load(); }}><Icon name="bell" size={17}/>{unreadCount > 0 && <b>{unreadCount > 99 ? '99+' : unreadCount}</b>}</button>
    {open && <div id="team-notification-popover" className="notification-popover" role="dialog" aria-label="Notificaciones">
      <header className="notification-header"><div><strong>Notificaciones</strong><span>{unreadCount ? `${unreadCount} sin leer` : 'Estás al día'}</span></div>{unreadCount > 0 && <button onClick={readAll}>Marcar leídas</button>}</header>
      {error && <p role="alert" className="team-notifications-error">{error}</p>}
      {!error && data.items.length === 0 && <div className="notification-empty"><span className="notification-empty-icon"><Icon name="bell" size={16}/></span><strong>Todo al día</strong><p>Aquí aparecerán las novedades de tus proyectos y tu equipo.</p></div>}
      <div className="notification-list">{data.items.map(item => {
        const details = item.details || {};
        const context = [details.projectName, details.assetName, details.versionNumber ? `V${details.versionNumber}` : ''].filter(Boolean).join(' · ');
        return <button key={item.id} className={`notification-item${item.readAt ? '' : ' unread'}`} onClick={() => openItem(item)}>
        <span className="notification-avatar" aria-hidden="true">{initials(item.actorName)}</span>
        <span className="notification-item-body"><span className="notification-item-title">{item.line}</span>
        {context && <span className="notification-context">{context}</span>}
        {details.text && <span className="notification-detail">{details.text}</span>}
        <span className="notification-time">{relativeTime(item.createdAt)}</span></span>
        {!item.readAt && <span className="notification-unread-dot" aria-label="Sin leer"/>}
      </button>})}</div>
    </div>}
  </div>;
}
