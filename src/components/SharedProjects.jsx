import React, { useEffect, useState } from 'react';
import { api } from '../state/accountStorage.js';
import './shared-projects.css';
const send = (path, method, input) => api(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
const date = value => new Date(value).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

export function SharedProjects({ onNotify, onDirtyChange }) {
  const [spaces, setSpaces] = useState([]), [space, setSpace] = useState(''), [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(''), [detail, setDetail] = useState(null), [role, setRole] = useState('');
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [refresh, setRefresh] = useState(0);
  const [creating, setCreating] = useState(false), [name, setName] = useState(''), [client, setClient] = useState(''), [createKey, setCreateKey] = useState(() => crypto.randomUUID());
  const [drafts, setDrafts] = useState({}), [editing, setEditing] = useState(null), [query, setQuery] = useState('');
  useEffect(() => { onDirtyChange?.(Object.values(drafts).some(item => item.text.trim()) || Boolean(name.trim()) || Boolean(editing)); }, [drafts, name, editing, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setDetail(null);
    (async () => {
      const response = await api('/api/workspaces');
      const currentSpace = response.workspaces.some(item => item.id === space) ? space : response.workspaces[0]?.id;
      const listing = currentSpace ? await api(`/api/workspaces/${currentSpace}/projects`) : null;
      const currentProject = listing?.projects.some(item => item.id === selected) ? selected : '';
      const projectDetail = currentProject ? await api(`/api/workspaces/${currentSpace}/projects/${currentProject}`) : null;
      if (active) {
        setSpaces(response.workspaces); setProjects(listing?.projects ?? []); setRole(listing?.workspace.role ?? ''); setDetail(projectDetail);
        if (currentSpace && currentSpace !== space) setSpace(currentSpace);
      }
    })().catch(reason => { if (active) { setError(reason.message); setProjects([]); setRole(''); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [space, selected, refresh]);
  const canEdit = ['admin', 'editor'].includes(role);
  const draftId = `${space}:${selected}`;
  const draft = drafts[draftId] ?? { text: '', requestId: crypto.randomUUID() };
  useEffect(() => {
    if (!Object.values(drafts).some(item => item.text.trim()) && !name.trim() && !editing) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [drafts, name, editing]);
  async function mutate(operation, message) {
    if (busy) return;
    setBusy(true); setError('');
    try { await operation(); onNotify(message); setRefresh(value => value + 1); }
    catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }
  const path = `/api/workspaces/${space}/projects`;
  const filtered = projects.filter(project => `${project.name} ${project.client}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="dashboard-page shared-projects">
    <header className="dashboard-header"><div><span className="eyebrow">COLABORACIÓN DEL EQUIPO</span><h1>Proyectos compartidos</h1><p>Un espacio común para organizar y comentar.</p></div><button disabled={busy || loading} onClick={() => setRefresh(value => value + 1)}>Actualizar</button></header>
    <p className="shared-scope">Los miembros de este espacio pueden ver estos nombres y comentarios generales. Archivos, anotaciones y aprobaciones de tus proyectos privados no se copian ni se comparten aquí todavía.</p>
    <div className="shared-toolbar"><label>Espacio del equipo<select disabled={busy || loading || !spaces.length} value={space} onChange={event => { setSpace(event.target.value); setSelected(''); setEditing(null); setCreating(false); }}>{spaces.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Buscar proyecto compartido<input type="search" placeholder="Nombre o cliente" value={query} onChange={event => setQuery(event.target.value)} /></label>{canEdit && <button disabled={busy || loading} className="primary-action" onClick={() => setCreating(true)}>Nuevo proyecto compartido</button>}</div>
    {error && <div role="alert" className="shared-feedback"><p>{error}</p><button disabled={busy} onClick={() => setRefresh(value => value + 1)}>Actualizar datos</button></div>}
    {loading && <p role="status">Cargando proyectos compartidos…</p>}
    {creating && canEdit && <form className="shared-panel" onSubmit={event => { event.preventDefault(); mutate(async () => { const result = await send(path, 'POST', { name, client, requestId: createKey }); setName(''); setClient(''); setCreateKey(crypto.randomUUID()); setCreating(false); setSelected(result.project.id); }, 'Proyecto compartido creado'); }}><h2>Nuevo proyecto compartido</h2><p>Visible para los miembros actuales y futuros de este espacio. No publiques información privada de otro cliente.</p><label>Nombre del proyecto compartido<input required maxLength={100} value={name} onChange={event => { setName(event.target.value); setCreateKey(crypto.randomUUID()); }} /></label><label>Cliente del proyecto compartido<input maxLength={100} value={client} onChange={event => { setClient(event.target.value); setCreateKey(crypto.randomUUID()); }} /></label><footer><button disabled={busy} type="button" onClick={() => setCreating(false)}>Cerrar formulario</button><button className="primary-action" disabled={busy || !name.trim()} type="submit">Crear proyecto compartido</button></footer></form>}
    {!loading && !error && <div className="shared-layout"><section className="shared-list" aria-label="Listado de proyectos compartidos">{filtered.length ? filtered.map(project => <button className={`shared-project-row ${selected === project.id ? 'selected' : ''}`} key={project.id} disabled={busy} aria-pressed={selected === project.id} onClick={() => { setSelected(project.id); setEditing(null); }}><span><strong>{project.name}</strong><small>{project.client || 'Sin cliente'}</small></span><span className="shared-count">{project.open_comments} pendientes</span></button>) : <div className="shared-empty"><h2>{query ? 'Sin resultados' : 'El espacio está listo'}</h2><p>{query ? 'Prueba otro nombre o cliente.' : canEdit ? 'Crea el primer proyecto para conversar con tu equipo.' : 'Un administrador o editor puede crear el primer proyecto.'}</p>{query && <button onClick={() => setQuery('')}>Limpiar búsqueda</button>}</div>}</section>
      {detail ? <section className="shared-panel shared-conversation" aria-label="Conversación del proyecto"><header><div><span className="eyebrow">PROYECTO DEL EQUIPO</span><h2>{detail.project.name}</h2><p>{detail.project.client || 'Sin cliente'}</p></div>{canEdit && <button disabled={busy} onClick={() => setEditing({ name: detail.project.name, client: detail.project.client, revision: detail.project.revision })}>Editar proyecto</button>}</header>
        {editing && canEdit && <form onSubmit={event => { event.preventDefault(); mutate(async () => { await send(`${path}/${selected}`, 'PATCH', editing); setEditing(null); }, 'Proyecto actualizado'); }}><label>Editar nombre<input maxLength={100} required value={editing.name} onChange={event => setEditing({ ...editing, name: event.target.value })} /></label><label>Editar cliente<input maxLength={100} value={editing.client} onChange={event => setEditing({ ...editing, client: event.target.value })} /></label><footer><button type="button" disabled={busy} onClick={() => setEditing(null)}>Cancelar edición</button><button type="submit" disabled={busy || !editing.name.trim()}>Guardar proyecto</button></footer></form>}
        <div className="shared-comments">{detail.comments.length ? detail.comments.map(comment => <article key={comment.id} className={comment.status === 'resolved' ? 'resolved' : ''}><header><strong>{comment.author || 'Cuenta retirada'}</strong><time dateTime={comment.created_at}>{date(comment.created_at)}</time></header><p>{comment.text}</p><footer><span>{comment.status === 'resolved' ? 'Resuelto' : 'Abierto'}</span>{canEdit && <button disabled={busy} onClick={() => mutate(() => send(`${path}/${selected}/comments/${comment.id}`, 'PATCH', { status: comment.status === 'open' ? 'resolved' : 'open', revision: comment.revision }), 'Estado del comentario actualizado')}>{comment.status === 'open' ? 'Resolver' : 'Reabrir'}</button>}</footer></article>) : <p className="shared-empty">Todavía no hay comentarios. Deja una indicación general para el equipo.</p>}</div>
        <form className="shared-composer" onSubmit={event => { event.preventDefault(); mutate(async () => { await send(`${path}/${selected}/comments`, 'POST', { text: draft.text, requestId: draft.requestId }); setDrafts(value => ({ ...value, [draftId]: { text: '', requestId: crypto.randomUUID() } })); }, 'Comentario compartido publicado'); }}><label>Comentario para el equipo<textarea required maxLength={2000} rows={3} value={draft.text} placeholder="Describe el cambio o la indicación para este proyecto…" onChange={event => setDrafts(value => ({ ...value, [draftId]: { text: event.target.value, requestId: crypto.randomUUID() } }))} /></label><footer><small>{draft.text.length}/2000 · visible para el equipo</small><button className="primary-action" disabled={busy || !draft.text.trim()} type="submit">Publicar comentario</button></footer></form><small>Últimos 100 comentarios. Usa Actualizar para consultar cambios de otras sesiones; no hay sincronización en tiempo real ni avisos por correo.</small>
      </section> : <section className="shared-panel shared-empty"><h2>Elige un proyecto</h2><p>Abre un proyecto del listado para ver la conversación del equipo.</p></section>}
    </div>}
  </div>;
}
