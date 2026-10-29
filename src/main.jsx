import {BrandLoader} from './components/BrandLoader.jsx';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from './components/Icon.jsx';
import Sidebar from './components/Sidebar.jsx';
import {ShortcutHelp} from './components/ShortcutHelp.jsx';
import {OriginalMediaStage} from './components/OriginalMediaStage.jsx';
import {AnnotationLayer} from './components/AnnotationLayer.jsx';
import {canLeaveSharedReview} from './state/sharedReviewState.js';
import {readSharedProjectLink,sharedProjectGalleryWorkspace,setSharedProjectLocation} from './domain/shared-project-link.js';
import {readStudioView, setStudioViewLocation, watchSharedProjectLinks} from './domain/shared-link-navigation.js';
import {readReviewRoute,setReviewRoute,reviewRoute,resolveReviewRouteAsset} from './domain/review-route.js';
import {activityItem} from './domain/activity-item.js';
import {workspaceEventAction} from './domain/workspace-event-action.js';
import {reviewRequest} from './state/sharedReviewApi.js';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './components/comment-composer.css';
import {ReviewAssetHeader} from './components/ReviewAssetHeader.jsx';
import AccountAccess,{useAccountActions} from './components/AccountAccess.jsx';
import {canAccessCompanyDemo,canAccessStudioView} from './domain/platform-access.js';
import { AccountProfileMenu } from './components/AccountProfileMenu.jsx';
import { accountStorage } from './state/accountStorage.js';
import { RondaProvider, selectUnreadNotifications, selectVersionStatus, useRonda } from './state/RondaContext.jsx';
import { REVIEW_DECISION, validateReviewDecision } from './domain/review.js';
import { getCommentEmptyState } from './domain/comments.js';
import { annotationVisibleAt, finalizeAnnotation, toNormalizedPoint } from './domain/annotations.js';
import { readDraftForContext, saveSessionDraft } from './state/migration.js';
import { ProjectActions, TeamActions, SettingsActions, ReviewSummary } from './components/WorkspaceActions.jsx';
import { PlatformPlans } from './components/PlatformPlans.jsx';
import { PlanUsage } from './components/PlanUsage.jsx';
import { TimelineMarkers } from './components/TimelineMarkers.jsx';
import { DeliveryGrid, fileStore, fileKind } from './components/DeliveryGrid.jsx';
import {assetReviewUrl} from './components/DeliveryGrid.jsx';
import {ExternalWeb} from './components/ExternalWeb.jsx';
import AssetVersionControl from './components/AssetVersionControl.jsx';
import {resolveAssetVersion} from './domain/asset-versions.js';
import { AudioCommentInput } from './components/AudioCommentInput.jsx';
import {parseCommentCommand} from './domain/comment-commands.js';
import {PriorityCommands} from './components/PriorityCommands.jsx';
import { DocumentReview } from './components/DocumentReview.jsx';
import { resolveFigureAnchor } from './domain/document-anchor.js';
import { StudioHome, ProjectLibrary } from './components/StudioWorkspace.jsx';
import './studio-theme.css';
import './folder-cards.css';
import './social-preview.css';
import './lens-navigation.css';
import BrandSettings from './components/BrandSettings.jsx';
import './brand-settings.css';
import DrawingTrail from './components/DrawingTrail.jsx';
import {createCompanyDemo} from './data/company-demo.js';
import {beginDemoSession,endDemoSession,demoSession} from './state/demoSession.js';
import './company-demo.css';
import './typography.css';
import './studio-art.css';
import './dropdowns.css';
import './review-header.css';
import './components/delivery-grid-polish.css';
import './editorial-workspace.css';
import './color-accents.css';
import './section-backdrops.css';
import './components/liquid-button.css';
import abstractSculpture from './abstract-ribbon-inflated-v3.png';
import sculptureProjects from './abstract-sculpture-projects.png';
import sculpturePauta from './abstract-sculpture-pauta.png';
import sculpturePlanning from './abstract-sculpture-planning.png';
import sculptureActivity from './abstract-sculpture-activity.png';
import sculptureTeam from './abstract-sculpture-team.png';
import sculptureBranding from './abstract-sculpture-branding.png';
import sculptureSettings from './abstract-sculpture-settings.png';
const sectionSculptures={home:abstractSculpture,projects:sculptureProjects,personal:sculptureBranding,pauta:sculpturePauta,planning:sculpturePlanning,activity:sculptureActivity,team:sculptureTeam,branding:sculptureBranding,settings:sculptureSettings};
const sectionCompanions={home:sculptureActivity,projects:sculptureSettings,personal:sculptureTeam,pauta:sculptureProjects,planning:sculpturePauta,activity:sculptureBranding,team:sculpturePlanning,branding:abstractSculpture,settings:sculptureProjects};
import ShareReviewDialog from './components/ShareReviewDialog.jsx';
import {RetryableFeature} from './components/FeatureLoadBoundary.jsx';
import {consumeFeatureRetry} from './domain/feature-retry.js';
import {GuidedTour} from './components/GuidedTour.jsx';
import {TeamNotificationCenter} from './components/TeamNotificationCenter.jsx';
import {revealReviewStage} from './components/reveal-review-stage.js';
const loadPauta=()=>import('./components/Pauta.jsx');
const loadPlanning=()=>import('./components/Planning.jsx');
const loadSocialPreview=()=>import('./components/SocialPreview.jsx');

const formatTime = value => {
  const seconds = Math.max(0, Number(value) || 0);
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * 24);
  return { time: `00:${String(minutes).padStart(2,'0')}:${String(remainder).padStart(2,'0')}`, frame: Math.floor(seconds * 24), frames };
};


const seedComments = [
  { id: 1, author: 'Laura M.', initials: 'LM', color: '#ff725e', time: '00:08:14', frame: 198, text: 'El producto entra muy rápido. ¿Podemos dejar medio segundo más antes del movimiento?', replies: 2, status: 'open' },
  { id: 2, author: 'Mateo R.', initials: 'MR', color: '#8ebd72', time: '00:14:02', frame: 338, text: 'Este encuadre funciona. Mantendría exactamente esta composición.', replies: 0, status: 'resolved' },
  { id: 3, author: 'Sofía C.', initials: 'SC', color: '#f2bd5c', time: '00:21:18', frame: 511, text: 'Subamos un poco el contraste del texto para que sea legible en móvil.', replies: 1, status: 'open' },
];


function MobileNav({ currentView, onNavigate, user }) {
  const items=[['home','grid','Inicio'],['projects','folder','Proyectos'],['personal','personal','Personal'],['pauta','campaign','Pauta'],['planning','calendar','Planner'],['activity','clock','Actividad'],['team','users','Equipo'],['settings','settings','Ajustes']];
  return <nav className="mobile-nav" aria-label="Navegación móvil">{items.filter(([view])=>canAccessStudioView(user,view)).map(([view,icon,label])=><button key={view} data-tour={view} aria-label={label} title={label} className={currentView===view||(currentView==='review'&&view==='personal')||(currentView==='branding'&&view==='settings')?'active':''} onClick={()=>onNavigate(view)}><Icon name={icon}/><span>{label}</span></button>)}</nav>;
}


function MediaStage(props){const {state}=useRonda();return <OriginalMediaStage {...props} members={state.members}/>;}
function CommentCard({ item, selected, onSelect, onResolve, onReply, onJump, members, selectedFigure, annotationContext }) {
  const {act}=useRonda();
  const [options,setOptions]=useState(false);
  const [editing,setEditing]=useState(false);
  const [editedText,setEditedText]=useState(item.text);
  const [replying,setReplying]=useState(false); const [reply,setReply]=useState(''); const replies=Array.isArray(item.replies)?item.replies:[];
  const submitReply=()=>{if(!reply.trim())return;onReply(item.id,reply.trim());setReply('');setReplying(false)};
  return <article className={`comment-card ${selected?'selected':''} ${item.status==='resolved'?'resolved':''}`} onClick={onSelect}>
    <div className="comment-head"><span className="avatar" style={{background:item.color}}>{item.initials}</span><span className="comment-author"><strong>{item.author}</strong><small>{item.author==='Julian Torres'?'Ahora':'Hace unos minutos'}</small></span>{['blocking','high'].includes(item.priority)&&<span className={`priority-label priority-${item.priority}`}>{item.priority==='blocking'?'Bloqueante':'Urgente'}</span>}<button className="icon-button" aria-label="Opciones del comentario" aria-expanded={options} onClick={e=>{e.stopPropagation();setOptions(!options)}}><Icon name="more"/></button></div>
    {options&&<div className="comment-foot" onClick={e=>e.stopPropagation()}><button onClick={()=>{setEditedText(item.text);setEditing(true);setOptions(false)}}>Editar texto</button><button onClick={()=>{act('comment/update',{id:item.id,changes:{priority:item.priority==='blocking'?'normal':'blocking'}});setOptions(false)}}>{item.priority==='blocking'?'Quitar bloqueo':'Marcar bloqueante'}</button></div>}
    {options&&<div className="comment-foot" onClick={e=>e.stopPropagation()}>{selectedFigure&&<button onClick={()=>{act('comment/update',{id:item.id,changes:{annotationId:selectedFigure,annotationContext}});setOptions(false)}}>Vincular a figura seleccionada</button>}{item.annotationId&&<button onClick={()=>{act('comment/update',{id:item.id,changes:{annotationId:null,annotationContext:null}});setOptions(false)}}>Desvincular figura</button>}</div>}
    {item.annotationId&&<button className="comment-location" onClick={e=>{e.stopPropagation();onJump(item)}}>Ver figura vinculada</button>}
    <button className="comment-location" onClick={e=>{e.stopPropagation();onJump(item)}}><Icon name={item.annotationId?'link':'play'} size={11}/><strong>{item.annotationId?'Anotación':item.time}</strong><span>{item.annotationId?'Punto marcado':item.page?`Página / vista ${item.page}`:`Fotograma ${item.frame}`}</span></button>
    {editing?<div className="inline-reply" onClick={e=>e.stopPropagation()}><input aria-label="Editar comentario" autoFocus value={editedText} onChange={e=>setEditedText(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setEditing(false);if(e.key==='Enter'&&editedText.trim()){act('comment/update',{id:item.id,changes:{text:editedText.trim()}});setEditing(false)}}}/><button disabled={!editedText.trim()} onClick={()=>{act('comment/update',{id:item.id,changes:{text:editedText.trim()}});setEditing(false)}}>Guardar</button><button onClick={()=>setEditing(false)}>Cancelar</button></div>:<p className="comment-copy">{item.text}</p>}
    {!!item.attachments?.length&&<div className="comment-attachments">{item.attachments.map(file=>file.type?.startsWith('audio/')?<div key={file.id} onClick={e=>e.stopPropagation()}><span>{file.name}</span><audio controls preload="metadata" src={file.dataUrl} aria-label={`Escuchar ${file.name}`}/></div>:<button key={file.id} onClick={e=>{e.stopPropagation();window.open(file.dataUrl,'_blank','noopener,noreferrer')}} aria-label={`Abrir referencia ${file.name}`}><img src={file.dataUrl} alt={file.name}/><span>{file.name}</span></button>)}</div>}
    {!!replies.length&&<div className="reply-list">{replies.slice(-2).map(entry=>{const author=members[entry.authorId]||{name:'Invitado',initials:'IN'};return <div key={entry.id}><span className="avatar">{author.initials}</span><p><strong>{author.name}</strong>{entry.text}</p></div>})}</div>}
    {replying&&<div className="inline-reply" onClick={e=>e.stopPropagation()}><input autoFocus aria-label={`Responder a ${item.author}`} value={reply} onChange={e=>setReply(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')submitReply();if(e.key==='Escape')setReplying(false)}} placeholder="Escribe una respuesta…"/><button onClick={submitReply}>Enviar</button></div>}
    <footer className="comment-foot"><div><button onClick={e=>{e.stopPropagation();setReplying(!replying)}}>Responder{replies.length>0&&` · ${replies.length}`}</button><button onClick={e=>{e.stopPropagation();onJump(item)}}>Ir al cuadro</button></div><button onClick={e=>{e.stopPropagation();onResolve(item.id)}} className={item.status==='resolved'?'done':''}><Icon name="check" size={14}/>{item.status==='resolved'?'Reabrir':'Resolver'}</button></footer>
  </article>;
}

function CommentsPanel({ onClose, currentTime, setCurrentTime, draft, setDraft, recoveredDraft, selectedFigure, setSelectedFigure, annotationContext, figureTime, focusedComment, onJumpFigure, documentPage, reviewVersionId='version-amara-v3', collapsed=false, onToggleCollapsed=()=>{} }) {
  const { state, act } = useRonda();
  const comments = Object.values(state.comments).filter(comment=>comment.versionId===reviewVersionId).map(comment=>{
    const author=state.members[comment.authorId] || {name:comment.authorSnapshot||'Autor anterior',initials:(comment.authorSnapshot||'AA').split(/\s+/).map(part=>part[0]).join('').slice(0,2).toUpperCase()};
    const stamp=formatTime(comment.timeSeconds ?? (comment.frame || 0) / 24);
    return {...comment,author:author.name,initials:author.initials,color:comment.priority==='blocking'?'#ff725e':'#67a9d4',time:stamp.time,replies:comment.replies||[]};
  });
  const [selected, setSelected] = useState('comment-1');
  const [filter, setFilter] = useState('Todos');
  const [search,setSearch]=useState('');
  useEffect(()=>{if(focusedComment){setSelected(focusedComment);setFilter('Todos');setSearch('');setTimeout(()=>document.getElementById(`thread-${focusedComment}`)?.scrollIntoView({block:'nearest'}),0)}},[focusedComment,selectedFigure]);
  const [attachments,setAttachments]=useState([]);
  const [attachmentError,setAttachmentError]=useState('');
  const [priorityFilter,setPriorityFilter]=useState('all');
  const visible = useMemo(()=>comments.filter(c=>(priorityFilter==='all'||c.priority===priorityFilter)&&(filter==='Todos'||(filter==='Abiertos'&&c.status==='open')||(filter==='Resueltos'&&c.status==='resolved'))&&`${c.author} ${c.text} ${(c.replies||[]).map(reply=>reply.text).join(' ')} ${c.frame}`.toLowerCase().includes(search.toLowerCase())),[comments,filter,search,priorityFilter]);
  const emptyState=visible.length===0?(priorityFilter!=='all'?{kind:'priority',title:'No hay comentarios con esta prioridad',detail:'Cambia la prioridad para ver otros comentarios.',action:'Ver todas las prioridades'}:getCommentEmptyState({total:comments.length,filter,search})):null;
  const resolve = id => act(state.comments[id]?.status==='resolved'?'comment/reopen':'comment/resolve',{id});
  const stamp = formatTime(currentTime);
  const addFiles=async files=>{setAttachmentError('');if(attachments.length>=3){setAttachmentError('Máximo 3 adjuntos por comentario.');return;}const candidates=[...files].filter(file=>file.type.startsWith('image/')||file.type.startsWith('audio/')||file.name.toLowerCase().endsWith('.mp3')).slice(0,3-attachments.length);for(const file of candidates){if(file.size>2*1024*1024){setAttachmentError('Cada adjunto debe pesar menos de 2 MB para el almacenamiento local.');continue;}try{const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});setAttachments(current=>[...current,{id:crypto.randomUUID(),name:file.name,type:file.type||'audio/mpeg',dataUrl}].slice(0,3));}catch{setAttachmentError('No se pudo leer el archivo.')}}};
  const add = () => { const parsed=parseCommentCommand(draft); if(!parsed.text&&!attachments.length) return; const projectId=state.versions[reviewVersionId]?.projectId;if(!projectId||!state.projects[projectId])return;const time=selectedFigure?figureTime:currentTime; act('comment/add',{projectId,versionId:reviewVersionId,page:documentPage,authorId:state.currentUserId,assigneeId:state.currentUserId,priority:parsed.priority,text:parsed.text||'Referencia visual adjunta',attachments,timeSeconds:time,frame:formatTime(time).frame,annotationId:selectedFigure||null,annotationContext:selectedFigure?annotationContext:null}); setDraft('');setAttachments([]);setSelectedFigure(null);recoveredDraft.current=false; };
  const replyTo=(id,text)=>{const current=state.comments[id];act('comment/update',{id,changes:{replies:[...(current.replies||[]),{id:`reply-${Date.now()}`,authorId:state.currentUserId,text,createdAt:new Date().toISOString()}]}})};
  return <aside className={`comments-panel${collapsed?' comments-collapsed':''}`}>
    <div className="panel-head"><div><span className="panel-kicker">REVISIÓN</span><strong>Comentarios</strong><small>{comments.filter(c=>c.status==='open').length} pendientes de {comments.length}</small></div><button className="comments-collapse-toggle" aria-label={collapsed?'Mostrar comentarios':'Ocultar comentarios'} aria-expanded={!collapsed} title={collapsed?'Mostrar comentarios':'Ocultar comentarios'} onClick={onToggleCollapsed}><Icon name="chevron"/></button><button className="mobile-close" aria-label="Cerrar comentarios" onClick={onClose}><Icon name="x"/></button></div>
    <div className="comment-toolbar"><div className="comment-tabs" role="tablist" aria-label="Filtrar comentarios">{['Todos','Abiertos','Resueltos'].map(item=><button key={item} role="tab" aria-selected={filter===item} className={filter===item?'active':''} onClick={()=>setFilter(item)}>{item}<span>{item==='Todos'?comments.length:comments.filter(c=>c.status===(item==='Abiertos'?'open':'resolved')).length}</span></button>)}</div><label className="comment-search"><Icon name="search" size={14}/><input aria-label="Buscar comentarios" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar"/></label></div>
    <label className="priority-filter">Prioridad<select aria-label="Filtrar por prioridad" value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)}><option value="all">Todas</option><option value="high">Urgentes</option><option value="blocking">Bloqueantes</option><option value="normal">Normales</option></select></label>
    <div className="comments-scroll">{visible.map(c=><div key={c.id} id={`thread-${c.id}`}><CommentCard item={c} members={state.members} selectedFigure={selectedFigure} annotationContext={annotationContext} selected={selected===c.id} onSelect={()=>{setSelected(c.id);onJumpFigure(c)}} onResolve={resolve} onReply={replyTo} onJump={item=>{setSelected(item.id);setCurrentTime?.(item.timeSeconds ?? (item.frame||0)/24);onJumpFigure(item)}}/></div>)}{emptyState&&<div className="comments-empty"><strong>{emptyState.title}</strong><span>{emptyState.detail}</span>{emptyState.action&&<button onClick={()=>{if(emptyState.kind==='priority')setPriorityFilter('all');else if(emptyState.kind==='search')setSearch('');else setFilter('Todos')}}>{emptyState.action}</button>}</div>}</div>
    <div className="composer">
      {attachments.filter(file=>file.type?.startsWith('audio/')).map(file=><div className="audio-draft" key={file.id}><span>{file.name}</span><audio controls src={file.dataUrl} aria-label={`Revisar audio ${file.name}`}/><button aria-label={`Eliminar audio ${file.name}`} onClick={()=>setAttachments(current=>current.filter(item=>item.id!==file.id))}>Quitar audio</button></div>)}
      {selectedFigure&&<div className="figure-link-status"><span className="figure-linked-label"><svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2"/></svg>Figura vinculada</span><button aria-label="Desvincular la figura del nuevo comentario" onClick={()=>setSelectedFigure(null)}>Desvincular <span aria-hidden="true">×</span></button></div>}
      <div className="composer-message-bar"><AudioCommentInput onAttach={addFiles} onError={setAttachmentError}/><div className="composer-input">{recoveredDraft.current&&draft&&<small className="draft-recovered" role="status">Borrador recuperado</small>}{!!attachments.length&&<div className="reference-strip">{attachments.map(file=><span key={file.id}><img src={file.dataUrl} alt=""/><button aria-label={`Quitar ${file.name}`} onClick={()=>setAttachments(current=>current.filter(item=>item.id!==file.id))}>×</button></span>)}</div>}<MentionInput value={draft} onChange={e=>{recoveredDraft.current=false;setDraft(e.target.value)}} onPaste={e=>{if(e.clipboardData.files.length){e.preventDefault();addFiles(e.clipboardData.files)}}} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')add()}} aria-label="Escribir comentario" placeholder={documentPage?`Comenta la página / vista ${documentPage}…`:`Comenta o pega una captura sobre ${stamp.time}…`}/><div className="composer-meta"><span>{documentPage?`Página / vista ${documentPage}`:`F${stamp.frame}`} · Ctrl/⌘ + Enter</span></div>{attachmentError&&<small className="attachment-error">{attachmentError}</small>}</div><button className="send" aria-label="Publicar comentario" onClick={add} disabled={!parseCommentCommand(draft).text&&!attachments.length}><Icon name="send"/></button></div>
      <PriorityCommands value={draft} onChange={setDraft}/>
    </div>
  </aside>;
}

function ShareDialog({ onClose, onNotify, reviewVersionId }) {
  const reviewUrl = `${location.origin}${import.meta.env.BASE_URL}${reviewRoute(reviewVersionId)}`;
  return <ShareReviewDialog reviewUrl={reviewUrl} onClose={onClose} onNotify={onNotify}/>;
}

const projectData = [
  { id:1, name:'Campaña Amara', client:'Amara Botanicals', asset:'Spot principal · 30s', status:'En revisión', comments:2, versions:3, color:'#c96c4f', art:'amara' },
  { id:2, name:'Lanzamiento Norte', client:'Norte Café', asset:'Reel social · 15s', status:'Cambios solicitados', comments:7, versions:2, color:'#657c61', art:'norte' },
  { id:3, name:'Colección Línea', client:'Casa Línea', asset:'Lookbook · 24 piezas', status:'Aprobado', comments:0, versions:5, color:'#6a7998', art:'linea' },
  { id:4, name:'Informe de impacto', client:'Fundación Bosque', asset:'PDF · 48 páginas', status:'Borrador', comments:0, versions:1, color:'#8c6b8f', art:'bosque' },
];

function DashboardHeader({ title, subtitle, action, onAction }) {
  const {state}=useRonda();
  return <header className="dashboard-header"><div><span className="eyebrow">{state.workspace.name}</span><h1>{title}</h1><p>{subtitle}</p></div><div className="dashboard-actions">{action && <button className="primary-action" onClick={onAction}><Icon name="plus" size={16}/>{action}</button>}</div></header>;
}

function ProjectsView({ onOpen, onNotify }) {
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState('Todos');
  const filtered=projectData.filter(p=>(filter==='Todos'||p.status===filter)&&(p.name+p.client).toLowerCase().includes(query.toLowerCase()));
  return <div className="dashboard-page"><DashboardHeader title="Proyectos" subtitle="Revisa lo que está en movimiento y lo que espera una decisión." action="Nuevo proyecto" onAction={()=>onNotify('Creador de proyectos listo para conectar')}/><section className="metric-strip"><div><strong>4</strong><span>Proyectos activos</span></div><div><strong>9</strong><span>Cambios abiertos</span></div><div><strong>2.4 h</strong><span>Tiempo medio de respuesta</span></div><div><strong>87%</strong><span>Aprobaciones a tiempo</span></div></section><div className="view-toolbar"><div className="search-field"><Icon name="search" size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar proyecto o cliente"/></div><div className="segmented">{['Todos','En revisión','Aprobado'].map(item=><button key={item} className={filter===item?'active':''} onClick={()=>setFilter(item)}>{item}</button>)}</div></div><section className="project-grid">{filtered.map(project=><button className="project-card" key={project.id} onClick={()=>project.id===1?onOpen():onNotify(`${project.name} se abrirá cuando conectemos sus archivos`)}><div className={`project-art ${project.art}`} style={{'--project-color':project.color}}><span>{project.client.slice(0,2).toUpperCase()}</span><small>V{project.versions}</small></div><div className="project-info"><div className="project-title"><span><strong>{project.name}</strong><small>{project.client}</small></span><Icon name="more"/></div><p>{project.asset}</p><div className="project-meta"><span className={`status ${project.status.toLowerCase().replaceAll(' ','-')}`}>{project.status}</span><span>{project.comments ? `${project.comments} cambios` : 'Sin pendientes'}</span></div></div></button>)}</section></div>;
}

const activities=[
  {who:'Laura M.',initials:'LM',color:'#ff725e',action:'dejó un comentario',where:'Campaña Amara · Spot principal',detail:'“¿Podemos dejar medio segundo más antes del movimiento?”',time:'Hace 4 min',type:'comment'},
  {who:'Mateo R.',initials:'MR',color:'#8ebd72',action:'aprobó una versión',where:'Colección Línea · Lookbook',detail:'Versión 5 aprobada para entrega.',time:'Hace 22 min',type:'approval'},
  {who:'Sofía C.',initials:'SC',color:'#f2bd5c',action:'subió una versión',where:'Lanzamiento Norte · Reel social',detail:'V2 · norte_reel_final_02.mp4',time:'Hace 1 h',type:'upload'},
  {who:'Julian T.',initials:'JT',color:'#67a9d4',action:'resolvió 3 comentarios',where:'Campaña Amara · Spot principal',detail:'La ronda conserva 2 cambios abiertos.',time:'Hace 2 h',type:'resolved'},
  {who:'Camila P.',initials:'CP',color:'#b89be8',action:'invitó a 2 revisores',where:'Informe de impacto',detail:'El enlace vence el 22 de octubre.',time:'Ayer',type:'invite'},
];

function ActivityView({onNavigate,onOpenProject,onOpenComment}) {
  const {state,act}=useRonda();
  const [type,setType]=useState('Todo'); const [project,setProject]=useState('Todos'); const [person,setPerson]=useState('Todas'); const [period,setPeriod]=useState('30'); const [query,setQuery]=useState(''); const [onlyUnread,setOnlyUnread]=useState(false);
  const [teamHistory,setTeamHistory]=useState([]);
  const [readIds,setReadIds]=useState(()=>{try{return JSON.parse(accountStorage.getItem('ronda-activity-read'))||[]}catch{return[]}});
  useEffect(()=>accountStorage.setItem('ronda-activity-read',JSON.stringify(readIds)),[readIds]);
  useEffect(()=>{
    let active=true;
    (async()=>{
      try{
        const {workspaces=[]}=await reviewRequest('/api/workspaces');
        const teams=workspaces.filter(space=>space.kind==='team');
        const batches=await Promise.all(teams.map(async space=>{
          try{
            const data=await reviewRequest(`/api/workspaces/${encodeURIComponent(space.id)}/review-activity`);
            return data.events.map(event=>({id:`team-${space.id}-${event.id}`,who:event.actor||'Cuenta retirada',initials:(event.actor||'CR').split(/\s+/).map(part=>part[0]).slice(0,2).join('').toUpperCase(),color:'#67a9d4',action:workspaceEventAction(event.action,event.details).toLowerCase(),where:`${space.name} · Actividad del equipo`,project:space.name,projectId:event.details?.projectId,workspaceId:space.id,commentId:event.details?.commentId,detail:event.details?.commentText||'Comentario sin texto guardado',occurredAt:event.created_at,time:new Date(event.created_at).toLocaleString('es-CO'),type:event.details?.status==='resolved'?'resolved':'comment'}));
          }catch{return [];}
        }));
        if(active)setTeamHistory(batches.flat());
      }catch{if(active)setTeamHistory([]);}
    })();
    return()=>{active=false;};
  },[state.currentUserId]);
  const live=state.activity.map(event=>activityItem(state,event));
  const seeded=[].map((item,index)=>({...item,id:`seed-${index}`,project:item.where.split(' · ')[0],occurredAt:new Date(Date.now()-[4,22,60,120,1500][index]*60000).toISOString()}));
  const all=[...live,...seeded,...teamHistory].map(item=>({...item,unread:!readIds.includes(item.id)}));
  const people=[...new Set(all.map(item=>item.who))]; const projects=[...new Set(all.map(item=>item.project))];
  const visible=all.filter(item=>(type==='Todo'||item.type===type)&&(project==='Todos'||item.project===project)&&(person==='Todas'||item.who===person)&&(!onlyUnread||item.unread)&&((Date.now()-new Date(item.occurredAt).getTime())/86400000<=Number(period))&&(`${item.who} ${item.action} ${item.where} ${item.detail}`.toLowerCase().includes(query.toLowerCase())));
  const groups=[['Hoy',visible.filter(item=>(Date.now()-new Date(item.occurredAt).getTime())<86400000)],['Ayer',visible.filter(item=>{const age=Date.now()-new Date(item.occurredAt).getTime();return age>=86400000&&age<172800000})],['Esta semana',visible.filter(item=>(Date.now()-new Date(item.occurredAt).getTime())>=172800000)]];
  const markAll=()=>{setReadIds(all.map(item=>item.id));act('notification/readAll',{})};
  const clear=()=>{setType('Todo');setProject('Todos');setPerson('Todas');setPeriod('30');setQuery('');setOnlyUnread(false)};
  return <div className="dashboard-page activity-page"><DashboardHeader title="Actividad" subtitle="Historial de tus proyectos y comentarios resueltos del equipo."/><section className="activity-metrics"><div><strong>{all.filter(item=>item.unread).length}</strong><span>Sin leer</span></div><div><strong>{all.filter(item=>item.type==='comment'||item.type==='resolved').length}</strong><span>Comentarios</span></div><div><strong>{all.filter(item=>item.type==='approval').length}</strong><span>Decisiones</span></div><div><strong>{projects.length}</strong><span>Proyectos activos</span></div></section><section className="activity-filters"><div className="search-field"><Icon name="search" size={16}/><input aria-label="Buscar en actividad" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar persona, proyecto o contenido"/></div><div className="filter-row"><select aria-label="Filtrar por tipo" value={type} onChange={e=>setType(e.target.value)}><option>Todo</option><option value="comment">Comentarios</option><option value="approval">Aprobaciones</option><option value="upload">Versiones</option><option value="resolved">Resueltos</option><option value="invite">Invitaciones</option></select><select aria-label="Filtrar por proyecto" value={project} onChange={e=>setProject(e.target.value)}><option>Todos</option>{projects.map(value=><option key={value}>{value}</option>)}</select><select aria-label="Filtrar por persona" value={person} onChange={e=>setPerson(e.target.value)}><option>Todas</option>{people.map(value=><option key={value}>{value}</option>)}</select><select aria-label="Filtrar por período" value={period} onChange={e=>setPeriod(e.target.value)}><option value="1">Últimas 24 horas</option><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option></select><label className="unread-filter"><input type="checkbox" checked={onlyUnread} onChange={e=>setOnlyUnread(e.target.checked)}/> Sin leer</label></div><div className="filter-actions"><span>{visible.length} eventos encontrados</span><button onClick={clear}>Limpiar filtros</button><button className="quiet-button" onClick={markAll}><Icon name="check" size={15}/> Marcar todo como leído</button></div></section><section className="activity-timeline">{groups.map(([label,items])=>items.length>0&&<div className="activity-group" key={label}><h2>{label}<span>{items.length}</span></h2><div className="activity-list">{items.map(item=><article className={`activity-item ${item.unread?'unread':''}`} key={item.id}><span className="activity-dot"/><span className="avatar" style={{background:item.color}}>{item.initials}</span><div><p><strong>{item.who}</strong> {item.action}</p><button onClick={()=>{setReadIds(current=>[...new Set([...current,item.id])]);item.workspaceId?onNavigate('team'):item.commentId&&state.comments[item.commentId]?onOpenComment(state.comments[item.commentId]):state.projects[item.projectId]?onOpenProject(state.projects[item.projectId]):onNavigate('personal')}}>{item.where}</button><blockquote>{item.detail}</blockquote></div><div className="activity-end"><time>{item.time}</time>{item.unread&&<button onClick={()=>setReadIds(current=>[...current,item.id])}>Marcar leído</button>}</div></article>)}</div></div>)}{visible.length===0&&<div className="activity-empty"><Icon name="search" size={26}/><strong>No encontramos actividad</strong><p>Prueba otro período o elimina algunos filtros.</p><button onClick={clear}>Restablecer filtros</button></div>}</section></div>;
}

function NotificationCenter({onNavigate}) {
  if(!demoSession())return <TeamNotificationCenter/>;
  return <DemoNotificationCenter onNavigate={onNavigate}/>;
}
function DemoNotificationCenter({onNavigate}) {
  const {state,act}=useRonda(); const [open,setOpen]=useState(false);
  const unread=selectUnreadNotifications(state);
  return <div className="notification-center"><button className="notification-trigger" aria-label={`${unread.length} notificaciones sin leer`} aria-expanded={open} onClick={()=>setOpen(!open)}><Icon name="bell" size={17}/>{unread.length>0&&<b>{unread.length}</b>}</button>{open&&<div className="notification-popover"><header><strong>Notificaciones</strong><button onClick={()=>act('notification/readAll',{})}>Marcar leídas</button></header>{unread.length===0?<p>Estás al día.</p>:unread.map(item=><button key={item.id} onClick={()=>{act('notification/read',{id:item.id});onNavigate('review');setOpen(false)}}><strong>Nueva actividad asignada</strong><span>Campaña Amara · abrir revisión</span></button>)}</div>}</div>;
}

const onlineReviewers=[
  {id:'sofia',name:'Sofía Castillo',initials:'SC',color:'#b89be8',time:21.75,x:31,y:38,activity:'Anotando el contraste del texto'},
  {id:'laura',name:'Laura Méndez',initials:'LM',color:'#ff725e',time:8.58,x:67,y:54,activity:'Revisando la entrada del producto'},
  {id:'mateo',name:'Mateo Ruiz',initials:'MR',color:'#8ebd72',time:14.08,x:52,y:27,activity:'Viendo el encuadre'},
  {id:'camila',name:'Camila Pérez',initials:'CP',color:'#f2bd5c',time:28.2,x:78,y:66,activity:'Revisando el cierre'},
];

function PresenceStack({onFollow,followingId}) {
  const [open,setOpen]=useState(false);
  return <div className="presence-wrap"><div className="presence" aria-label={`${onlineReviewers.length} personas viendo`}><button style={{background:onlineReviewers[0].color}} onClick={()=>onFollow(onlineReviewers[0])}>SC</button><button style={{background:onlineReviewers[1].color}} onClick={()=>onFollow(onlineReviewers[1])}>LM</button><button className="presence-more" onClick={()=>setOpen(!open)}>+{onlineReviewers.length-2}</button></div>{open&&<div className="presence-popover"><header><div><strong>Viendo ahora</strong><span>{onlineReviewers.length} personas conectadas</span></div><i className="live-dot"/></header>{onlineReviewers.map(person=><button key={person.id} className={followingId===person.id?'following':''} onClick={()=>{onFollow(person);setOpen(false)}}><span className="avatar" style={{background:person.color}}>{person.initials}</span><span><strong>{person.name}</strong><small>{person.activity} · {formatTime(person.time).time}</small></span><em>{followingId===person.id?'Siguiendo':'Ir'}</em></button>)}<p>Selecciona una persona para saltar a su fotograma y ver su cursor.</p></div>}</div>;
}

const initialMembers=[
  {name:'Julian Torres',email:'julian@nebulastudio.co',initials:'JT',role:'Administrador',status:'Activo',color:'#67a9d4'},
  {name:'Sofía Castillo',email:'sofia@nebulastudio.co',initials:'SC',role:'Editor',status:'Activo',color:'#f2bd5c'},
  {name:'Mateo Ruiz',email:'mateo@nebulastudio.co',initials:'MR',role:'Editor',status:'Activo',color:'#8ebd72'},
  {name:'Camila Pérez',email:'camila@nebulastudio.co',initials:'CP',role:'Revisor',status:'Invitación enviada',color:'#b89be8'},
];

function TeamView({onNotify}) {
  const [members,setMembers]=useState(initialMembers); const [invite,setInvite]=useState(false); const [email,setEmail]=useState('');
  const sendInvite=()=>{const normalized=email.trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)){onNotify('Escribe un correo válido');return;}if(members.some(member=>member.email.toLowerCase()===normalized)){onNotify('Esa persona ya pertenece al equipo');return;}if(members.length>=5){onNotify('Plan Studio completo: 5 de 5 puestos');return;}setMembers([...members,{name:normalized.split('@')[0],email:normalized,initials:normalized.slice(0,2).toUpperCase(),role:'Revisor',status:'Invitación enviada',color:'#ff725e'}]);setEmail('');setInvite(false);onNotify('Invitación preparada')};
  return <div className="dashboard-page"><DashboardHeader title="Equipo" subtitle="Gestiona quién crea proyectos, edita contenido y revisa entregas." action="Invitar persona" onAction={()=>setInvite(true)}/><section className="team-summary"><div><span className="stacked-avatars">{members.slice(0,4).map(m=><i key={m.email} style={{background:m.color}}>{m.initials}</i>)}</span><span><strong>{members.length} personas</strong><small>3 activas · {members.length-3} pendiente</small></span></div><p><strong>Plan Studio</strong><span>{members.length}/5 puestos utilizados</span></p></section><section className="member-table"><header><span>Persona</span><span>Rol</span><span>Estado</span><span></span></header>{members.map((m,index)=><div className="member-row" key={m.email}><span className="member-person"><i className="avatar" style={{background:m.color}}>{m.initials}</i><span><strong>{m.name}</strong><small>{m.email}</small></span></span><select value={m.role} onChange={e=>setMembers(members.map((x,i)=>i===index?{...x,role:e.target.value}:x))}><option>Administrador</option><option>Editor</option><option>Revisor</option></select><span className={`member-status ${m.status==='Activo'?'active':''}`}>{m.status}</span><button aria-label={`Opciones de ${m.name}`}><Icon name="more"/></button></div>)}</section>{invite&&<div className="inline-invite"><div><strong>Invitar al espacio</strong><small>Recibirá acceso como revisor.</small></div><input type="email" autoFocus value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendInvite()} placeholder="nombre@empresa.com"/><button onClick={sendInvite}>Enviar invitación</button><button aria-label="Cancelar" onClick={()=>setInvite(false)}><Icon name="x"/></button></div>}</div>;
}

function SettingsView({onNotify}) {
  const [saved,setSaved]=useState({name:'Nébula Studio',language:'Español',comments:true,downloads:false});
  return <div className="dashboard-page narrow"><DashboardHeader title="Configuración" subtitle="Identidad, permisos predeterminados y preferencias del espacio."/><section className="settings-section"><div className="settings-heading"><span className="brand-preview">N</span><div><h2>Identidad del espacio</h2><p>Esta información aparece en enlaces y notificaciones.</p></div></div><label>Nombre del espacio<input value={saved.name} onChange={e=>setSaved({...saved,name:e.target.value})}/></label><label>Idioma predeterminado<select value={saved.language} onChange={e=>setSaved({...saved,language:e.target.value})}><option>Español</option><option>English</option><option>Português</option></select></label></section><section className="settings-section"><div className="settings-heading"><Icon name="share"/><div><h2>Enlaces de revisión</h2><p>Permisos aplicados a los nuevos enlaces.</p></div></div><div className="setting-toggle"><span><strong>Comentarios de invitados</strong><small>Permitir feedback sin crear una cuenta.</small></span><input type="checkbox" checked={saved.comments} onChange={e=>setSaved({...saved,comments:e.target.checked})}/></div><div className="setting-toggle"><span><strong>Descarga de originales</strong><small>Los clientes podrán descargar el archivo fuente.</small></span><input type="checkbox" checked={saved.downloads} onChange={e=>setSaved({...saved,downloads:e.target.checked})}/></div></section><button className="save-settings" onClick={()=>onNotify('Configuración guardada')}>Guardar cambios</button></div>;
}

function App({demo=false,onExitDemo}) {
  const {user}=useAccountActions();
  const canUseCompanyDemo=canAccessCompanyDemo(user);
  const {state,act,persistenceError,retryPersistence}=useRonda();
  const [retryRequest]=useState(()=>{let storage=null;try{storage=window.sessionStorage}catch{}return consumeFeatureRetry(storage)});
  const [media, setMedia] = useState(null);
  const [personalProjectId,setPersonalProjectId]=useState('project-amara');
  const [socialMode,setSocialMode]=useState(retryRequest?.mode==='social');
  const [retryRestoring,setRetryRestoring]=useState(retryRequest?.view==='review');
  const [socialLoading,setSocialLoading]=useState(false);
  const [socialAssetId,setSocialAssetId]=useState(null);
  const socialRequest=useRef(0);
  const selectSocialAsset=async asset=>{asset=resolveAssetVersion(state,asset);const request=++socialRequest.current;setSocialLoading(true);setSocialAssetId(asset.id);setCommentsOpen(false);try{const url=await assetReviewUrl(asset);if(request!==socialRequest.current)return;setMedia(current=>{if(current?.url)URL.revokeObjectURL(current.url);return {...asset,identity:asset.identity,url:url,duration:asset.type==='image'?1:0,setDuration:duration=>setMedia(value=>({...value,duration}))}});setCurrentTime(0);setVersion(asset.versionNumber);setSelectedFigure(null);setFocusedComment(null);}catch{if(request===socialRequest.current)setToast('No se pudo cargar la lámina; comentarios no cambiados')}finally{if(request===socialRequest.current)setSocialLoading(false)}};
  const openProject=async project=>{
    const original=(state.assets||[]).find(item=>item.projectId===project.id);const asset=original?resolveAssetVersion(state,original):null;
    setPersonalProjectId(project.id);
    if(!asset){if(media?.url)URL.revokeObjectURL(media.url);setMedia(null);setCurrentView('review');return;}
    try{const url=await assetReviewUrl(asset);setMedia(current=>{if(current?.url)URL.revokeObjectURL(current.url);return {...asset,identity:asset.identity,url:url,duration:asset.type==='image'?1:0,setDuration:duration=>setMedia(value=>({...value,duration}))}});setVersion(asset.versionNumber);setCurrentTime(0);setDocumentPage(1);setSelectedFigure(null);setFocusedComment(null);setSocialMode(false);setCurrentView('review',{versionId:asset.versionId||`asset-${asset.id}-v${asset.versionNumber||1}`});}catch{setToast('No se pudo abrir la pieza. Tus datos permanecen guardados.');}
  };
  const [documentPage,setDocumentPage]=useState(1);
  const pendingFigureJump=useRef(null);
  const [version, setVersion] = useState(3);
  useEffect(()=>{
    if(!retryRestoring||retryRequest?.view!=='review')return;
    let active=true;
    const original=(state.assets||[]).find(asset=>String(asset.id)===retryRequest.mediaId);
    const restored=original?resolveAssetVersion(state,original,retryRequest.versionId||original.versionId):null;
    if(!restored){setToast('No se pudo restaurar la pieza; vuelve a abrirla desde el proyecto.');setSocialMode(false);setCurrentViewRaw('personal');setRetryRestoring(false);return;}
    assetReviewUrl(restored).then(url=>{
      if(!active)return;
      setMedia({...restored,identity:restored.identity||restored.id,url,duration:restored.type==='image'?1:0,setDuration:duration=>setMedia(value=>({...value,duration}))});
      setPersonalProjectId(restored.projectId||'project-amara');setVersion(restored.versionNumber||1);setDocumentPage(1);setCurrentTime(0);setRetryRestoring(false);
    }).catch(()=>{if(active){setToast('No se pudo restaurar la pieza; vuelve a abrirla desde el proyecto.');setSocialMode(false);setCurrentViewRaw('personal');setRetryRestoring(false);}});
    return()=>{active=false};
  },[retryRequest,retryRestoring,state.assets,state.versions]);
  const draftKey=`ronda:draft:${state.workspace.id}:${media?.projectId||'project-amara'}:${media?.id||'demo'}:version-${version}:${state.currentUserId}`;
  const draftStorage=typeof sessionStorage==='undefined'?null:sessionStorage;
  const [draftCache,setDraftCache]=useState({});
  const commentDraft=readDraftForContext(draftCache,draftStorage,draftKey);
  const setCommentDraft=value=>setDraftCache(current=>({...current,[draftKey]:typeof value==='function'?value(readDraftForContext(current,draftStorage,draftKey)):value}));
  const recoveredDraft=useRef(Boolean(commentDraft));
  const [collapsed, setCollapsed] = useState(false);
  const [currentView, setCurrentViewRaw] = useState(()=>{
    const fallback=readStudioView(location.hash)||(location.hash.startsWith('#team/')?'projects':location.hash.startsWith('#review/')?'review':'home');
    return retryRequest?.view||fallback;
  });
  const [requestedReviewVersion,setRequestedReviewVersion]=useState(()=>readReviewRoute(location.hash));
  const [reviewRouteLoading,setReviewRouteLoading]=useState(()=>Boolean(readReviewRoute(location.hash)));
  const [reviewRouteError,setReviewRouteError]=useState('');
  const [sharedDirty,setSharedDirty]=useState(false);
  const [sharedLinkKey,setSharedLinkKey]=useState(location.hash);
  const sharedNavigationDirty=useRef(false);
  sharedNavigationDirty.current=sharedDirty;
  useEffect(()=>watchSharedProjectLinks(window,{
    canNavigate:()=>{if(!sharedNavigationDirty.current)return true;setToast('Termina la carga o publica tus cambios antes de abrir otro enlace. Tu trabajo se conserva.');return false;},
    onRouteSynced:hash=>{setSharedLinkKey(hash);const view=readSharedProjectLink(hash)?'projects':readStudioView(hash);if(view){setRequestedReviewVersion(readReviewRoute(hash));setSharedDirty(false);setCurrentViewRaw(view);}},
    onNavigate:(hash,view)=>{setSharedLinkKey(hash);setRequestedReviewVersion(readReviewRoute(hash));setSharedDirty(false);setCurrentViewRaw(view);},
  }),[]);
  const setCurrentView=(next,{versionId}={})=>{
    if(!canAccessStudioView(user,next)){setToast('Esta sección está reservada al superadministrador.');return;}
    const galleryWorkspace=next==='projects'?sharedProjectGalleryWorkspace(location.hash):null;
    const returningToTeamGallery=next===currentView&&Boolean(galleryWorkspace);
    if(next===currentView&&!(next==='review'&&versionId)&&!returningToTeamGallery)return;
    if(!canLeaveSharedReview({dirty:sharedDirty,busy:false},()=>window.confirm('Hay cambios sin publicar en la revisión compartida. ¿Descartarlos?')))return;
    if(returningToTeamGallery){setSharedProjectLocation(window,galleryWorkspace,'');return;}
    setCurrentViewRaw(next);
    if(next==='review'){
      const targetVersion=versionId||media?.versionId||(media?.id?`asset-${media.id}-v${media.versionNumber||version}`:null);
      setRequestedReviewVersion(targetVersion);
      if(targetVersion)setReviewRoute(window,targetVersion);else setStudioViewLocation(window,'review');
    }else{setRequestedReviewVersion(null);setReviewRouteError('');setStudioViewLocation(window,next);}
  };
  useEffect(()=>{
    if(currentView!=='review'||!requestedReviewVersion||retryRequest?.view==='review'){
      setReviewRouteLoading(false);
      setReviewRouteError('');
      return;
    }
    if(media?.versionId===requestedReviewVersion){setReviewRouteLoading(false);setReviewRouteError('');return;}
    let active=true;
    const restored=resolveReviewRouteAsset(state,requestedReviewVersion);
    if(!restored){
      setReviewRouteLoading(false);
      setReviewRouteError('Esta pieza no está disponible en esta cuenta o versión. Inicia sesión con una cuenta que ya tenga acceso y vuelve a abrir el enlace.');
      return;
    }
    setReviewRouteLoading(true);
    setReviewRouteError('');
    assetReviewUrl(restored).then(url=>{
      if(!active)return;
      setMedia(current=>{if(current?.url)URL.revokeObjectURL(current.url);return {...restored,identity:restored.identity||restored.id,url,duration:restored.type==='image'?1:0,setDuration:duration=>setMedia(value=>({...value,duration}))}});
      setPersonalProjectId(restored.projectId||'project-amara');
      setVersion(restored.versionNumber||1);
      setDocumentPage(1);
      setCurrentTime(0);
    }).catch(()=>{
      if(active)setReviewRouteError('No se pudo cargar esta pieza. Reintenta desde el proyecto; el enlace no cambia sus permisos.');
    }).finally(()=>{if(active)setReviewRouteLoading(false)});
    return()=>{active=false};
  },[currentView,requestedReviewVersion,retryRequest?.view,state.assets,state.versions,media?.versionId]);
  const [companyDemo,setCompanyDemo]=useState(false);
  const [activeTool, setActiveTool] = useState('pen');
  const [activeColor, setActiveColor] = useState('#ff725e');
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsPanelCollapsed,setCommentsPanelCollapsed]=useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shortcutsOpen,setShortcutsOpen]=useState(false);
  const [summaryOpen,setSummaryOpen]=useState(false);
  const [currentTime, setCurrentTime] = useState(14.08);
  const [toast, setToast] = useState('');
  const [selectedFigure,setSelectedFigure]=useState(null);
  const [focusedComment,setFocusedComment]=useState(null);
  const plannerJump=useRef(null);
  const openPlanningComment=async comment=>{
    const sourceVersion=state.versions[comment.versionId];
    const original=(state.assets||[]).find(a=>a.id===sourceVersion?.assetId||`asset-${a.id}-v1`===comment.versionId);const asset=original?resolveAssetVersion(state,original,comment.versionId):null;
    if(!asset&&comment.versionId!=='version-amara-v3'){setToast('El archivo o versión de este comentario ya no está disponible');return;}
    try{const url=asset?await assetReviewUrl(asset):null;plannerJump.current=comment;setSocialMode(false);setMedia(current=>{if(current?.url)URL.revokeObjectURL(current.url);return asset?{...asset,identity:asset.identity,url:url,duration:asset.type==='image'?1:0,setDuration:duration=>setMedia(value=>({...value,duration}))}:null});setVersion(sourceVersion?.number||3);setDocumentPage(comment.page||1);setCurrentTime(comment.timeSeconds||0);setCurrentView('review',{versionId:sourceVersion?.id||'version-amara-v3'});setCommentsOpen(true);}catch{setToast('No se pudo abrir el archivo. Tus comentarios siguen guardados');}
  };
  const annotationContext=`${media?.projectId||'project-amara'}:version-amara-v${version}:${media?.identity||'demo-amara'}${['pdf','html','document','presentation'].includes(media?.type)?`:page-${documentPage}`:''}`;
  const marks=state.annotations?.[annotationContext]||[];
  const saveMarks=next=>{const updated=typeof next==='function'?next(marks):next;const enriched=updated.map(mark=>mark.id?mark:{...mark,id:crypto.randomUUID(),timeSeconds:currentTime});act('annotations/save',{context:annotationContext,marks:enriched});if(enriched.length>marks.length){setSelectedFigure(enriched.at(-1).id);setActiveTool('');}if(selectedFigure&&!enriched.some(m=>m.id===selectedFigure))setSelectedFigure(null);};
  const addWebComment=async(mark,text)=>{const parsed=parseCommentCommand(text);const projectId=state.versions[reviewVersionId]?.projectId;if(!parsed.text||!projectId||!state.projects[projectId])return false;act('comment/add',{projectId,versionId:reviewVersionId,page:null,authorId:state.currentUserId,assigneeId:state.currentUserId,priority:parsed.priority,text:parsed.text,attachments:[],timeSeconds:null,frame:0,annotationId:mark.id,annotationContext});setSelectedFigure(mark.id);setFocusedComment(null);setCommentsOpen(true);setToast('Comentario publicado');return true;};
  const selectFigure=(mark,options={})=>{setSelectedFigure(mark.id);setCurrentTime(mark.timeSeconds);setActiveTool('');const comment=Object.values(state.comments).find(c=>c.annotationId===mark.id&&c.annotationContext===annotationContext);setFocusedComment(comment?.id||null);setCommentsOpen(options.openComments!==false);};
  const jumpFigure=comment=>{const anchor=resolveFigureAnchor(state.annotations,comment,annotationContext);if(!comment.annotationId){if(comment.page)setDocumentPage(comment.page);return;}if(!anchor){setToast('Figura no disponible en este archivo o versión');return;}if(anchor.context!==annotationContext){pendingFigureJump.current={...anchor,commentId:comment.id};setDocumentPage(anchor.page);return;}setSelectedFigure(anchor.mark.id);setFocusedComment(comment.id);setCurrentTime(anchor.mark.timeSeconds);setActiveTool('');};
  useEffect(()=>{const pending=pendingFigureJump.current;if(pending?.context===annotationContext){setSelectedFigure(pending.mark.id);setFocusedComment(pending.commentId);setCurrentTime(pending.mark.timeSeconds);setActiveTool('');pendingFigureJump.current=null;}else{setSelectedFigure(null);setFocusedComment(null);pendingFigureJump.current=null;}},[annotationContext]);
  useEffect(()=>{const comment=plannerJump.current;if(currentView==='review'&&comment){plannerJump.current=null;setFocusedComment(comment.id);setCurrentTime(comment.timeSeconds||0);setActiveTool('');}},[currentView,annotationContext]);
  const reviewVersionId=media?.versionId||(media?.id?`asset-${media.id}-v1`:'version-amara-v3');
  const figureProps={selectedFigure,setSelectedFigure,annotationContext,figureTime:marks.find(m=>m.id===selectedFigure)?.timeSeconds??currentTime,focusedComment,onJumpFigure:jumpFigure,reviewVersionId,documentPage:['pdf','html','document','presentation'].includes(media?.type)?documentPage:null};
  const [remoteCursor,setRemoteCursor]=useState(null);
  const fileInput = useRef(null);
  const versionStatus=selectVersionStatus(state,reviewVersionId);
  const approval=versionStatus==='approved'?'Aprobado':versionStatus==='changes_requested'?'Cambios solicitados':'En revisión';
  const openCount=Object.values(state.comments).filter(c=>c.versionId===reviewVersionId&&c.status==='open').length;
  useEffect(()=>{recoveredDraft.current=Boolean(commentDraft)},[draftKey]);
  useEffect(()=>{saveSessionDraft(draftStorage,draftKey,commentDraft)},[draftStorage,draftKey,commentDraft]);
  useEffect(()=>{ if(!toast)return; const timer=setTimeout(()=>setToast(''),2200); return()=>clearTimeout(timer); },[toast]);
  useEffect(()=>{const handler=e=>{if(e.key==='Escape'){setShareOpen(false);setShortcutsOpen(false);setCommentsOpen(false);}if(e.key==='?'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))setShortcutsOpen(value=>!value);if(e.key.toLowerCase()==='c'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){e.preventDefault();document.querySelector('.composer textarea')?.focus();}};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler)},[]);
  const loadMedia = async event => { const file=event.target.files?.[0]; if(!file)return;event.target.value='';const type=fileKind(file);if(!['video','image'].includes(type)){setToast('Para documentos y otros formatos, usa Agregar archivos en la parrilla.');return;}try{setToast('Guardando archivo en el servidor…');const id=crypto.randomUUID();await fileStore(id,file);const asset={id,name:file.name,type,mime:file.type,size:file.size,extension:file.name.split('.').at(-1).toUpperCase(),projectId:media?.projectId||'project-amara'};act('asset/add',asset);if(media?.url)URL.revokeObjectURL(media.url);setCurrentTime(0);setMedia({...asset,identity:id,versionId:`asset-${id}-v1`,versionNumber:1,url:URL.createObjectURL(file),duration:type==='image'?1:0,setDuration:duration=>setMedia(current=>({...current,duration}))});const versionId=`asset-${id}-v1`;setRequestedReviewVersion(versionId);setReviewRoute(window,versionId);setToast('Archivo guardado en tu cuenta');}catch(error){setToast(error.message||'No se pudo guardar el archivo');} };
  const followReviewer=person=>{setCurrentTime(person.time);setRemoteCursor(person);setToast(`Siguiendo a ${person.name} en ${formatTime(person.time).time}`)};
  if(companyDemo&&canUseCompanyDemo)return <RondaProvider initialState={companyDemo} ephemeral><App demo onExitDemo={()=>{endDemoSession();setCompanyDemo(false)}}/></RondaProvider>;
  if(retryRestoring)return <BrandLoader label="Recuperando la revisión…"/>;
  if(!canAccessStudioView(user,currentView))return <div className="app-shell"><section className="dashboard-page"><h1>Acceso restringido</h1><p>Esta sección está en construcción y solo está disponible para el superadministrador.</p><button type="button" onClick={()=>setCurrentView('projects')}>Ir a Proyectos</button></section></div>;
  return <div className="app-shell">
    <DrawingTrail enabled={currentView==='review'&&!socialMode&&activeTool!=='type'&&Boolean(activeTool)} color={activeColor}/>
    <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} currentView={currentView} onNavigate={setCurrentView} onDemo={canUseCompanyDemo?()=>{if(!canUseCompanyDemo||demo||!canLeaveSharedReview({dirty:sharedDirty,busy:false},()=>window.confirm('Hay cambios sin publicar en la revisión compartida. ¿Descartarlos para abrir el demo?')))return;const fixture=createCompanyDemo();beginDemoSession(fixture);setCompanyDemo(fixture)}:undefined}/>
    <main data-view={currentView} className={`workspace ${currentView!=='review'?'dashboard-workspace':''}`}>
      {sectionSculptures[currentView]&&<div className="abstract-sculpture-background" aria-hidden="true"><img className="section-sculpture section-sculpture-primary" src={sectionSculptures[currentView]} alt="" draggable={false}/><img className="section-sculpture section-sculpture-companion" src={sectionCompanions[currentView]} alt="" draggable={false}/></div>}
      {demo&&<div className="demo-company-banner" role="status"><span>DEMO · Empresa activa · Datos ficticios. Los cambios se descartan al salir.</span><button onClick={onExitDemo}>Volver a mi cuenta</button></div>}
      {currentView!=='review' && <header className="studio-topbar"><span>{currentView==='projects'?'Espacio compartido':currentView==='team'?'Espacio de trabajo':state.workspace.name} <span aria-hidden="true">/</span> <strong>{{home:'Inicio',projects:'Proyectos del equipo',personal:'Mis proyectos personales',pauta:'Pauta',activity:'Actividad',planning:'Planificación',team:'Equipo',settings:'Configuración',branding:'Personalización',platform:'Planes y empresas'}[currentView]}</strong></span><div><NotificationCenter onNavigate={setCurrentView}/><AccountProfileMenu initials={state.members[state.currentUserId]?.initials} onNavigate={setCurrentView}/></div></header>}
      {currentView==='home' && <StudioHome onNavigate={setCurrentView} onOpen={openProject}/>}
      {persistenceError&&<div className="persistence-alert" role="alert"><Icon name="alert" size={16}/><span><strong>Los cambios están solo en este dispositivo</strong><small>{persistenceError==='quota'?'El almacenamiento del navegador está lleno. Quita algunas referencias pesadas o libera espacio.':'El navegador bloqueó el almacenamiento local.'}</small></span><button onClick={retryPersistence}>Reintentar</button></div>}
      {currentView==='projects' && <ProjectActions key={sharedLinkKey} onOpen={openProject} onNotify={setToast} onDirtyChange={setSharedDirty}/>}
      {currentView==='personal' && <><PlanUsage/><ProjectLibrary onOpen={openProject} onNotify={setToast}/></>}
      {currentView==='activity' && <ActivityView onNavigate={setCurrentView} onOpenProject={openProject} onOpenComment={openPlanningComment}/>}
      {currentView==='planning' && <RetryableFeature load={loadPlanning} retryView="planning" message="No se pudo cargar Planificación. Comprueba tu conexión e inténtalo de nuevo." loadingLabel="Cargando planificación…" allowDemo={canUseCompanyDemo} onOpen={openPlanningComment}/>}
      {currentView==='team' && <TeamActions onNotify={setToast}/>}
      {currentView==='settings' && <SettingsActions onNotify={setToast} onNavigate={setCurrentView}/>}
      {currentView==='platform' && <PlatformPlans onNotify={setToast}/>}
      {currentView==='branding' && <BrandSettings onNotify={setToast}/>}
      {currentView==='pauta' && <RetryableFeature load={loadPauta} retryView="pauta" message="No se pudo cargar Pauta. Comprueba tu conexión e inténtalo de nuevo." loadingLabel="Cargando Pauta…"/>}
      {currentView==='review'&&!media&&!demo&&<section className="dashboard-page personal-project-empty">
        <header className="dashboard-header"><div><span className="eyebrow">{reviewRouteError?'ENLACE DE REVISIÓN':'PROYECTO PERSONAL'}</span><h1>{reviewRouteError?'Revisión no disponible':state.projects[personalProjectId]?.name||'Tu proyecto'}</h1><p>{reviewRouteError||'Solo tú puedes ver estas piezas. Agrega archivos o un enlace para comenzar la revisión.'}</p></div><button className="secondary" onClick={()=>{setRequestedReviewVersion(null);setCurrentView('personal')}}>Volver a mis proyectos</button></header>
        {!requestedReviewVersion&&<DeliveryGrid projectId={personalProjectId} onNotify={setToast} onSelect={asset=>{revealReviewStage({remount:false});setMedia({...asset,setDuration:duration=>setMedia(current=>({...current,duration}))});setCurrentTime(0);setVersion(asset.versionNumber||1);setDocumentPage(1);setSelectedFigure(null);setFocusedComment(null);setCommentDraft('');setSocialMode(false);const versionId=asset.versionId||`asset-${asset.id}-v${asset.versionNumber||1}`;setRequestedReviewVersion(versionId);setReviewRoute(window,versionId);}}/>}
      </section>}
      {currentView==='review'&&(media||demo) && <>
      <header className="topbar">
        <div className="breadcrumb"><button onClick={()=>setCurrentView('personal')}>{state.projects[media?.projectId||'project-amara']?.name}</button><Icon name="chevron" size={14}/><div><strong>{state.versions[reviewVersionId]?.name || media?.name || 'Revisión'}</strong><span>Guardado por cuenta</span></div></div>
        <div className="top-actions">
          <button className="shortcut-trigger" aria-label="Ver atajos de teclado" title="Atajos (?)" onClick={()=>setShortcutsOpen(true)}>?</button>
          <NotificationCenter onNavigate={setCurrentView}/>
          <button className="secondary" aria-label="Compartir revisión" onClick={()=>setShareOpen(true)}><Icon name="share" size={17}/><span>Compartir</span></button>
          <div className="approval-menu"><button className={`approval ${approval==='Aprobado'?'approved':''}`} onClick={()=>{const check=validateReviewDecision(state,{versionId:reviewVersionId,reviewerId:state.currentUserId,decision:REVIEW_DECISION.APPROVED});if(!check.allowed){setToast(check.reason);return;}act('review/decide',{versionId:reviewVersionId,reviewerId:state.currentUserId,decision:REVIEW_DECISION.APPROVED});setToast('Tu aprobación quedó registrada')}}><Icon name="check" size={16}/>{approval}</button></div>
          <AccountProfileMenu initials={state.members[state.currentUserId]?.initials} onNavigate={setCurrentView}/>
        </div>
      </header>
      <div className={`review-layout${commentsPanelCollapsed?' comments-collapsed':''}`}>
        <div className="review-main">
          <DeliveryGrid projectId={media?.projectId||'project-amara'} onRemove={id=>{if(media?.id===id){setCurrentView('personal');if(media.url)URL.revokeObjectURL(media.url);setMedia(null);setSelectedFigure(null);setFocusedComment(null);setCommentDraft('');}}} onNotify={setToast} onSelect={asset=>{revealReviewStage({remount:false});if(media?.url)URL.revokeObjectURL(media.url);setMedia({...asset,setDuration:duration=>setMedia(current=>({...current,duration}))});setCurrentTime(0);setVersion(asset.versionNumber||1);setSelectedFigure(null);setFocusedComment(null);setCommentDraft('');const versionId=asset.versionId||`asset-${asset.id}-v${asset.versionNumber||1}`;setRequestedReviewVersion(versionId);setReviewRoute(window,versionId)}}/>
          <input ref={fileInput} className="visually-hidden" type="file" accept="video/*,image/*" onChange={loadMedia}/>
          <ReviewAssetHeader media={media} onUpload={()=>fileInput.current?.click()}><AssetVersionControl media={media} onNotify={setToast} onSelect={next=>{if(media?.url)URL.revokeObjectURL(media.url);setMedia({...next,duration:next.type==='image'?1:0,setDuration:duration=>setMedia(current=>({...current,duration}))});setVersion(next.versionNumber);setDocumentPage(1);setCurrentTime(0);setSelectedFigure(null);setFocusedComment(null);setSocialMode(false);setRequestedReviewVersion(next.versionId);setReviewRoute(window,next.versionId)}}/></ReviewAssetHeader>
          <div className="social-mode-switch" role="group" aria-label="Modo de visualización"><div className="review-mode-options"><button aria-pressed={!socialMode} onClick={()=>{socialRequest.current++;setSocialMode(false)}}><Icon name="pen" size={16}/><span>Revisión y anotaciones</span></button><button disabled={media?.type==='web'} aria-pressed={socialMode} onClick={()=>setSocialMode(true)}><Icon name="image" size={16}/><span>Preview social</span></button></div><span className="review-mode-hint">{socialMode?'Vista de publicación':'Revisa cada detalle'}</span></div>
          {socialMode?<RetryableFeature load={loadSocialPreview} retryView="review" retryMedia={media} retryMode="social" message="No se pudo cargar la vista previa social. Comprueba tu conexión e inténtalo de nuevo." loadingLabel="Cargando vista previa social…" projectId={media?.projectId||'project-amara'} onSelect={selectSocialAsset} onTime={setCurrentTime} onNotify={setToast} onReview={asset=>{selectSocialAsset(asset);setSocialMode(false)}}/>:['pdf','html','document','presentation'].includes(media?.type)?<DocumentReview media={media} page={documentPage} setPage={setDocumentPage} renderAnnotations={drawing=><><AnnotationLayer activeTool={drawing?activeTool:'' } activeColor={activeColor} marks={marks} setMarks={saveMarks} selectedFigure={selectedFigure}/>{marks.map((mark,index)=><button key={mark.id} className="figure-pin" style={{left:`${mark.points[0].x*100}%`,top:`${mark.points[0].y*100}%`}} aria-label={`Abrir figura ${index+1}`} onClick={()=>selectFigure(mark)}>{index+1}</button>)}{drawing&&<div className="annotation-tools">{['pen','arrow','square','type'].map((tool,index)=><button key={tool} aria-label={['Lápiz','Flecha','Rectángulo','Texto'][index]} aria-pressed={activeTool===tool} className={activeTool===tool?'active':''} onClick={()=>setActiveTool(tool)}><Icon name={tool}/></button>)}{['#ff725e','#f2bd5c','#8ebd72','#67a9d4'].map(color=><button key={color} aria-label={`Color ${color}`} aria-pressed={activeColor===color} onClick={()=>setActiveColor(color)} style={{color}}><span style={{background:color,width:16,height:16,borderRadius:'50%'}}/></button>)}<button aria-label="Deshacer figura" disabled={!marks.length} onClick={()=>saveMarks(marks.slice(0,-1))}><Icon name="undo"/></button></div>}</>} onComment={()=>{setCommentsOpen(true);setSelectedFigure(null);setTimeout(()=>document.querySelector('.comments-drawer textarea, .composer textarea')?.focus(),50)}}/>:<><MediaStage key={annotationContext} activeTool={activeTool} setActiveTool={setActiveTool} activeColor={activeColor} setActiveColor={setActiveColor} media={media} currentTime={currentTime} setCurrentTime={setCurrentTime} remoteCursor={remoteCursor} marks={marks} setMarks={saveMarks} selectedFigure={selectedFigure} onFigure={selectFigure} onQuickComment={addWebComment} figureComments={Object.values(state.comments).filter(c=>c.versionId===reviewVersionId)} reviewVersionId={reviewVersionId} onTimelineComment={comment=>{setCurrentTime(comment.timeSeconds);setFocusedComment(comment.id);setCommentsOpen(true);jumpFigure(comment)}}/></>}
          <div className="review-summary">
            <div><span className="eyebrow">RONDA DE REVISIÓN</span><strong>{openCount} comentarios pendientes</strong><small>Decisiones guardadas en tu cuenta; acceso compartido aún no disponible.</small></div>
            <button className="ai-button" onClick={()=>setSummaryOpen(true)}><Icon name="spark"/><span><strong>Resumir cambios</strong><small>Ver pendientes y bloqueantes</small></span></button>
          </div>
        </div>
        {socialMode&&(socialLoading||media?.id!==socialAssetId||!state.projects[media?.projectId||'project-amara']?.socialPreview?.assetIds.includes(media?.id))?<aside className={`comments-panel${commentsPanelCollapsed?' comments-collapsed':''}`}><div className="panel-head"><strong>Comentarios</strong><button className="comments-collapse-toggle" aria-label={commentsPanelCollapsed?'Mostrar comentarios':'Ocultar comentarios'} aria-expanded={!commentsPanelCollapsed} title={commentsPanelCollapsed?'Mostrar comentarios':'Ocultar comentarios'} onClick={()=>setCommentsPanelCollapsed(value=>!value)}><Icon name="chevron"/></button></div><div className="social-preview"><strong>Comentarios de la lámina</strong>{socialLoading?<BrandLoader label="Cargando la pieza seleccionada…"/>:<p>Selecciona un medio de la preview para revisar sus comentarios.</p>}</div></aside>:<CommentsPanel {...figureProps} collapsed={commentsPanelCollapsed} onToggleCollapsed={()=>setCommentsPanelCollapsed(value=>!value)} onClose={()=>setCommentsOpen(false)} currentTime={currentTime} setCurrentTime={setCurrentTime} draft={commentDraft} setDraft={setCommentDraft} recoveredDraft={recoveredDraft}/>}
      </div>
      {(!socialMode||(!socialLoading&&media?.id===socialAssetId))&&<button className="mobile-comments" onClick={()=>setCommentsOpen(true)}>{Object.values(state.comments).filter(c=>c.versionId===reviewVersionId).length} comentarios <span>{openCount} abiertos</span></button>}
      {commentsOpen && <div className="comments-drawer"><div className="drawer-scrim" onClick={()=>setCommentsOpen(false)}/><CommentsPanel {...figureProps} collapsed={commentsPanelCollapsed} onToggleCollapsed={()=>setCommentsPanelCollapsed(value=>!value)} onClose={()=>setCommentsOpen(false)} currentTime={currentTime} setCurrentTime={setCurrentTime} draft={commentDraft} setDraft={setCommentDraft} recoveredDraft={recoveredDraft}/></div>}
      </>}
      {shareOpen && <ShareDialog reviewVersionId={reviewVersionId} onClose={()=>setShareOpen(false)} onNotify={setToast}/>}
      {shortcutsOpen && <ShortcutHelp onClose={()=>setShortcutsOpen(false)}/>} 
      {summaryOpen && <ReviewSummary versionId={reviewVersionId} onClose={()=>setSummaryOpen(false)}/>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
    <MobileNav user={user} currentView={currentView} onNavigate={setCurrentView}/>
    {!demo&&<GuidedTour onNavigate={setCurrentView}/>}
  </div>;
}

const rootElement = document.getElementById('root');
const root = import.meta.hot?.data.root ?? createRoot(rootElement);
if (import.meta.hot) import.meta.hot.data.root = root;
root.render(<AccountAccess><App/></AccountAccess>);
import MentionInput from './components/MentionInput.jsx';
