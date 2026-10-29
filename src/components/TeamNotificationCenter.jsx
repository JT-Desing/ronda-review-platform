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

  return <div className="notification-center team-notifications" ref={wrap}>
    <button className="notification-trigger" aria-label={`${data.unread} notificaciones sin leer`} aria-expanded={open} onClick={() => { setOpen(!open); if (!open) load(); }}><Icon name="bell" size={17}/>{data.unread > 0 && <b>{data.unread > 99 ? '99+' : data.unread}</b>}</button>
    {open && <div className="notification-popover" role="dialog" aria-label="Notificaciones">
      <header><strong>Notificaciones</strong>{data.unread > 0 && <button onClick={readAll}>Marcar todas como leídas</button>}</header>
      {error && <p role="alert" className="team-notifications-error">{error}</p>}
      {!error && data.items.length === 0 && <p className="team-notifications-empty">Estás al día. Aquí verás las piezas nuevas, los comentarios y las menciones de tu equipo.</p>}
      <div className="team-notifications-list">{data.items.map(item => <button key={item.id} className={item.readAt ? '' : 'unread'} onClick={() => openItem(item)}>
        <strong>{item.line}</strong>
        {item.details?.text && <q>{item.details.text}</q>}
        <span>{item.details?.projectName ? `${item.details.projectName} · ` : ''}{relativeTime(item.createdAt)}</span>
      </button>)}</div>
    </div>}
  </div>;
}
