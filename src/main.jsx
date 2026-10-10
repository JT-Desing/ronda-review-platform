import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './components/Icon.jsx';
import { createRoot } from 'react-dom/client';
import './styles.css';
import AccountAccess from './components/AccountAccess.jsx';
import { accountStorage } from './state/accountStorage.js';
import { RondaProvider, selectUnreadNotifications, selectVersionStatus, useRonda } from './state/RondaContext.jsx';
import { REVIEW_DECISION, validateReviewDecision } from './domain/review.js';
import { getCommentEmptyState } from './domain/comments.js';
import { annotationVisibleAt, finalizeAnnotation, toNormalizedPoint } from './domain/annotations.js';
import { readDraftForContext, saveSessionDraft } from './state/migration.js';
import { ProjectActions, TeamActions, SettingsActions, ReviewSummary } from './components/WorkspaceActions.jsx';
import Pauta from './components/Pauta.jsx';
import { TimelineMarkers } from './components/TimelineMarkers.jsx';
import { DeliveryGrid, fileStore, fileKind } from './components/DeliveryGrid.jsx';
import AssetVersionControl from './components/AssetVersionControl.jsx';
import {resolveAssetVersion} from './domain/asset-versions.js';
import { AudioCommentInput } from './components/AudioCommentInput.jsx';
import { DocumentReview } from './components/DocumentReview.jsx';
import { resolveFigureAnchor } from './domain/document-anchor.js';
import { fileLabel } from './domain/file-label.js';
import { StudioHome } from './components/StudioWorkspace.jsx';
import './studio-theme.css';
import './folder-cards.css';
import SocialPreview from './components/SocialPreview.jsx';
import './social-preview.css';
import LensNavigation from './components/LensNavigation.jsx';
import './lens-navigation.css';
import BrandSettings from './components/BrandSettings.jsx';
import './brand-settings.css';
import DrawingTrail from './components/DrawingTrail.jsx';
import Planning from './components/Planning.jsx';
import {createCompanyDemo} from './data/company-demo.js';
import {beginDemoSession,endDemoSession} from './state/demoSession.js';
import './company-demo.css';
import './typography.css';
import './studio-art.css';
import './review-header.css';
import ShareReviewDialog from './components/ShareReviewDialog.jsx';

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

function Sidebar({ collapsed, setCollapsed, currentView, onNavigate, onDemo }) {
  const {state}=useRonda();
  const [accountMenu,setAccountMenu]=useState(false);
  return <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
    <button className="brand" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed?'Expandir navegación':'Contraer navegación'}>
      <span className="brand-mark" aria-hidden="true">{state.workspace.branding?.logo?<img src={state.workspace.branding.logo} alt=""/>:<svg viewBox="0 0 32 32"><path d="M18 3a13 13 0 0 1 11 12h-9a4 4 0 0 0-3-3Z" fill="#d4b9fa"/><path d="M28 20A13 13 0 0 1 5 23l7-5a5 5 0 0 0 9-1Z" fill="#efb9d9"/></svg>}</span><span className="brand-name">{state.workspace.branding?.name||'Ronda'}</span>
    </button>
    <LensNavigation className="side-nav" label="Principal" currentView={currentView} collapsed={collapsed}>
      <button className={currentView==='home'?'active':''} onClick={()=>onNavigate('home')}><Icon name="home"/><span>Inicio</span></button>
      <button className={currentView==='pauta'?'active':''} onClick={()=>onNavigate('pauta')}><Icon name="folder"/><span>Pauta</span></button>
      <button className={currentView==='projects'||currentView==='review'?'active':''} onClick={()=>onNavigate('projects')}><Icon name="grid"/><span>Proyectos</span></button>
      <button className={currentView==='activity'?'active':''} onClick={()=>onNavigate('activity')}><Icon name="clock"/><span>Actividad</span></button>
      <button className={currentView==='planning'?'active':''} onClick={()=>onNavigate('planning')}><Icon name="calendar"/><span>Planificación</span></button>
      <button className={currentView==='team'?'active':''} onClick={()=>onNavigate('team')}><Icon name="users"/><span>Equipo</span></button>
    </LensNavigation>
    <div className="side-label">ESPACIO</div>
    <LensNavigation className="side-nav lower" label="Espacio" currentView={currentView} collapsed={collapsed}>
      <button onClick={()=>onNavigate('projects')}><Icon name="folder"/><span>{state.workspace.name}</span></button>
      <button className={currentView==='settings'?'active':''} onClick={()=>onNavigate('settings')}><Icon name="settings"/><span>Configuración</span></button>
      <button className={currentView==='branding'?'active':''} onClick={()=>onNavigate('branding')}><Icon name="image"/><span>Personalización</span></button>
    </LensNavigation>
    <div className="account">
      <span className="avatar small">{state.members[state.currentUserId]?.initials}</span>
      <span className="account-copy"><strong>{state.members[state.currentUserId]?.name}</strong><small>Mi cuenta</small></span>
      <div className="account-menu-wrap" onKeyDown={e=>{if(e.key==='Escape')setAccountMenu(false)}}><button className="account-menu-trigger" aria-label="Opciones de mi cuenta" aria-expanded={accountMenu} onClick={()=>setAccountMenu(!accountMenu)}><Icon name="more"/></button>{accountMenu&&<div className="account-popover" aria-label="Opciones de cuenta"><strong>Mi espacio de trabajo</strong><button onClick={()=>{setAccountMenu(false);onNavigate('projects')}}>Mis proyectos</button><button onClick={()=>{setAccountMenu(false);onNavigate('branding')}}>Personalización</button><button onClick={()=>{setAccountMenu(false);onNavigate('settings')}}>Configuración</button><button onClick={()=>{setAccountMenu(false);onDemo()}}>Empresa activa · Modo demo</button><small>Datos ficticios, separados de tu cuenta.</small></div>}</div>
    </div>
  </aside>;
}

function MobileNav({ currentView, onNavigate }) {
  const items=[['home','grid','Inicio'],['projects','folder','Proyectos'],['pauta','arrow','Pauta'],['planning','calendar','Planner'],['activity','clock','Actividad'],['team','users','Equipo'],['settings','settings','Ajustes']];
  return <nav className="mobile-nav" aria-label="Navegación móvil">{items.map(([view,icon,label])=><button key={view} className={currentView===view||(currentView==='review'&&view==='projects')?'active':''} onClick={()=>onNavigate(view)}><Icon name={icon}/><span>{label}</span></button>)}</nav>;
}

function AnnotationLayer({ activeTool, activeColor, marks, setMarks, selectedFigure }) {
  const canvas = useRef(null);
  const draft = useRef(null);
  const activePointer = useRef(null);
  const [textEditor,setTextEditor]=useState(null);
  const [textValue,setTextValue]=useState('');
  const draw = () => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    const ratio = window.devicePixelRatio || 1;
    const box = el.getBoundingClientRect();
    const width=Math.round(box.width*ratio); const height=Math.round(box.height*ratio);
    if (el.width !== width || el.height !== height) { el.width=width;el.height=height; }
    ctx.setTransform(ratio,0,0,ratio,0,0);
    ctx.clearRect(0, 0, box.width, box.height);
    [...marks, ...(draft.current?.points.length ? [draft.current] : [])].forEach(mark => {
      ctx.shadowColor=mark.id===selectedFigure?'#f2bd5c':'transparent';ctx.shadowBlur=mark.id===selectedFigure?10:0;
      const pixels=mark.points.map(point=>({x:point.x*box.width,y:point.y*box.height}));
      if (mark.tool === 'pen') {
        ctx.strokeStyle = mark.color; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
        pixels.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
      }
      if (mark.tool === 'square' && mark.points.length > 1) {
        const [start,end]=[pixels[0],pixels.at(-1)]; ctx.strokeStyle=mark.color;ctx.lineWidth=4;ctx.strokeRect(start.x,start.y,end.x-start.x,end.y-start.y);
      }
      if (mark.tool === 'arrow' && mark.points.length > 1) {
        const [start,end]=[pixels[0],pixels.at(-1)]; const angle=Math.atan2(end.y-start.y,end.x-start.x);ctx.strokeStyle=mark.color;ctx.lineWidth=4;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(end.x,end.y);ctx.lineTo(end.x-14*Math.cos(angle-Math.PI/6),end.y-14*Math.sin(angle-Math.PI/6));ctx.moveTo(end.x,end.y);ctx.lineTo(end.x-14*Math.cos(angle+Math.PI/6),end.y-14*Math.sin(angle+Math.PI/6));ctx.stroke();
      }
      if (mark.tool === 'type') { ctx.fillStyle=mark.color;ctx.font='600 18px system-ui';ctx.fillText(mark.text,pixels[0].x,pixels[0].y); }
    });
  };
  useEffect(draw, [marks,selectedFigure]);
  useEffect(() => { const observer=new ResizeObserver(draw);if(canvas.current)observer.observe(canvas.current);return()=>observer.disconnect(); },[marks]);
  const point = e => toNormalizedPoint(e,canvas.current.getBoundingClientRect());
  const cancel=e=>{if(e&&activePointer.current!==e.pointerId)return;draft.current=null;activePointer.current=null;draw()};
  const finish=e=>{if(!draft.current||activePointer.current!==e.pointerId)return;draft.current.points.push(point(e));const mark=finalizeAnnotation(draft.current.tool,draft.current.color,draft.current.points);draft.current=null;activePointer.current=null;if(mark)setMarks(current=>[...current,mark]);else draw()};
  const closeText=commit=>{if(commit&&textEditor){const mark=finalizeAnnotation('type',textEditor.color,[textEditor.point],textValue);if(mark)setMarks(current=>[...current,mark]);}setTextEditor(null);setTextValue('')};
  return <><canvas ref={canvas} className={`annotation-layer ${activeTool ? 'drawing' : ''}`}
    onPointerDown={e => { if(!activeTool||activePointer.current!==null||e.isPrimary===false||(e.pointerType==='mouse'&&e.button!==0)) return; const start=point(e); if(activeTool==='type'){setTextEditor({point:start,color:activeColor});setTextValue('');return;} activePointer.current=e.pointerId;e.currentTarget.setPointerCapture?.(e.pointerId);draft.current={tool:activeTool,color:activeColor,points:[start]};draw(); }}
    onPointerMove={e => { if(!draft.current||activePointer.current!==e.pointerId) return;const next=point(e);if(draft.current.tool==='pen')draft.current.points.push(next);else draft.current.points=[draft.current.points[0],next];draw(); }}
    onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={e=>{if(draft.current)finish(e)}} />
    {textEditor&&<input className="annotation-text-input" autoFocus aria-label="Texto de la anotación" value={textValue} onChange={e=>setTextValue(e.target.value)} onKeyDown={e=>{e.stopPropagation();if(e.key==='Enter')closeText(true);if(e.key==='Escape')closeText(false)}} placeholder="Escribe y pulsa Enter · Esc cancela" style={{left:`${textEditor.point.x*100}%`,top:`${textEditor.point.y*100}%`,color:textEditor.color}}/>}</>;
}

function MediaStage({ activeTool, setActiveTool, activeColor, setActiveColor, media, currentTime, setCurrentTime, remoteCursor, marks, setMarks, selectedFigure, onFigure, figureComments, onTimelineComment, reviewVersionId }) {
  const {state}=useRonda();
  const [playing, setPlaying] = useState(false);
  const [muted,setMuted]=useState(false);
  const [redoMarks,setRedoMarks]=useState([]);
  const videoRef = useRef(null);
  const stageRef = useRef(null);
  const colors = ['#ff725e','#f2bd5c','#8ebd72','#67a9d4','#b89be8','#f1eee7'];
  const stamp = formatTime(currentTime);
  const visibleMarks=marks.filter(mark=>annotationVisibleAt(mark,currentTime,media?.type==='image'));
  const duration = media?.duration || 36.42;
  const togglePlayback = () => {
    if (!videoRef.current) { setPlaying(!playing); return; }
    if (videoRef.current.paused) videoRef.current.play(); else videoRef.current.pause();
  };
  const seek=value=>{const next=Math.max(0,Math.min(duration,currentTime+value));setCurrentTime(next);if(videoRef.current)videoRef.current.currentTime=next;};
  const toggleFullscreen=()=>{if(!document.fullscreenElement)stageRef.current?.requestFullscreen?.();else document.exitFullscreen?.();};
  useEffect(()=>{if(videoRef.current&&Math.abs(videoRef.current.currentTime-currentTime)>.2)videoRef.current.currentTime=currentTime},[currentTime]);
  const updateMarks=next=>{setMarks(next);setRedoMarks([]);};
  const undoMark=()=>setMarks(current=>{if(!current.length)return current;setRedoMarks(redo=>[current.at(-1),...redo]);return current.slice(0,-1)});
  const redoMark=()=>setRedoMarks(current=>{if(!current.length)return current;setMarks(marksNow=>[...marksNow,current[0]]);return current.slice(1)});
  useEffect(()=>{const handler=e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;const key=e.key.toLowerCase();if((e.ctrlKey||e.metaKey)&&key==='z'){e.preventDefault();e.shiftKey?redoMark():undoMark();return;}if((e.ctrlKey||e.metaKey)&&key==='y'){e.preventDefault();redoMark();return;}if(key===' '){e.preventDefault();togglePlayback();}if(key==='j')seek(-5);if(key==='l')seek(5);if(key==='arrowleft')seek(-1/24);if(key==='arrowright')seek(1/24);if(key==='m'){setMuted(value=>!value);}if(key==='f')toggleFullscreen();if(key==='d')setActiveTool(tool=>tool?'': 'pen');if(['1','2','3','4'].includes(key))setActiveTool(['pen','arrow','square','type'][Number(key)-1]);};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);});
  return <section className="media-section">
    <div className="media-stage" ref={stageRef}>
      <div className="film-frame">
        {media?.type === 'video' && <video ref={videoRef} className="uploaded-media" src={media.url} muted={muted} onTimeUpdate={e=>setCurrentTime(e.currentTarget.currentTime)} onLoadedMetadata={e=>media.setDuration(e.currentTarget.duration)} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)}/>} 
        {media?.type === 'image' && <img className="uploaded-media" src={media.url} alt={media.name}/>} 
        {!media && <div className="scene-art" role="img" aria-label="Fotograma de una campaña de producto cosmético">
          <div className="scene-grain"/><div className="sun-disc"/><div className="product-shadow"/>
          <div className="product"><div className="cap"/><div className="bottle"><span>AMARA</span><small>BOTANICAL SERUM</small></div></div>
          <div className="scene-copy"><span>02 / RITUAL</span><strong>La calma<br/>también se cultiva.</strong></div>
        </div>}
        {media?.type==='audio'&&<audio ref={videoRef} src={media.url} controls onTimeUpdate={e=>setCurrentTime(e.currentTarget.currentTime)} onLoadedMetadata={e=>media.setDuration(e.currentTarget.duration)}/>}
        {media?.type==='pdf'&&<iframe title={media.name} src={media.url} style={{width:'100%',height:'100%',position:'absolute',zIndex:2}}/>}
        {media?.type==='file'&&<div style={{position:'absolute',zIndex:3,padding:24,background:'#181a16'}}><strong>{media.name}</strong><p>Sin vista previa. Comentarios generales disponibles.</p><a href={media.url} download={media.name}>Descargar archivo local</a></div>}
        <AnnotationLayer activeTool={activeTool} activeColor={activeColor} marks={visibleMarks} setMarks={next=>updateMarks(current=>[...current.filter(mark=>!annotationVisibleAt(mark,currentTime,media?.type==='image')),...(typeof next==='function'?next(visibleMarks):next)])} selectedFigure={selectedFigure}/>
        {visibleMarks.map(mark=>{const index=marks.findIndex(item=>item.id===mark.id);return <button key={mark.id} className={`figure-pin ${selectedFigure===mark.id?'selected':''}`} style={{left:`${mark.points[0].x*100}%`,top:`${mark.points[0].y*100}%`}} aria-label={`Figura ${index+1}, ${figureComments.filter(c=>c.annotationId===mark.id).length} comentarios`} onClick={()=>onFigure(mark)}>{index+1}</button>})}
        {remoteCursor&&<div className="remote-cursor" style={{left:`${remoteCursor.x}%`,top:`${remoteCursor.y}%`,'--presence-color':remoteCursor.color}}><i/><span>{remoteCursor.name}</span></div>}
        <div className="frame-badge">{stamp.time} · F{stamp.frame}</div>
      </div>
      <div className="annotation-tools" aria-label="Herramientas de anotación">
        {['pen','arrow','square','type'].map((tool,index) => <button key={tool} title={`${['Lápiz','Flecha','Rectángulo','Texto'][index]} · ${index+1}`} onClick={()=>setActiveTool(tool)} className={activeTool===tool?'active':''} aria-pressed={activeTool===tool} aria-label={`${['Lápiz','Flecha','Rectángulo','Texto'][index]} (${index+1})`}><Icon name={tool}/><kbd>{index+1}</kbd></button>)}
        <span className="tool-divider"/>
        <div className="color-options">{colors.map((c,index)=><button key={c} aria-label={`Color ${['coral','ámbar','verde','azul','violeta','blanco'][index]}`} aria-pressed={activeColor===c} title={c} onClick={()=>setActiveColor(c)} className={activeColor===c?'selected':''} style={{'--swatch':c}}/>)}</div>
        <span className="tool-divider"/><button onClick={undoMark} disabled={!marks.length} title="Deshacer · Ctrl/⌘ + Z" aria-label="Deshacer última anotación"><Icon name="undo"/></button><button onClick={redoMark} disabled={!redoMarks.length} title="Rehacer · Ctrl/⌘ + Shift + Z" aria-label="Rehacer anotación"><Icon name="redo"/></button>
      </div>
    </div>
    <div className="player-controls">
      <button className="play" onClick={togglePlayback} aria-label={playing?'Pausar':'Reproducir'}><Icon name={playing?'pause':'play'} size={20}/></button>
      <span className="timecode"><strong>{stamp.time}</strong><span>/ {formatTime(duration).time}</span></span>
      <div className="scrubber"><input aria-label="Posición del video" type="range" min="0" max={duration || 1} step="0.01" value={Math.min(currentTime,duration || 1)} onChange={e=>{const value=Number(e.target.value);setCurrentTime(value);if(videoRef.current)videoRef.current.currentTime=value}}/><div className="scrubber-fill" style={{width:`${Math.min(100,currentTime/(duration||1)*100)}%`}}/><TimelineMarkers versionId={reviewVersionId} comments={figureComments} duration={duration} members={state.members} onOpen={c=>{videoRef.current?.pause();setPlaying(false);onTimelineComment(c)}}/><span className="playhead" style={{left:`${Math.min(100,currentTime/(duration||1)*100)}%`}}/></div>
      <button aria-label={muted?'Activar sonido':'Silenciar'} onClick={()=>setMuted(!muted)} className={muted?'active':''}><Icon name="volume"/></button><span className="fps">24 FPS</span><button aria-label="Pantalla completa (F)" onClick={toggleFullscreen}><Icon name="maximize"/></button>
    </div>
  </section>;
}

function CommentCard({ item, selected, onSelect, onResolve, onReply, onJump, members, selectedFigure, annotationContext }) {
  const {act}=useRonda();
  const [options,setOptions]=useState(false);
  const [editing,setEditing]=useState(false);
  const [editedText,setEditedText]=useState(item.text);
  const [replying,setReplying]=useState(false); const [reply,setReply]=useState(''); const replies=Array.isArray(item.replies)?item.replies:[];
  const submitReply=()=>{if(!reply.trim())return;onReply(item.id,reply.trim());setReply('');setReplying(false)};
  return <article className={`comment-card ${selected?'selected':''} ${item.status==='resolved'?'resolved':''}`} onClick={onSelect}>
    <div className="comment-head"><span className="avatar" style={{background:item.color}}>{item.initials}</span><span className="comment-author"><strong>{item.author}</strong><small>{item.author==='Julian Torres'?'Ahora':'Hace unos minutos'}</small></span>{item.priority==='blocking'&&<span className="priority-label">Bloqueante</span>}<button className="icon-button" aria-label="Opciones del comentario" aria-expanded={options} onClick={e=>{e.stopPropagation();setOptions(!options)}}><Icon name="more"/></button></div>
    {options&&<div className="comment-foot" onClick={e=>e.stopPropagation()}><button onClick={()=>{setEditedText(item.text);setEditing(true);setOptions(false)}}>Editar texto</button><button onClick={()=>{act('comment/update',{id:item.id,changes:{priority:item.priority==='blocking'?'normal':'blocking'}});setOptions(false)}}>{item.priority==='blocking'?'Quitar bloqueo':'Marcar bloqueante'}</button></div>}
    {options&&<div className="comment-foot" onClick={e=>e.stopPropagation()}>{selectedFigure&&<button onClick={()=>{act('comment/update',{id:item.id,changes:{annotationId:selectedFigure,annotationContext}});setOptions(false)}}>Vincular a figura seleccionada</button>}{item.annotationId&&<button onClick={()=>{act('comment/update',{id:item.id,changes:{annotationId:null,annotationContext:null}});setOptions(false)}}>Desvincular figura</button>}</div>}
    {item.annotationId&&<button className="comment-location" onClick={e=>{e.stopPropagation();onJump(item)}}>Ver figura vinculada</button>}
    <button className="comment-location" onClick={e=>{e.stopPropagation();onJump(item)}}><Icon name="play" size={11}/><strong>{item.time}</strong><span>{item.page?`Página / vista ${item.page}`:`Fotograma ${item.frame}`}</span></button>
    {editing?<div className="inline-reply" onClick={e=>e.stopPropagation()}><input aria-label="Editar comentario" autoFocus value={editedText} onChange={e=>setEditedText(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setEditing(false);if(e.key==='Enter'&&editedText.trim()){act('comment/update',{id:item.id,changes:{text:editedText.trim()}});setEditing(false)}}}/><button disabled={!editedText.trim()} onClick={()=>{act('comment/update',{id:item.id,changes:{text:editedText.trim()}});setEditing(false)}}>Guardar</button><button onClick={()=>setEditing(false)}>Cancelar</button></div>:<p className="comment-copy">{item.text}</p>}
    {!!item.attachments?.length&&<div className="comment-attachments">{item.attachments.map(file=>file.type?.startsWith('audio/')?<div key={file.id} onClick={e=>e.stopPropagation()}><span>{file.name}</span><audio controls preload="metadata" src={file.dataUrl} aria-label={`Escuchar ${file.name}`}/></div>:<button key={file.id} onClick={e=>{e.stopPropagation();window.open(file.dataUrl,'_blank','noopener,noreferrer')}} aria-label={`Abrir referencia ${file.name}`}><img src={file.dataUrl} alt={file.name}/><span>{file.name}</span></button>)}</div>}
    {!!replies.length&&<div className="reply-list">{replies.slice(-2).map(entry=>{const author=members[entry.authorId]||{name:'Invitado',initials:'IN'};return <div key={entry.id}><span className="avatar">{author.initials}</span><p><strong>{author.name}</strong>{entry.text}</p></div>})}</div>}
    {replying&&<div className="inline-reply" onClick={e=>e.stopPropagation()}><input autoFocus aria-label={`Responder a ${item.author}`} value={reply} onChange={e=>setReply(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')submitReply();if(e.key==='Escape')setReplying(false)}} placeholder="Escribe una respuesta…"/><button onClick={submitReply}>Enviar</button></div>}
    <footer className="comment-foot"><div><button onClick={e=>{e.stopPropagation();setReplying(!replying)}}>Responder{replies.length>0&&` · ${replies.length}`}</button><button onClick={e=>{e.stopPropagation();onJump(item)}}>Ir al cuadro</button></div><button onClick={e=>{e.stopPropagation();onResolve(item.id)}} className={item.status==='resolved'?'done':''}><Icon name="check" size={14}/>{item.status==='resolved'?'Reabrir':'Resolver'}</button></footer>
  </article>;
}

function CommentsPanel({ onClose, currentTime, setCurrentTime, draft, setDraft, recoveredDraft, selectedFigure, setSelectedFigure, annotationContext, figureTime, focusedComment, onJumpFigure, documentPage, reviewVersionId='version-amara-v3' }) {
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
  const attachmentInput=useRef(null);
  const visible = useMemo(()=>comments.filter(c=>(filter==='Todos'||(filter==='Abiertos'&&c.status==='open')||(filter==='Resueltos'&&c.status==='resolved'))&&`${c.author} ${c.text} ${(c.replies||[]).map(reply=>reply.text).join(' ')} ${c.frame}`.toLowerCase().includes(search.toLowerCase())),[comments,filter,search]);
  const emptyState=visible.length===0?getCommentEmptyState({total:comments.length,filter,search}):null;
  const resolve = id => act(state.comments[id]?.status==='resolved'?'comment/reopen':'comment/resolve',{id});
  const stamp = formatTime(currentTime);
  const addFiles=async files=>{setAttachmentError('');if(attachments.length>=3){setAttachmentError('Máximo 3 adjuntos por comentario.');return;}const candidates=[...files].filter(file=>file.type.startsWith('image/')||file.type.startsWith('audio/')||file.name.toLowerCase().endsWith('.mp3')).slice(0,3-attachments.length);for(const file of candidates){if(file.size>2*1024*1024){setAttachmentError('Cada adjunto debe pesar menos de 2 MB para el almacenamiento local.');continue;}try{const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});setAttachments(current=>[...current,{id:crypto.randomUUID(),name:file.name,type:file.type||'audio/mpeg',dataUrl}].slice(0,3));}catch{setAttachmentError('No se pudo leer el archivo.')}}};
  const add = () => { if(!draft.trim()&&!attachments.length) return; const projectId=state.versions[reviewVersionId]?.projectId;if(!projectId||!state.projects[projectId])return;const time=selectedFigure?figureTime:currentTime; act('comment/add',{projectId,versionId:reviewVersionId,page:documentPage,authorId:state.currentUserId,assigneeId:state.currentUserId,priority:'normal',text:draft.trim()||'Referencia visual adjunta',attachments,timeSeconds:time,frame:formatTime(time).frame,annotationId:selectedFigure||null,annotationContext:selectedFigure?annotationContext:null}); setDraft('');setAttachments([]);setSelectedFigure(null);recoveredDraft.current=false; };
  const replyTo=(id,text)=>{const current=state.comments[id];act('comment/update',{id,changes:{replies:[...(current.replies||[]),{id:`reply-${Date.now()}`,authorId:state.currentUserId,text,createdAt:new Date().toISOString()}]}})};
  return <aside className="comments-panel">
    <div className="panel-head"><div><span className="panel-kicker">REVISIÓN</span><strong>Comentarios</strong><small>{comments.filter(c=>c.status==='open').length} pendientes de {comments.length}</small></div><button className="mobile-close" aria-label="Cerrar comentarios" onClick={onClose}><Icon name="x"/></button></div>
    <div className="comment-toolbar"><div className="comment-tabs" role="tablist" aria-label="Filtrar comentarios">{['Todos','Abiertos','Resueltos'].map(item=><button key={item} role="tab" aria-selected={filter===item} className={filter===item?'active':''} onClick={()=>setFilter(item)}>{item}<span>{item==='Todos'?comments.length:comments.filter(c=>c.status===(item==='Abiertos'?'open':'resolved')).length}</span></button>)}</div><label className="comment-search"><Icon name="search" size={14}/><input aria-label="Buscar comentarios" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar"/></label></div>
    <div className="comments-scroll">{visible.map(c=><div key={c.id} id={`thread-${c.id}`}><CommentCard item={c} members={state.members} selectedFigure={selectedFigure} annotationContext={annotationContext} selected={selected===c.id} onSelect={()=>{setSelected(c.id);onJumpFigure(c)}} onResolve={resolve} onReply={replyTo} onJump={item=>{setSelected(item.id);setCurrentTime?.(item.timeSeconds ?? (item.frame||0)/24);onJumpFigure(item)}}/></div>)}{emptyState&&<div className="comments-empty"><strong>{emptyState.title}</strong><span>{emptyState.detail}</span>{emptyState.action&&<button onClick={()=>{if(emptyState.kind==='search')setSearch('');else setFilter('Todos')}}>{emptyState.action}</button>}</div>}</div>
    <div className="composer">
      <AudioCommentInput onAttach={addFiles} onError={setAttachmentError}/>
      {attachments.filter(file=>file.type?.startsWith('audio/')).map(file=><div className="audio-draft" key={file.id}><span>{file.name}</span><audio controls src={file.dataUrl} aria-label={`Revisar audio ${file.name}`}/><button aria-label={`Eliminar audio ${file.name}`} onClick={()=>setAttachments(current=>current.filter(item=>item.id!==file.id))}>Quitar audio</button></div>)}
      {selectedFigure&&<div className="figure-link-status"><span className="figure-linked-label"><svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2"/></svg>Figura vinculada</span><button aria-label="Desvincular la figura del nuevo comentario" onClick={()=>setSelectedFigure(null)}>Desvincular <span aria-hidden="true">×</span></button></div>}
      <div className="composer-input">{recoveredDraft.current&&draft&&<small className="draft-recovered" role="status">Borrador recuperado</small>}{!!attachments.length&&<div className="reference-strip">{attachments.map(file=><span key={file.id}><img src={file.dataUrl} alt=""/><button aria-label={`Quitar ${file.name}`} onClick={()=>setAttachments(current=>current.filter(item=>item.id!==file.id))}>×</button></span>)}</div>}<MentionInput value={draft} onChange={e=>{recoveredDraft.current=false;setDraft(e.target.value)}} onPaste={e=>{if(e.clipboardData.files.length){e.preventDefault();addFiles(e.clipboardData.files)}}} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')add()}} aria-label="Escribir comentario" placeholder={documentPage?`Comenta la página / vista ${documentPage}…`:`Comenta o pega una captura sobre ${stamp.time}…`}/><div className="composer-meta"><span>{documentPage?`Página / vista ${documentPage}`:`F${stamp.frame}`} · Ctrl/⌘ + Enter</span><input ref={attachmentInput} className="visually-hidden" type="file" accept="image/*" multiple onChange={e=>{addFiles(e.target.files);e.target.value=''}}/><button onClick={()=>attachmentInput.current?.click()} title="Agregar imagen o captura"><Icon name="image" size={15}/> Referencia</button></div>{attachmentError&&<small className="attachment-error">{attachmentError}</small>}</div>
      <button className="send" aria-label="Publicar comentario" onClick={add} disabled={!draft.trim()&&!attachments.length}><Icon name="send"/></button>
    </div>
  </aside>;
}

function ShareDialog({ onClose, onNotify }) {
  const reviewUrl = `${location.origin}${import.meta.env.BASE_URL}#review/version-amara-v3`;
  return <ShareReviewDialog reviewUrl={reviewUrl} onClose={onClose} onNotify={onNotify}/>;
}

const projectData = [
  { id:1, name:'Campaña Amara', client:'Amara Botanicals', asset:'Spot principal · 30s', status:'En revisión', comments:2, versions:3, color:'#c96c4f', art:'amara' },
  { id:2, name:'Lanzamiento Norte', client:'Norte Café', asset:'Reel social · 15s', status:'Cambios solicitados', comments:7, versions:2, color:'#657c61', art:'norte' },
  { id:3, name:'Colección Línea', client:'Casa Línea', asset:'Lookbook · 24 piezas', status:'Aprobado', comments:0, versions:5, color:'#6a7998', art:'linea' },
  { id:4, name:'Informe de impacto', client:'Fundación Bosque', asset:'PDF · 48 páginas', status:'Borrador', comments:0, versions:1, color:'#8c6b8f', art:'bosque' },
];

function DashboardHeader({ title, subtitle, action, onAction }) {
  return <header className="dashboard-header"><div><span className="eyebrow">NÉBULA STUDIO</span><h1>{title}</h1><p>{subtitle}</p></div><div className="dashboard-actions"><button aria-label="Buscar"><Icon name="search"/></button>{action && <button className="primary-action" onClick={onAction}><Icon name="plus" size={16}/>{action}</button>}</div></header>;
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

function ActivityView({onNavigate}) {
  const {state,act}=useRonda();
  const [type,setType]=useState('Todo'); const [project,setProject]=useState('Todos'); const [person,setPerson]=useState('Todas'); const [period,setPeriod]=useState('30'); const [query,setQuery]=useState(''); const [onlyUnread,setOnlyUnread]=useState(false);
  const [readIds,setReadIds]=useState(()=>{try{return JSON.parse(accountStorage.getItem('ronda-activity-read'))||[]}catch{return[]}});
  useEffect(()=>accountStorage.setItem('ronda-activity-read',JSON.stringify(readIds)),[readIds]);
  const live=state.activity.map(event=>{const actor=state.members[event.actorId];const isComment=event.kind.startsWith('comment');return {id:event.id,who:actor?.name||'Equipo',initials:actor?.initials||'EQ',color:'#67a9d4',action:event.kind==='comment.created'?'creó un comentario':event.kind==='comment.resolved'?'resolvió un comentario':event.kind==='comment.reopened'?'reabrió un comentario':'registró una decisión',where:'Campaña Amara · Spot principal',project:'Campaña Amara',detail:isComment?(state.comments[event.commentId]?.text||'Actividad de comentario'):(event.decision==='approved'?'Aprobó la versión':'Solicitó cambios'),time:'Ahora',occurredAt:event.occurredAt,type:isComment?'comment':'approval'};});
  const seeded=[].map((item,index)=>({...item,id:`seed-${index}`,project:item.where.split(' · ')[0],occurredAt:new Date(Date.now()-[4,22,60,120,1500][index]*60000).toISOString()}));
  const all=[...live,...seeded].map(item=>({...item,unread:!readIds.includes(item.id)}));
  const people=[...new Set(all.map(item=>item.who))]; const projects=[...new Set(all.map(item=>item.project))];
  const visible=all.filter(item=>(type==='Todo'||item.type===type)&&(project==='Todos'||item.project===project)&&(person==='Todas'||item.who===person)&&(!onlyUnread||item.unread)&&((Date.now()-new Date(item.occurredAt).getTime())/86400000<=Number(period))&&(`${item.who} ${item.action} ${item.where} ${item.detail}`.toLowerCase().includes(query.toLowerCase())));
  const groups=[['Hoy',visible.filter(item=>(Date.now()-new Date(item.occurredAt).getTime())<86400000)],['Ayer',visible.filter(item=>{const age=Date.now()-new Date(item.occurredAt).getTime();return age>=86400000&&age<172800000})],['Esta semana',visible.filter(item=>(Date.now()-new Date(item.occurredAt).getTime())>=172800000)]];
  const markAll=()=>{setReadIds(all.map(item=>item.id));act('notification/readAll',{})};
  const clear=()=>{setType('Todo');setProject('Todos');setPerson('Todas');setPeriod('30');setQuery('');setOnlyUnread(false)};
  return <div className="dashboard-page activity-page"><DashboardHeader title="Actividad" subtitle="Filtra decisiones, cambios y conversaciones de todo el espacio."/><section className="activity-metrics"><div><strong>{all.filter(item=>item.unread).length}</strong><span>Sin leer</span></div><div><strong>{all.filter(item=>item.type==='comment').length}</strong><span>Comentarios</span></div><div><strong>{all.filter(item=>item.type==='approval').length}</strong><span>Decisiones</span></div><div><strong>{projects.length}</strong><span>Proyectos activos</span></div></section><section className="activity-filters"><div className="search-field"><Icon name="search" size={16}/><input aria-label="Buscar en actividad" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar persona, proyecto o contenido"/></div><div className="filter-row"><select aria-label="Filtrar por tipo" value={type} onChange={e=>setType(e.target.value)}><option>Todo</option><option value="comment">Comentarios</option><option value="approval">Aprobaciones</option><option value="upload">Versiones</option><option value="resolved">Resueltos</option><option value="invite">Invitaciones</option></select><select aria-label="Filtrar por proyecto" value={project} onChange={e=>setProject(e.target.value)}><option>Todos</option>{projects.map(value=><option key={value}>{value}</option>)}</select><select aria-label="Filtrar por persona" value={person} onChange={e=>setPerson(e.target.value)}><option>Todas</option>{people.map(value=><option key={value}>{value}</option>)}</select><select aria-label="Filtrar por período" value={period} onChange={e=>setPeriod(e.target.value)}><option value="1">Últimas 24 horas</option><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option></select><label className="unread-filter"><input type="checkbox" checked={onlyUnread} onChange={e=>setOnlyUnread(e.target.checked)}/> Sin leer</label></div><div className="filter-actions"><span>{visible.length} eventos encontrados</span><button onClick={clear}>Limpiar filtros</button><button className="quiet-button" onClick={markAll}><Icon name="check" size={15}/> Marcar todo como leído</button></div></section><section className="activity-timeline">{groups.map(([label,items])=>items.length>0&&<div className="activity-group" key={label}><h2>{label}<span>{items.length}</span></h2><div className="activity-list">{items.map(item=><article className={`activity-item ${item.unread?'unread':''}`} key={item.id}><span className="activity-dot"/><span className="avatar" style={{background:item.color}}>{item.initials}</span><div><p><strong>{item.who}</strong> {item.action}</p><button onClick={()=>{setReadIds(current=>[...new Set([...current,item.id])]);onNavigate(item.project==='Campaña Amara'?'review':'projects')}}>{item.where}</button><blockquote>{item.detail}</blockquote></div><div className="activity-end"><time>{item.time}</time>{item.unread&&<button onClick={()=>setReadIds(current=>[...current,item.id])}>Marcar leído</button>}</div></article>)}</div></div>)}{visible.length===0&&<div className="activity-empty"><Icon name="search" size={26}/><strong>No encontramos actividad</strong><p>Prueba otro período o elimina algunos filtros.</p><button onClick={clear}>Restablecer filtros</button></div>}</section></div>;
}

function NotificationCenter({onNavigate}) {
  const {state,act}=useRonda(); const [open,setOpen]=useState(false);
  const unread=selectUnreadNotifications(state);
  return <div className="notification-center"><button className="notification-trigger" aria-label={`${unread.length} notificaciones sin leer`} onClick={()=>setOpen(!open)}><Icon name="bell" size={17}/>{unread.length>0&&<b>{unread.length}</b>}</button>{open&&<div className="notification-popover"><header><strong>Notificaciones</strong><button onClick={()=>act('notification/readAll',{})}>Marcar leídas</button></header>{unread.length===0?<p>Estás al día.</p>:unread.map(item=><button key={item.id} onClick={()=>{act('notification/read',{id:item.id});onNavigate('review');setOpen(false)}}><strong>Nueva actividad asignada</strong><span>Campaña Amara · abrir revisión</span></button>)}</div>}</div>;
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

function ShortcutHelp({onClose}) {
  const shortcuts=[['Ctrl/⌘ + Z','Deshacer última anotación'],['Ctrl/⌘ + Shift + Z','Rehacer anotación'],['Espacio','Reproducir / pausar'],['J / L','Retroceder / avanzar 5 s'],['← / →','Mover un fotograma'],['1–4','Lápiz, flecha, rectángulo y texto'],['D','Activar u ocultar dibujo'],['M','Silenciar'],['F','Pantalla completa'],['C','Escribir comentario'],['Ctrl/⌘ + Enter','Publicar comentario'],['Esc','Cerrar paneles']];
  return <div className="modal-layer"><button className="modal-scrim" aria-label="Cerrar atajos" onClick={onClose}/><section className="modal shortcut-modal" role="dialog" aria-modal="true" aria-labelledby="shortcut-title"><div className="modal-title"><div><span className="eyebrow">COMANDOS RÁPIDOS</span><h2 id="shortcut-title">Atajos de revisión</h2></div><button aria-label="Cerrar" onClick={onClose}><Icon name="x"/></button></div><div className="shortcut-grid">{shortcuts.map(([keys,label])=><div key={keys}><kbd>{keys}</kbd><span>{label}</span></div>)}</div></section></div>;
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
  const {state,act,persistenceError,retryPersistence}=useRonda();
  const [media, setMedia] = useState(null);
  const [socialMode,setSocialMode]=useState(false);
  const [socialLoading,setSocialLoading]=useState(false);
  const [socialAssetId,setSocialAssetId]=useState(null);
  const socialRequest=useRef(0);
  const selectSocialAsset=async asset=>{asset=resolveAssetVersion(state,asset);const request=++socialRequest.current;setSocialLoading(true);setSocialAssetId(asset.id);setCommentsOpen(false);try{const file=await fileStore(asset.fileId);if(request!==socialRequest.current)return;setMedia(current=>{if(current?.url)URL.revokeObjectURL(current.url);return {...asset,identity:asset.identity,url:URL.createObjectURL(file),duration:asset.type==='image'?1:0,setDuration:duration=>setMedia(value=>({...value,duration}))}});setCurrentTime(0);setVersion(asset.versionNumber);setSelectedFigure(null);setFocusedComment(null);}catch{if(request===socialRequest.current)setToast('No se pudo cargar la lámina; comentarios no cambiados')}finally{if(request===socialRequest.current)setSocialLoading(false)}};
  const openProject=async project=>{
    const original=(state.assets||[]).find(item=>item.projectId===project.id);const asset=original?resolveAssetVersion(state,original):null;
    if(!asset){if(project.id==='project-amara'){setMedia(null);setCurrentView('review');return;}setToast('Este proyecto todavía no tiene piezas para revisar.');setCurrentView('projects');return;}
    try{const file=await fileStore(asset.fileId);setMedia(current=>{if(current?.url)URL.revokeObjectURL(current.url);return {...asset,identity:asset.identity,url:URL.createObjectURL(file),duration:asset.type==='image'?1:0,setDuration:duration=>setMedia(value=>({...value,duration}))}});setVersion(asset.versionNumber);setCurrentTime(0);setDocumentPage(1);setSelectedFigure(null);setFocusedComment(null);setSocialMode(false);setCurrentView('review');}catch{setToast('No se pudo abrir la pieza. Tus datos permanecen guardados.');}
  };
  const [documentPage,setDocumentPage]=useState(1);
  const pendingFigureJump=useRef(null);
  const [version, setVersion] = useState(3);
  const draftKey=`ronda:draft:${state.workspace.id}:${media?.projectId||'project-amara'}:${media?.id||'demo'}:version-${version}:${state.currentUserId}`;
  const draftStorage=typeof sessionStorage==='undefined'?null:sessionStorage;
  const [draftCache,setDraftCache]=useState({});
  const commentDraft=readDraftForContext(draftCache,draftStorage,draftKey);
  const setCommentDraft=value=>setDraftCache(current=>({...current,[draftKey]:typeof value==='function'?value(readDraftForContext(current,draftStorage,draftKey)):value}));
  const recoveredDraft=useRef(Boolean(commentDraft));
  const [collapsed, setCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState(location.hash.startsWith('#review/')?'review':'home');
  const [companyDemo,setCompanyDemo]=useState(false);
  const [activeTool, setActiveTool] = useState('pen');
  const [activeColor, setActiveColor] = useState('#ff725e');
  const [commentsOpen, setCommentsOpen] = useState(false);
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
    try{const file=asset?await fileStore(asset.fileId):null;plannerJump.current=comment;setSocialMode(false);setMedia(current=>{if(current?.url)URL.revokeObjectURL(current.url);return asset?{...asset,identity:asset.identity,url:URL.createObjectURL(file),duration:asset.type==='image'?1:0,setDuration:duration=>setMedia(value=>({...value,duration}))}:null});setVersion(sourceVersion?.number||3);setDocumentPage(comment.page||1);setCurrentTime(comment.timeSeconds||0);setCurrentView('review');setCommentsOpen(true);}catch{setToast('No se pudo abrir el archivo. Tus comentarios siguen guardados');}
  };
  const annotationContext=`${media?.projectId||'project-amara'}:version-amara-v${version}:${media?.identity||'demo-amara'}${['pdf','html','document','presentation'].includes(media?.type)?`:page-${documentPage}`:''}`;
  const marks=state.annotations?.[annotationContext]||[];
  const saveMarks=next=>{const updated=typeof next==='function'?next(marks):next;const enriched=updated.map(mark=>mark.id?mark:{...mark,id:crypto.randomUUID(),timeSeconds:currentTime});act('annotations/save',{context:annotationContext,marks:enriched});if(enriched.length>marks.length){setSelectedFigure(enriched.at(-1).id);setActiveTool('');}if(selectedFigure&&!enriched.some(m=>m.id===selectedFigure))setSelectedFigure(null);};
  const selectFigure=mark=>{setSelectedFigure(mark.id);setCurrentTime(mark.timeSeconds);setActiveTool('');const comment=Object.values(state.comments).find(c=>c.annotationId===mark.id&&c.annotationContext===annotationContext);setFocusedComment(comment?.id||null);setCommentsOpen(true);};
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
  const loadMedia = async event => { const file=event.target.files?.[0]; if(!file)return;event.target.value='';const type=fileKind(file);if(!['video','image'].includes(type)){setToast('Para documentos y otros formatos, usa Agregar archivos en la parrilla.');return;}try{setToast('Guardando archivo en el servidor…');const id=crypto.randomUUID();await fileStore(id,file);const asset={id,name:file.name,type,mime:file.type,size:file.size,extension:file.name.split('.').at(-1).toUpperCase(),projectId:media?.projectId||'project-amara'};act('asset/add',asset);if(media?.url)URL.revokeObjectURL(media.url);setCurrentTime(0);setMedia({...asset,identity:id,url:URL.createObjectURL(file),duration:type==='image'?1:0,setDuration:duration=>setMedia(current=>({...current,duration}))});setToast('Archivo guardado en tu cuenta');}catch(error){setToast(error.message||'No se pudo guardar el archivo');} };
  const followReviewer=person=>{setCurrentTime(person.time);setRemoteCursor(person);setToast(`Siguiendo a ${person.name} en ${formatTime(person.time).time}`)};
  if(companyDemo)return <RondaProvider initialState={companyDemo} ephemeral><App demo onExitDemo={()=>{endDemoSession();setCompanyDemo(false)}}/></RondaProvider>;
  return <div className="app-shell">
    <DrawingTrail enabled={currentView==='review'&&!socialMode&&activeTool!=='type'&&Boolean(activeTool)} color={activeColor}/>
    <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} currentView={currentView} onNavigate={setCurrentView} onDemo={()=>{if(demo)return;const fixture=createCompanyDemo();beginDemoSession(fixture);setCompanyDemo(fixture)}}/>
    <main className={`workspace ${currentView!=='review'?'dashboard-workspace':''}`}>
      {demo&&<div className="demo-company-banner" role="status"><span>DEMO · Empresa activa · Datos ficticios. Los cambios se descartan al salir.</span><button onClick={onExitDemo}>Volver a mi cuenta</button></div>}
      {currentView!=='review' && <header className="studio-topbar"><span>{state.workspace.name} <span aria-hidden="true">/</span> <strong>{{home:'Inicio',projects:'Proyectos',pauta:'Pauta',activity:'Actividad',planning:'Planificación',team:'Equipo',settings:'Configuración',branding:'Personalización'}[currentView]}</strong></span><div><NotificationCenter onNavigate={setCurrentView}/><span className="avatar small">{state.members[state.currentUserId]?.initials}</span><span className="studio-greeting">Hola, {state.members[state.currentUserId]?.name?.split(' ')[0]}</span></div></header>}
      {currentView==='home' && <StudioHome onNavigate={setCurrentView} onOpen={openProject}/>}
      {persistenceError&&<div className="persistence-alert" role="alert"><Icon name="alert" size={16}/><span><strong>Los cambios están solo en este dispositivo</strong><small>{persistenceError==='quota'?'El almacenamiento del navegador está lleno. Quita algunas referencias pesadas o libera espacio.':'El navegador bloqueó el almacenamiento local.'}</small></span><button onClick={retryPersistence}>Reintentar</button></div>}
      {currentView==='projects' && <ProjectActions onOpen={openProject} onNotify={setToast}/>}
      {currentView==='activity' && <ActivityView onNavigate={setCurrentView}/>}
      {currentView==='planning' && <Planning onOpen={openPlanningComment}/>}
      {currentView==='team' && <TeamActions onNotify={setToast}/>}
      {currentView==='settings' && <SettingsActions onNotify={setToast}/>}
      {currentView==='branding' && <BrandSettings onNotify={setToast}/>}
      {currentView==='pauta' && <Pauta/>}
      {currentView==='review' && <>
      <header className="topbar">
        <div className="breadcrumb"><button onClick={()=>setCurrentView('projects')}>{state.projects[media?.projectId||'project-amara']?.name}</button><Icon name="chevron" size={14}/><div><strong>{state.versions[reviewVersionId]?.name || media?.name || 'Revisión'}</strong><span>Guardado por cuenta</span></div></div>
        <div className="top-actions">
          <span className="avatar small" title="Tu sesión activa; presencia compartida aún no disponible">{state.members[state.currentUserId]?.initials}</span>
          <button className="shortcut-trigger" aria-label="Ver atajos de teclado" title="Atajos (?)" onClick={()=>setShortcutsOpen(true)}>?</button>
          <NotificationCenter onNavigate={setCurrentView}/>
          <button className="secondary" aria-label="Compartir revisión" onClick={()=>setShareOpen(true)}><Icon name="share" size={17}/><span>Compartir</span></button>
          <div className="approval-menu"><button className={`approval ${approval==='Aprobado'?'approved':''}`} onClick={()=>{const check=validateReviewDecision(state,{versionId:reviewVersionId,reviewerId:state.currentUserId,decision:REVIEW_DECISION.APPROVED});if(!check.allowed){setToast(check.reason);return;}act('review/decide',{versionId:reviewVersionId,reviewerId:state.currentUserId,decision:REVIEW_DECISION.APPROVED});setToast('Tu aprobación quedó registrada')}}><Icon name="check" size={16}/>{approval}</button></div>
        </div>
      </header>
      <div className="review-layout">
        <div className="review-main">
          <DeliveryGrid projectId={media?.projectId||'project-amara'} onNotify={setToast} onSelect={asset=>{if(media?.url)URL.revokeObjectURL(media.url);setMedia({...asset,setDuration:duration=>setMedia(current=>({...current,duration}))});setCurrentTime(0);setVersion(asset.versionNumber||1);setSelectedFigure(null);setFocusedComment(null);setCommentDraft('')}}/>
          <div className="asset-bar"><div className="asset-meta"><span className="file-type">{fileLabel(media)}</span><div><strong>{media?.name || 'AMARA_SPOT_MASTER'}</strong><span>{media?'Archivo local de revisión':'1920 × 1080 · H.264 · 48.2 MB'}</span></div></div><div className="asset-actions"><input ref={fileInput} className="visually-hidden" type="file" accept="video/*,image/*" onChange={loadMedia}/><button className="upload-button" onClick={()=>fileInput.current?.click()}><Icon name="plus" size={15}/> Cargar archivo</button><AssetVersionControl media={media} onNotify={setToast} onSelect={next=>{if(media?.url)URL.revokeObjectURL(media.url);setMedia({...next,duration:next.type==='image'?1:0,setDuration:duration=>setMedia(current=>({...current,duration}))});setVersion(next.versionNumber);setDocumentPage(1);setCurrentTime(0);setSelectedFigure(null);setFocusedComment(null);setSocialMode(false)}}/></div></div>
          <div className="social-mode-switch" role="group" aria-label="Modo de visualización"><div className="review-mode-options"><button aria-pressed={!socialMode} onClick={()=>{socialRequest.current++;setSocialMode(false)}}><Icon name="pen" size={16}/><span>Revisión y anotaciones</span></button><button aria-pressed={socialMode} onClick={()=>setSocialMode(true)}><Icon name="image" size={16}/><span>Preview social</span></button></div><span className="review-mode-hint">{socialMode?'Vista de publicación':'Revisa cada detalle'}</span></div>
          {socialMode?<SocialPreview projectId={media?.projectId||'project-amara'} onSelect={selectSocialAsset} onTime={setCurrentTime} onNotify={setToast} onReview={asset=>{selectSocialAsset(asset);setSocialMode(false)}}/>:['pdf','html','document','presentation'].includes(media?.type)?<DocumentReview media={media} page={documentPage} setPage={setDocumentPage} renderAnnotations={drawing=><><AnnotationLayer activeTool={drawing?activeTool:'' } activeColor={activeColor} marks={marks} setMarks={saveMarks} selectedFigure={selectedFigure}/>{marks.map((mark,index)=><button key={mark.id} className={`figure-pin ${selectedFigure===mark.id?'selected':''}`} style={{left:`${mark.points[0].x*100}%`,top:`${mark.points[0].y*100}%`}} aria-label={`Abrir figura ${index+1}`} onClick={()=>selectFigure(mark)}>{index+1}</button>)}{drawing&&<div className="annotation-tools">{['pen','arrow','square','type'].map((tool,index)=><button key={tool} aria-label={['Lápiz','Flecha','Rectángulo','Texto'][index]} aria-pressed={activeTool===tool} className={activeTool===tool?'active':''} onClick={()=>setActiveTool(tool)}><Icon name={tool}/></button>)}{['#ff725e','#f2bd5c','#8ebd72','#67a9d4'].map(color=><button key={color} aria-label={`Color ${color}`} aria-pressed={activeColor===color} onClick={()=>setActiveColor(color)} style={{color}}><span style={{background:color,width:16,height:16,borderRadius:'50%'}}/></button>)}<button aria-label="Deshacer figura" disabled={!marks.length} onClick={()=>saveMarks(marks.slice(0,-1))}><Icon name="undo"/></button></div>}</>} onComment={()=>{setCommentsOpen(true);setSelectedFigure(null);setTimeout(()=>document.querySelector('.comments-drawer textarea, .composer textarea')?.focus(),50)}}/>:<><MediaStage key={annotationContext} activeTool={activeTool} setActiveTool={setActiveTool} activeColor={activeColor} setActiveColor={setActiveColor} media={media} currentTime={currentTime} setCurrentTime={setCurrentTime} remoteCursor={remoteCursor} marks={marks} setMarks={saveMarks} selectedFigure={selectedFigure} onFigure={selectFigure} figureComments={Object.values(state.comments).filter(c=>c.versionId===reviewVersionId)} reviewVersionId={reviewVersionId} onTimelineComment={comment=>{setCurrentTime(comment.timeSeconds);setFocusedComment(comment.id);setCommentsOpen(true);jumpFigure(comment)}}/></>}
          <div className="review-summary">
            <div><span className="eyebrow">RONDA DE REVISIÓN</span><strong>{openCount} comentarios pendientes</strong><small>Decisiones guardadas en tu cuenta; acceso compartido aún no disponible.</small></div>
            <button className="ai-button" onClick={()=>setSummaryOpen(true)}><Icon name="spark"/><span><strong>Resumir cambios</strong><small>Ver pendientes y bloqueantes</small></span></button>
          </div>
        </div>
        {socialMode&&(socialLoading||media?.id!==socialAssetId||!state.projects[media?.projectId||'project-amara']?.socialPreview?.assetIds.includes(media?.id))?<aside className="comments-panel"><div className="social-preview"><strong>Comentarios de la lámina</strong><p>{socialLoading?'Cargando la pieza seleccionada…':'Selecciona un medio de la preview para revisar sus comentarios.'}</p></div></aside>:<CommentsPanel {...figureProps} onClose={()=>setCommentsOpen(false)} currentTime={currentTime} setCurrentTime={setCurrentTime} draft={commentDraft} setDraft={setCommentDraft} recoveredDraft={recoveredDraft}/>}
      </div>
      {(!socialMode||(!socialLoading&&media?.id===socialAssetId))&&<button className="mobile-comments" onClick={()=>setCommentsOpen(true)}>{Object.values(state.comments).filter(c=>c.versionId===reviewVersionId).length} comentarios <span>{openCount} abiertos</span></button>}
      {commentsOpen && <div className="comments-drawer"><div className="drawer-scrim" onClick={()=>setCommentsOpen(false)}/><CommentsPanel {...figureProps} onClose={()=>setCommentsOpen(false)} currentTime={currentTime} setCurrentTime={setCurrentTime} draft={commentDraft} setDraft={setCommentDraft} recoveredDraft={recoveredDraft}/></div>}
      </>}
      {shareOpen && <ShareDialog onClose={()=>setShareOpen(false)} onNotify={setToast}/>} 
      {shortcutsOpen && <ShortcutHelp onClose={()=>setShortcutsOpen(false)}/>} 
      {summaryOpen && <ReviewSummary versionId={reviewVersionId} onClose={()=>setSummaryOpen(false)}/>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
    <MobileNav currentView={currentView} onNavigate={setCurrentView}/>
  </div>;
}

const rootElement = document.getElementById('root');
const root = import.meta.hot?.data.root ?? createRoot(rootElement);
if (import.meta.hot) import.meta.hot.data.root = root;
root.render(<AccountAccess><App/></AccountAccess>);
import MentionInput from './components/MentionInput.jsx';
