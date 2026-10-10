import React, { useEffect, useRef, useState } from 'react';
import { useRonda } from '../state/RondaContext.jsx';
import { projectOverview, projectStatusLabels } from '../domain/project-presentation.js';
import { AssetPreview } from './DeliveryGrid.jsx';
import Icon from './Icon.jsx';

function CoverArt({ palette = 0 }) {
  return <span className={`studio-art palette-${palette}`} aria-hidden="true"><i/><i/><i/></span>;
}

function StudioPreview({ asset }) {
  const container = useRef(null), [visible, setVisible] = useState(false);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '100px' });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [asset.id]);
  return <span ref={container} className="studio-media">{visible ? <AssetPreview asset={asset}/> : <span className="preview-placeholder">Vista previa</span>}</span>;
}

function ProjectTile({ project, onOpen }) {
  // The API currently serves originals, not thumbnails. Avoid downloading large media just for a card.
  const media = project.assets.find(asset => ['image','video'].includes(asset.type));
  const preview = media && media.size > 0 && media.size <= 8 * 1024 * 1024 ? media : null;
  const resetTilt = event => { event.currentTarget.style.removeProperty('--folder-x'); event.currentTarget.style.removeProperty('--folder-y'); };
  const tilt = event => {
    if (event.pointerType !== 'mouse' || !window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return;
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--folder-x', `${((event.clientX-box.left)/box.width-.5)*6}deg`);
    event.currentTarget.style.setProperty('--folder-y', `${-((event.clientY-box.top)/box.height-.5)*6}deg`);
  };
  return <button className={`studio-project folder-project palette-${project.palette} ${preview ? 'with-preview' : ''}`} onClick={() => onOpen(project)} onPointerMove={tilt} onPointerLeave={resetTilt} onBlur={resetTilt}>
    <div className="studio-project-cover">{preview ? <StudioPreview asset={preview}/> : <CoverArt palette={project.palette}/>}</div>
    <span className="folder-project-tab" aria-hidden="true"><Icon name="folder" size={20}/></span>
    <span className="studio-tile-arrow" aria-hidden="true"><Icon name="arrow" size={20}/></span>
    <div className="studio-project-copy"><span className="studio-category">{media ? media.type === 'video' ? 'Video' : 'Imagen' : 'Proyecto'}</span><strong>{project.name}</strong><span className="studio-client">{project.client || 'Sin cliente'}</span><footer><span>{project.assets.length} piezas · {project.pending} pendientes</span><span className={`studio-status ${project.status}`}>{projectStatusLabels[project.status]}</span></footer></div>
  </button>;
}

export function ProjectLibrary({ onOpen, onNotify }) {
  const { state, act } = useRonda();
  const [query, setQuery] = useState(''), [filter, setFilter] = useState('all'), [layout, setLayout] = useState('grid');
  const [creating, setCreating] = useState(false), [name, setName] = useState(''), [client, setClient] = useState(''), [detail, setDetail] = useState(null);
  const all = projectOverview(state).projects;
  const projects = all.filter(project => `${project.name} ${project.client || ''}`.toLowerCase().includes(query.toLowerCase()) && (filter === 'all' || project.status === filter));
  const open = project => project.activeVersionId ? onOpen(project) : setDetail(project);
  return <div className="dashboard-page studio-library">
    <header className="dashboard-header"><div><span className="eyebrow">TU BIBLIOTECA CREATIVA</span><h1>Todos los proyectos</h1><p>Organiza tus piezas y continúa la siguiente revisión.</p></div><button className="studio-primary" onClick={() => setCreating(true)}>＋ Nuevo proyecto</button></header>
    <div className="studio-library-toolbar"><label className="studio-search"><span aria-hidden="true">⌕</span><input type="search" aria-label="Buscar proyecto o cliente" placeholder="Buscar proyecto o cliente…" value={query} onChange={event => setQuery(event.target.value)}/></label><div className="studio-filters" aria-label="Filtrar proyectos">{[['all','Todos'],['in_review','En revisión'],['changes_requested','Cambios'],['approved','Aprobados'],['draft','Sin piezas']].map(([value,label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div><div className="studio-layout-switch" aria-label="Vista de proyectos"><button aria-label="Vista de tarjetas" aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')}>▦</button><button aria-label="Vista de lista" aria-pressed={layout === 'list'} onClick={() => setLayout('list')}>☰</button></div></div>
    {creating && <form className="studio-create" onSubmit={event => { event.preventDefault(); if(!name.trim())return; act('project/add',{name,client}); setName('');setClient('');setCreating(false);onNotify('Proyecto creado; guardado en curso'); }}><header><h2>Nuevo proyecto</h2><p>Se guarda en tu cuenta privada.</p></header><label>Nombre del proyecto<input autoFocus required maxLength={100} placeholder="Ej. Campaña de octubre" value={name} onChange={event => setName(event.target.value)}/></label><label>Cliente <small>Opcional</small><input maxLength={100} placeholder="Nombre del cliente" value={client} onChange={event => setClient(event.target.value)}/></label><footer><button type="button" onClick={() => setCreating(false)}>Cancelar</button><button className="studio-primary" disabled={!name.trim()}>Crear proyecto</button></footer></form>}
    <section className={`studio-project-grid ${layout}`} aria-label="Proyectos privados">{projects.map(project => <ProjectTile key={project.id} project={project} onOpen={open}/>)}</section>
    {!projects.length && <div className="studio-empty"><h2>{all.length ? 'No encontramos esos proyectos' : 'Tu primera campaña empieza aquí'}</h2><p>{all.length ? 'Cambia los filtros o prueba otro nombre.' : 'Crea un proyecto para organizar tu trabajo.'}</p>{all.length ? <button onClick={() => {setQuery('');setFilter('all');}}>Limpiar filtros</button> : <button className="studio-primary" onClick={() => setCreating(true)}>Crear proyecto</button>}</div>}
    {detail && <section className="studio-create" aria-label="Detalle del proyecto"><h2>{detail.name}</h2><p>{detail.client || 'Sin cliente'}</p><p>Este proyecto está guardado sin piezas. La carga y revisión de archivos por proyecto aún necesita conectarse; no se reutilizan archivos de otra campaña.</p><button onClick={() => setDetail(null)}>Cerrar detalle</button></section>}
    <p className="studio-private-note">{projects.length} {projects.length === 1 ? 'proyecto' : 'proyectos'} · Privados de tu cuenta. Usa Compartidos con el equipo para conversar en un espacio común.</p>
  </div>;
}

export function StudioHome({ onNavigate, onOpen }) {
  const {state} = useRonda(); const summary=projectOverview(state);
  const reviewer=state.members[state.currentUserId];
  const next=summary.projects.find(project => project.activeVersionId);
  const total=Object.values(state.comments).length, resolved=Object.values(state.comments).filter(comment => comment.status === 'resolved').length;
  const percent=total ? Math.round(resolved/total*100) : 0;
  const pending=Object.values(state.comments).filter(comment => comment.status==='open').slice(0,3);
  return <div className="dashboard-page studio-home"><div className="studio-home-layout"><div>
    <section className="studio-welcome"><CoverArt palette={0}/><div><span className="eyebrow">TU ESPACIO CREATIVO</span><h1>Una nueva ronda.<br/>Una mejor versión.</h1><p>{reviewer?.name?.split(' ')[0] || 'Hola'}, continúa donde lo dejaste y da forma a tu próxima entrega.</p><button className="studio-primary" onClick={() => next ? onOpen(next) : onNavigate('projects')}>{next ? 'Continuar revisión' : 'Abrir proyectos'} <span aria-hidden="true">→</span></button></div></section>
    <header className="studio-section-heading"><h2>Tus proyectos</h2><button onClick={() => onNavigate('projects')}>Ver todos →</button></header>
    <section className="studio-project-grid home-cards" aria-label="Proyectos de tu cuenta">{summary.projects.slice(0,3).map(project => <ProjectTile key={project.id} project={project} onOpen={() => project.activeVersionId ? onOpen(project) : onNavigate('projects')}/>)}</section>
    {!summary.projects.length && <p className="studio-empty">No hay proyectos todavía. Crea el primero desde Proyectos.</p>}
  </div><aside className="studio-home-aside"><section className="studio-home-panel"><h2>Estado de revisión</h2><div className="studio-progress"><div className="studio-progress-ring" style={{'--progress':`${percent}%`}}><strong>{total ? `${percent}%` : '—'}</strong></div><p>{total ? `${resolved} de ${total} comentarios resueltos` : 'Todavía no hay comentarios'}</p></div><div className="studio-counts"><span><strong>{summary.projects.length}</strong>Proyectos</span><span><strong>{summary.assets}</strong>Piezas</span><span><strong>{summary.pending}</strong>Pendientes</span></div><small>Datos de tu cuenta privada, no del equipo compartido.</small></section>
    <section className="studio-home-panel"><h2>Siguiente revisión</h2>{next ? <><div className="studio-next"><CoverArt palette={next.palette}/><div><strong>{next.name}</strong><small>{next.version?.name || 'Versión actual'}</small></div></div><button className="studio-primary" onClick={() => onOpen(next)}>Abrir revisión →</button></> : <p>Cuando tengas una pieza para revisar, podrás retomarla aquí.</p>}</section>
    <section className="studio-home-panel"><h2>Comentarios abiertos</h2>{pending.length ? pending.map(comment => <button className="studio-pending" key={comment.id} onClick={() => onNavigate('activity')}><span className="studio-pending-dot"/><span>{comment.text || 'Comentario de audio'}</span><span aria-hidden="true">↗</span></button>) : <p>No hay comentarios pendientes. Todo listo para una nueva ronda.</p>}<button className="studio-text-action" onClick={() => onNavigate('activity')}>Ver actividad →</button></section>
  </aside></div></div>;
}
