import React, { useEffect, useRef, useState } from 'react';
import { useRonda } from '../state/RondaContext.jsx';
import { projectOverview, projectStatusLabels, projectDetailMessage } from '../domain/project-presentation.js';
import { AssetPreview } from './DeliveryGrid.jsx';
import Icon from './Icon.jsx';
import {LiquidButton} from './LiquidButton.js';
import './project-rename.css';
import './project-detail.css';
import reviewCover from './review-cover.svg';
import {LinkImport} from './LinkImport.jsx';
import {DeletedAssets} from './DeletedAssets.jsx';

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

export function ProjectTile({ project, onOpen, onRename, onDelete, canRename=true, renameHelpText='El cambio solo afecta tu biblioteca privada.' }) {
  const {act} = useRonda();
  const [editing,setEditing] = useState(false), [draft,setDraft] = useState(project.name);
  const [saving,setSaving]=useState(false),[nameError,setNameError]=useState('');
  const editButton = useRef(null);
  const closeEditor = () => { setEditing(false); requestAnimationFrame(() => editButton.current?.focus()); };
  const saveName = async event => {
    event.preventDefault();
    if (!draft.trim() || draft.trim().length > 100) return;
    if(saving)return;
    setSaving(true);setNameError('');
    try{if(onRename)await onRename(draft.trim());else act('project/rename',{id:project.id,name:draft});closeEditor();}
    catch(error){setNameError(error.message||'No se pudo guardar el nombre.');}
    finally{setSaving(false);}
  };
  // The API currently serves originals, not thumbnails. Avoid downloading large media just for a card.
  const media = project.assets.find(asset => ['image','video'].includes(asset.type));
  const preview = media && media.size > 0 && media.size <= 8 * 1024 * 1024 ? media : null;
  return <article className={`studio-project folder-project palette-${project.palette} ${preview ? 'with-preview' : ''}`}>
    <button type="button" className="project-open-hitarea" onClick={() => onOpen(project)} aria-label={`Abrir proyecto ${project.name}`} />
    <div className="studio-project-cover">{preview ? <StudioPreview asset={preview}/> : <CoverArt palette={project.palette}/>}</div>
    <span className="folder-project-tab" aria-hidden="true"><Icon name="folder" size={20}/></span>
    <span className="studio-tile-arrow" aria-hidden="true"><Icon name="arrow" size={20}/></span>
    {onDelete&&!editing&&<button type="button" className="project-delete-trigger" aria-label={`Eliminar proyecto ${project.name}`} title="Eliminar proyecto" onClick={()=>onDelete(project)}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg></button>}
    <div className="studio-project-copy"><span className="studio-category">{media ? media.type === 'video' ? 'Video' : 'Imagen' : 'Proyecto'}</span>
      <div className="project-title-row">{editing ? <form className="project-rename-form" onSubmit={saveName} onKeyDown={event => {if(event.key === 'Escape'){event.preventDefault();closeEditor();}}}>
        <label>Nombre del proyecto<input autoFocus disabled={saving} required maxLength={100} value={draft} onChange={event=>setDraft(event.target.value)} onFocus={event=>event.target.select()}/></label>
        <div><button type="submit" disabled={!draft.trim()}>Guardar</button><button type="button" onClick={closeEditor}>Cancelar</button></div><small>{renameHelpText}</small>
      </form> : <><strong>{project.name}</strong>{canRename&&<button ref={editButton} type="button" className="project-rename-trigger" aria-label={`Editar nombre de ${project.name}`} title="Editar nombre" onClick={()=>{setDraft(project.name);setEditing(true);}}><Icon name="pen" size={18}/></button>}</>}</div>
      <span className="studio-client">{project.client || 'Sin cliente'}</span><footer><span>{project.assetCount ?? project.assets.length} piezas · {project.pending} pendientes</span><span className={`studio-status ${project.status}`}>{projectStatusLabels[project.status]}</span></footer></div>
  </article>;
}

export function ProjectLibrary({ onOpen, onNotify }) {
  const { state, act } = useRonda();
  const [query, setQuery] = useState(''), [filter, setFilter] = useState('all'), [layout, setLayout] = useState('grid');
  const [creating, setCreating] = useState(false), [name, setName] = useState(''), [client, setClient] = useState(''), [detail, setDetail] = useState(null);
  const all = projectOverview(state).projects;
  const projects = all.filter(project => `${project.name} ${project.client || ''}`.toLowerCase().includes(query.toLowerCase()) && (filter === 'all' || project.status === filter));
  const selectedDetail = detail ? all.find(project => project.id === detail.id) : null;
  const open = project => project.activeVersionId ? onOpen(project) : setDetail(project);
  return <div className="dashboard-page studio-library">
    <header className="dashboard-header"><div><span className="eyebrow">TU BIBLIOTECA CREATIVA</span><h1>Mis proyectos personales</h1><p>Solo tú puedes ver los proyectos y piezas de esta sección.</p></div><LiquidButton onClick={() => setCreating(true)}>＋ Nuevo proyecto</LiquidButton></header>
    <div className="studio-library-toolbar"><label className="studio-search"><span aria-hidden="true">⌕</span><input type="search" aria-label="Buscar proyecto o cliente" placeholder="Buscar proyecto o cliente…" value={query} onChange={event => setQuery(event.target.value)}/></label><div className="studio-filters" aria-label="Filtrar proyectos">{[['all','Todos'],['in_review','En revisión'],['changes_requested','Cambios'],['approved','Aprobados'],['draft','Sin piezas']].map(([value,label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div><div className="studio-layout-switch" aria-label="Vista de proyectos"><button aria-label="Vista de tarjetas" aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')}>▦</button><button aria-label="Vista de lista" aria-pressed={layout === 'list'} onClick={() => setLayout('list')}>☰</button></div></div>
    {creating && <form className="studio-create" onSubmit={event => { event.preventDefault(); if(!name.trim())return; act('project/add',{name,client}); setName('');setClient('');setCreating(false);onNotify('Proyecto creado; guardado en curso'); }}><header><h2>Nuevo proyecto</h2><p>Se guarda en tu cuenta privada.</p></header><label>Nombre del proyecto<input autoFocus required maxLength={100} placeholder="Ej. Campaña de octubre" value={name} onChange={event => setName(event.target.value)}/></label><label>Cliente <small>Opcional</small><input maxLength={100} placeholder="Nombre del cliente" value={client} onChange={event => setClient(event.target.value)}/></label><footer><button type="button" onClick={() => setCreating(false)}>Cancelar</button><button className="studio-primary" disabled={!name.trim()}>Crear proyecto</button></footer></form>}
    <section className={`studio-project-grid ${layout}`} aria-label="Proyectos privados">{projects.map(project => <ProjectTile key={project.id} project={project} onOpen={open}/>)}</section>
    {!projects.length && <div className="studio-empty"><h2>{all.length ? 'No encontramos esos proyectos' : 'Tu primera campaña empieza aquí'}</h2><p>{all.length ? 'Cambia los filtros o prueba otro nombre.' : 'Crea un proyecto para organizar tu trabajo.'}</p>{all.length ? <button onClick={() => {setQuery('');setFilter('all');}}>Limpiar filtros</button> : <button className="studio-primary" onClick={() => setCreating(true)}>Crear proyecto</button>}</div>}
    {selectedDetail && <section className="studio-create project-detail-panel" aria-label="Detalle del proyecto"><header className="project-detail-heading"><div><span className="eyebrow">PROYECTO SELECCIONADO</span><h2>{selectedDetail.name}</h2><p>{selectedDetail.client || 'Sin cliente'}</p></div><button type="button" className="project-detail-close" onClick={() => setDetail(null)} aria-label="Cerrar detalle" title="Cerrar detalle"><span aria-hidden="true">×</span></button></header><p className="project-detail-description">{projectDetailMessage(selectedDetail)}</p><div className="project-detail-actions"><button type="button" className="project-detail-open" onClick={()=>{onOpen(selectedDetail);setDetail(null);}}><Icon name="grid" size={18}/>Abrir parrilla de piezas</button><LinkImport onAdd={async link=>{act('asset/add',{id:crypto.randomUUID(),projectId:selectedDetail.id,name:link.name,type:link.type,externalUrl:link.url,mime:link.mime,size:0,extension:'URL'});setDetail(null);onNotify('Enlace añadido; abre el proyecto para revisar');}}/></div><div className="project-detail-recovery"><DeletedAssets projectId={selectedDetail.id}/></div></section>}
    <p className="studio-private-note">{projects.length} {projects.length === 1 ? 'proyecto' : 'proyectos'} · Privados de tu cuenta. Abre Proyectos en el menú principal para trabajar con tu equipo.</p>
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
    <section className="studio-welcome"><CoverArt palette={0}/><div><span className="eyebrow">TU ESPACIO CREATIVO</span><h1>Una nueva ronda.<br/>Una mejor versión.</h1><p>{reviewer?.name?.split(' ')[0] || 'Hola'}, continúa donde lo dejaste y da forma a tu próxima entrega.</p><LiquidButton onClick={() => next ? onOpen(next) : onNavigate('projects')}>{next ? 'Continuar revisión' : 'Abrir proyectos'} <span aria-hidden="true">→</span></LiquidButton></div></section>
    <header className="studio-section-heading"><h2>Tus proyectos</h2><button onClick={() => onNavigate('projects')}>Ver todos →</button></header>
    <section className="studio-project-grid home-cards" aria-label="Proyectos de tu cuenta">{summary.projects.slice(0,3).map(project => <ProjectTile key={project.id} project={project} onOpen={() => project.activeVersionId ? onOpen(project) : onNavigate('projects')}/>)}</section>
    {!summary.projects.length && <p className="studio-empty">No hay proyectos todavía. Crea el primero desde Proyectos.</p>}
  </div><aside className="studio-home-aside"><section className="studio-home-panel"><h2>Estado de revisión</h2><div className="studio-progress"><div className="studio-progress-ring" style={{'--progress':`${percent}%`}}><strong>{total ? `${percent}%` : '—'}</strong></div><p>{total ? `${resolved} de ${total} comentarios resueltos` : 'Todavía no hay comentarios'}</p></div><div className="studio-counts"><span><strong>{summary.projects.length}</strong>Proyectos</span><span><strong>{summary.assets}</strong>Piezas</span><span><strong>{summary.pending}</strong>Pendientes</span></div><small>Datos de tu cuenta privada, no del equipo compartido.</small></section>
    <section className="studio-home-panel"><h2>Siguiente revisión</h2>{next ? <><div className="studio-next"><img className="studio-review-cover" src={reviewCover} alt="" aria-hidden="true" width="64" height="64"/><div><strong>{next.name}</strong><small>{next.version?.name || 'Versión actual'}</small></div></div><LiquidButton onClick={() => onOpen(next)}>Abrir revisión →</LiquidButton></> : <p>Cuando tengas una pieza para revisar, podrás retomarla aquí.</p>}</section>
    <section className="studio-home-panel"><h2>Comentarios abiertos</h2>{pending.length ? pending.map(comment => <button className="studio-pending" key={comment.id} onClick={() => onNavigate('activity')}><span className="studio-pending-dot"/><span>{comment.text || 'Comentario de audio'}</span><span aria-hidden="true">↗</span></button>) : <p>No hay comentarios pendientes. Todo listo para una nueva ronda.</p>}<button className="studio-text-action" onClick={() => onNavigate('activity')}>Ver actividad →</button></section>
  </aside></div></div>;
}
