import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { RondaProvider, selectUnreadNotifications, selectVersionStatus, useRonda } from './state/RondaContext.jsx';
import { REVIEW_DECISION } from './domain/review.js';
import { getCommentEmptyState } from './domain/comments.js';
import { loadSessionDraft, saveSessionDraft } from './state/migration.js';

const formatTime = value => {
  const seconds = Math.max(0, Number(value) || 0);
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * 24);
  return { time: `00:${String(minutes).padStart(2,'0')}:${String(remainder).padStart(2,'0')}`, frame: Math.floor(seconds * 24), frames };
};

const Icon = ({ name, size = 18 }) => {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    folder: <path d="M3 6.5h6l2 2h10v10.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6.5Z"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 8.97 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.53-1.02H3v-4h.08A1.7 1.7 0 0 0 4.6 8.95a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 10 3.05V3h4v.08a1.7 1.7 0 0 0 1.03 1.53 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.93 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    share: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></>,
    play: <path className="fill" d="m9 7 8 5-8 5Z"/>,
    pause: <><path d="M9 7v10M15 7v10"/></>,
    volume: <><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"/></>,
    maximize: <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/>,
    pen: <><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z"/><path d="m14 7 3 3"/></>,
    arrow: <><path d="M5 19 19 5M11 5h8v8"/></>,
    square: <rect x="4" y="4" width="16" height="16" rx="2"/>,
    type: <><path d="M5 5h14M12 5v14M8 19h8"/></>,
    undo: <><path d="M9 7 4 12l5 5"/><path d="M20 17a7 7 0 0 0-7-7H4"/></>,
    redo: <><path d="m15 7 5 5-5 5"/><path d="M4 17a7 7 0 0 1 7-7h9"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    more: <><circle className="fill" cx="5" cy="12" r="1.5"/><circle className="fill" cx="12" cy="12" r="1.5"/><circle className="fill" cx="19" cy="12" r="1.5"/></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>,
    spark: <><path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4L12 3Z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    plus: <path d="M12 5v14M5 12h14"/>,
    x: <path d="m6 6 12 12M18 6 6 18"/>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    alert: <><path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5M12 17.5h.01"/></>,
  };
  return <svg aria-hidden="true" className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
};

const seedComments = [
  { id: 1, author: 'Laura M.', initials: 'LM', color: '#ff725e', time: '00:08:14', frame: 198, text: 'El producto entra muy rápido. ¿Podemos dejar medio segundo más antes del movimiento?', replies: 2, status: 'open' },
  { id: 2, author: 'Mateo R.', initials: 'MR', color: '#8ebd72', time: '00:14:02', frame: 338, text: 'Este encuadre funciona. Mantendría exactamente esta composición.', replies: 0, status: 'resolved' },
  { id: 3, author: 'Sofía C.', initials: 'SC', color: '#f2bd5c', time: '00:21:18', frame: 511, text: 'Subamos un poco el contraste del texto para que sea legible en móvil.', replies: 1, status: 'open' },
];

function Sidebar({ collapsed, setCollapsed, currentView, onNavigate }) {
  return <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
    <button className="brand" onClick={() => setCollapsed(!collapsed)} aria-label="Contraer navegación">
      <span className="brand-mark">R</span><span className="brand-name">RONDA</span>
    </button>
    <nav className="side-nav" aria-label="Principal">
      <button className={currentView==='projects'||currentView==='review'?'active':''} onClick={()=>onNavigate('projects')}><Icon name="grid"/><span>Proyectos</span></button>
      <button className={currentView==='activity'?'active':''} onClick={()=>onNavigate('activity')}><Icon name="clock"/><span>Actividad</span></button>
      <button className={currentView==='team'?'active':''} onClick={()=>onNavigate('team')}><Icon name="users"/><span>Equipo</span></button>
    </nav>
    <div className="side-label">ESPACIO</div>
    <nav className="side-nav lower">
      <button onClick={()=>onNavigate('projects')}><Icon name="folder"/><span>Nébula Studio</span></button>
      <button className={currentView==='settings'?'active':''} onClick={()=>onNavigate('settings')}><Icon name="settings"/><span>Configuración</span></button>
    </nav>
    <div className="account">
      <span className="avatar small">JT</span>
      <span className="account-copy"><strong>Julian Torres</strong><small>Administrador</small></span>
      <Icon name="more"/>
    </div>
  </aside>;
}

function MobileNav({ currentView, onNavigate }) {
  const items=[['projects','grid','Proyectos'],['activity','clock','Actividad'],['team','users','Equipo'],['settings','settings','Ajustes']];
  return <nav className="mobile-nav" aria-label="Navegación móvil">{items.map(([view,icon,label])=><button key={view} className={currentView===view||(currentView==='review'&&view==='projects')?'active':''} onClick={()=>onNavigate(view)}><Icon name={icon}/><span>{label}</span></button>)}</nav>;
}

function AnnotationLayer({ activeTool, activeColor, marks, setMarks }) {
  const canvas = useRef(null);
  const drawing = useRef(false);
  const points = useRef([]);
  const draw = () => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    const ratio = window.devicePixelRatio || 1;
    const box = el.getBoundingClientRect();
    if (el.width !== box.width * ratio || el.height !== box.height * ratio) {
      el.width = box.width * ratio; el.height = box.height * ratio; ctx.scale(ratio, ratio);
    }
    ctx.clearRect(0, 0, box.width, box.height);
    [...marks, ...(drawing.current && points.current.length ? [{ tool: activeTool, color: activeColor, points: points.current }] : [])].forEach(mark => {
      if (mark.tool === 'pen') {
        ctx.strokeStyle = mark.color; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
        mark.points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
      }
      if (mark.tool === 'square' && mark.points.length > 1) {
        const [start,end]=[mark.points[0],mark.points.at(-1)]; ctx.strokeStyle=mark.color;ctx.lineWidth=4;ctx.strokeRect(start.x,start.y,end.x-start.x,end.y-start.y);
      }
      if (mark.tool === 'arrow' && mark.points.length > 1) {
        const [start,end]=[mark.points[0],mark.points.at(-1)]; const angle=Math.atan2(end.y-start.y,end.x-start.x);ctx.strokeStyle=mark.color;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(end.x,end.y);ctx.lineTo(end.x-14*Math.cos(angle-Math.PI/6),end.y-14*Math.sin(angle-Math.PI/6));ctx.moveTo(end.x,end.y);ctx.lineTo(end.x-14*Math.cos(angle+Math.PI/6),end.y-14*Math.sin(angle+Math.PI/6));ctx.stroke();
      }
      if (mark.tool === 'type') { ctx.fillStyle=mark.color;ctx.font='600 18px system-ui';ctx.fillText(mark.text,mark.points[0].x,mark.points[0].y); }
    });
  };
  useEffect(draw, [marks, activeColor, activeTool]);
  useEffect(() => { const handle = () => draw(); window.addEventListener('resize', handle); return () => window.removeEventListener('resize', handle); });
  const point = e => { const r = canvas.current.getBoundingClientRect(); return { x: e.clientX-r.left, y: e.clientY-r.top }; };
  return <canvas ref={canvas} className={`annotation-layer ${activeTool ? 'drawing' : ''}`}
    onPointerDown={e => { if(!activeTool) return; const start=point(e); if(activeTool==='type'){const text=window.prompt('Texto de la anotación');if(text?.trim())setMarks([...marks,{tool:'type',color:activeColor,text:text.trim(),points:[start]}]);return;} e.currentTarget.setPointerCapture(e.pointerId); drawing.current=true; points.current=[start]; draw(); }}
    onPointerMove={e => { if(!drawing.current) return; points.current.push(point(e)); draw(); }}
    onPointerUp={() => { if(!drawing.current) return; drawing.current=false; setMarks([...marks,{tool:'pen',color:activeColor,points:[...points.current]}]); points.current=[]; }} />;
}

function MediaStage({ activeTool, setActiveTool, activeColor, setActiveColor, media, currentTime, setCurrentTime, remoteCursor }) {
  const [playing, setPlaying] = useState(false);
  const [muted,setMuted]=useState(false);
  const [marks, setMarks] = useState([]);
  const [redoMarks,setRedoMarks]=useState([]);
  const videoRef = useRef(null);
  const stageRef = useRef(null);
  const colors = ['#ff725e','#f2bd5c','#8ebd72','#67a9d4','#b89be8','#f1eee7'];
  const stamp = formatTime(currentTime);
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
        <AnnotationLayer activeTool={activeTool} activeColor={activeColor} marks={marks} setMarks={updateMarks}/>
        {remoteCursor&&<div className="remote-cursor" style={{left:`${remoteCursor.x}%`,top:`${remoteCursor.y}%`,'--presence-color':remoteCursor.color}}><i/><span>{remoteCursor.name}</span></div>}
        <div className="frame-badge">{stamp.time} · F{stamp.frame}</div>
      </div>
      <div className="annotation-tools" aria-label="Herramientas de anotación">
        {['pen','arrow','square','type'].map((tool,index) => <button key={tool} title={`${['Lápiz','Flecha','Rectángulo','Texto'][index]} · ${index+1}`} onClick={()=>setActiveTool(tool)} className={activeTool===tool?'active':''} aria-label={`${['Lápiz','Flecha','Rectángulo','Texto'][index]} (${index+1})`}><Icon name={tool}/><kbd>{index+1}</kbd></button>)}
        <span className="tool-divider"/>
        <div className="color-options">{colors.map(c=><button key={c} aria-label={`Color ${c}`} onClick={()=>setActiveColor(c)} className={activeColor===c?'selected':''} style={{'--swatch':c}}/>)}</div>
        <span className="tool-divider"/><button onClick={undoMark} disabled={!marks.length} title="Deshacer · Ctrl/⌘ + Z" aria-label="Deshacer última anotación"><Icon name="undo"/></button><button onClick={redoMark} disabled={!redoMarks.length} title="Rehacer · Ctrl/⌘ + Shift + Z" aria-label="Rehacer anotación"><Icon name="redo"/></button>
      </div>
    </div>
    <div className="player-controls">
      <button className="play" onClick={togglePlayback} aria-label={playing?'Pausar':'Reproducir'}><Icon name={playing?'pause':'play'} size={20}/></button>
      <span className="timecode"><strong>{stamp.time}</strong><span>/ {formatTime(duration).time}</span></span>
      <div className="scrubber"><input aria-label="Posición del video" type="range" min="0" max={duration || 1} step="0.01" value={Math.min(currentTime,duration || 1)} onChange={e=>{const value=Number(e.target.value);setCurrentTime(value);if(videoRef.current)videoRef.current.currentTime=value}}/><div className="scrubber-fill" style={{width:`${Math.min(100,currentTime/(duration||1)*100)}%`}}/><i className="marker m1"/><i className="marker m2"/><i className="marker m3"/><span className="playhead" style={{left:`${Math.min(100,currentTime/(duration||1)*100)}%`}}/></div>
      <button aria-label={muted?'Activar sonido':'Silenciar'} onClick={()=>setMuted(!muted)} className={muted?'active':''}><Icon name="volume"/></button><span className="fps">24 FPS</span><button aria-label="Pantalla completa (F)" onClick={toggleFullscreen}><Icon name="maximize"/></button>
    </div>
  </section>;
}

function CommentCard({ item, selected, onSelect, onResolve, onReply, onJump, members }) {
  const [replying,setReplying]=useState(false); const [reply,setReply]=useState(''); const replies=Array.isArray(item.replies)?item.replies:[];
  const submitReply=()=>{if(!reply.trim())return;onReply(item.id,reply.trim());setReply('');setReplying(false)};
  return <article className={`comment-card ${selected?'selected':''} ${item.status==='resolved'?'resolved':''}`} onClick={onSelect}>
    <div className="comment-head"><span className="avatar" style={{background:item.color}}>{item.initials}</span><span className="comment-author"><strong>{item.author}</strong><small>{item.author==='Julian Torres'?'Ahora':'Hace unos minutos'}</small></span>{item.priority==='blocking'&&<span className="priority-label">Bloqueante</span>}<button className="icon-button" aria-label="Opciones del comentario"><Icon name="more"/></button></div>
    <button className="comment-location" onClick={e=>{e.stopPropagation();onJump(item)}}><Icon name="play" size={11}/><strong>{item.time}</strong><span>Fotograma {item.frame}</span></button>
    <p className="comment-copy">{item.text}</p>
    {!!item.attachments?.length&&<div className="comment-attachments">{item.attachments.map(file=><button key={file.id} onClick={e=>{e.stopPropagation();window.open(file.dataUrl,'_blank','noopener,noreferrer')}} aria-label={`Abrir referencia ${file.name}`}><img src={file.dataUrl} alt={file.name}/><span>{file.name}</span></button>)}</div>}
    {!!replies.length&&<div className="reply-list">{replies.slice(-2).map(entry=>{const author=members[entry.authorId]||{name:'Invitado',initials:'IN'};return <div key={entry.id}><span className="avatar">{author.initials}</span><p><strong>{author.name}</strong>{entry.text}</p></div>})}</div>}
    {replying&&<div className="inline-reply" onClick={e=>e.stopPropagation()}><input autoFocus aria-label={`Responder a ${item.author}`} value={reply} onChange={e=>setReply(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')submitReply();if(e.key==='Escape')setReplying(false)}} placeholder="Escribe una respuesta…"/><button onClick={submitReply}>Enviar</button></div>}
    <footer className="comment-foot"><div><button onClick={e=>{e.stopPropagation();setReplying(!replying)}}>Responder{replies.length>0&&` · ${replies.length}`}</button><button onClick={e=>{e.stopPropagation();onJump(item)}}>Ir al cuadro</button></div><button onClick={e=>{e.stopPropagation();onResolve(item.id)}} className={item.status==='resolved'?'done':''}><Icon name="check" size={14}/>{item.status==='resolved'?'Reabrir':'Resolver'}</button></footer>
  </article>;
}

function CommentsPanel({ onClose, currentTime, setCurrentTime, draft, setDraft, recoveredDraft }) {
  const { state, act } = useRonda();
  const comments = Object.values(state.comments).filter(comment=>comment.versionId==='version-amara-v3').map(comment=>{
    const author=state.members[comment.authorId] || {name:comment.authorSnapshot||'Autor anterior',initials:(comment.authorSnapshot||'AA').split(/\s+/).map(part=>part[0]).join('').slice(0,2).toUpperCase()};
    const stamp=formatTime(comment.timeSeconds ?? (comment.frame || 0) / 24);
    return {...comment,author:author.name,initials:author.initials,color:comment.priority==='blocking'?'#ff725e':'#67a9d4',time:stamp.time,replies:comment.replies||[]};
  });
  const [selected, setSelected] = useState('comment-1');
  const [filter, setFilter] = useState('Todos');
  const [search,setSearch]=useState('');
  const [attachments,setAttachments]=useState([]);
  const [attachmentError,setAttachmentError]=useState('');
  const attachmentInput=useRef(null);
  const visible = useMemo(()=>comments.filter(c=>(filter==='Todos'||(filter==='Abiertos'&&c.status==='open')||(filter==='Resueltos'&&c.status==='resolved'))&&`${c.author} ${c.text} ${(c.replies||[]).map(reply=>reply.text).join(' ')} ${c.frame}`.toLowerCase().includes(search.toLowerCase())),[comments,filter,search]);
  const emptyState=visible.length===0?getCommentEmptyState({total:comments.length,filter,search}):null;
  const resolve = id => act(state.comments[id]?.status==='resolved'?'comment/reopen':'comment/resolve',{id});
  const stamp = formatTime(currentTime);
  const addFiles=async files=>{setAttachmentError('');const candidates=[...files].filter(file=>file.type.startsWith('image/')).slice(0,3-attachments.length);for(const file of candidates){if(file.size>2*1024*1024){setAttachmentError('Cada referencia debe pesar menos de 2 MB.');continue;}const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});setAttachments(current=>[...current,{id:`ref-${Date.now()}-${file.name}`,name:file.name,dataUrl}].slice(0,3));}};
  const add = () => { if(!draft.trim()&&!attachments.length) return; act('comment/add',{projectId:'project-amara',versionId:'version-amara-v3',authorId:state.currentUserId,assigneeId:state.currentUserId,priority:'normal',text:draft.trim()||'Referencia visual adjunta',attachments,timeSeconds:currentTime,frame:stamp.frame}); setDraft('');setAttachments([]);recoveredDraft.current=false; };
  const replyTo=(id,text)=>{const current=state.comments[id];act('comment/update',{id,changes:{replies:[...(current.replies||[]),{id:`reply-${Date.now()}`,authorId:state.currentUserId,text,createdAt:new Date().toISOString()}]}})};
  return <aside className="comments-panel">
    <div className="panel-head"><div><span className="panel-kicker">REVISIÓN</span><strong>Comentarios</strong><small>{comments.filter(c=>c.status==='open').length} pendientes de {comments.length}</small></div><button className="mobile-close" aria-label="Cerrar comentarios" onClick={onClose}><Icon name="x"/></button></div>
    <div className="comment-toolbar"><div className="comment-tabs" role="tablist" aria-label="Filtrar comentarios">{['Todos','Abiertos','Resueltos'].map(item=><button key={item} role="tab" aria-selected={filter===item} className={filter===item?'active':''} onClick={()=>setFilter(item)}>{item}<span>{item==='Todos'?comments.length:comments.filter(c=>c.status===(item==='Abiertos'?'open':'resolved')).length}</span></button>)}</div><label className="comment-search"><Icon name="search" size={14}/><input aria-label="Buscar comentarios" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar"/></label></div>
    <div className="comments-scroll">{visible.map(c=><CommentCard key={c.id} item={c} members={state.members} selected={selected===c.id} onSelect={()=>setSelected(c.id)} onResolve={resolve} onReply={replyTo} onJump={item=>{setSelected(item.id);setCurrentTime?.(item.timeSeconds ?? (item.frame||0)/24)}}/>)}{emptyState&&<div className="comments-empty"><strong>{emptyState.title}</strong><span>{emptyState.detail}</span>{emptyState.action&&<button onClick={()=>{if(emptyState.kind==='search')setSearch('');else setFilter('Todos')}}>{emptyState.action}</button>}</div>}</div>
    <div className="composer">
      <div className="composer-input">{recoveredDraft.current&&draft&&<small className="draft-recovered" role="status">Borrador recuperado</small>}{!!attachments.length&&<div className="reference-strip">{attachments.map(file=><span key={file.id}><img src={file.dataUrl} alt=""/><button aria-label={`Quitar ${file.name}`} onClick={()=>setAttachments(current=>current.filter(item=>item.id!==file.id))}>×</button></span>)}</div>}<textarea value={draft} onChange={e=>{recoveredDraft.current=false;setDraft(e.target.value)}} onPaste={e=>{if(e.clipboardData.files.length){e.preventDefault();addFiles(e.clipboardData.files)}}} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')add()}} placeholder={`Comenta o pega una captura sobre ${stamp.time}…`}/><div className="composer-meta"><span>F{stamp.frame} · Ctrl/⌘ + Enter</span><input ref={attachmentInput} className="visually-hidden" type="file" accept="image/*" multiple onChange={e=>{addFiles(e.target.files);e.target.value=''}}/><button onClick={()=>attachmentInput.current?.click()} title="Agregar imagen o captura"><Icon name="image" size={15}/> Referencia</button></div>{attachmentError&&<small className="attachment-error">{attachmentError}</small>}</div>
      <button className="send" aria-label="Publicar comentario" onClick={add} disabled={!draft.trim()&&!attachments.length}><Icon name="send"/></button>
    </div>
  </aside>;
}

function ShareDialog({ onClose, onNotify }) {
  const reviewUrl = `${location.origin}${import.meta.env.BASE_URL}#review/amaraa-v3`;
  const copy = async () => { try { await navigator.clipboard.writeText(reviewUrl); onNotify('Enlace copiado'); } catch { onNotify('Selecciona y copia el enlace'); } };
  return <div className="modal-layer" role="presentation"><button className="modal-scrim" aria-label="Cerrar" onClick={onClose}/><section className="modal" role="dialog" aria-modal="true" aria-labelledby="share-title"><div className="modal-title"><div><span className="eyebrow">ENLACE DE REVISIÓN</span><h2 id="share-title">Compartir con clientes</h2></div><button aria-label="Cerrar" onClick={onClose}><Icon name="x"/></button></div><p>Quien tenga el enlace podrá ver esta versión y dejar comentarios sin crear una cuenta.</p><label>Enlace público<div className="copy-field"><input readOnly value={reviewUrl}/><button onClick={copy}>Copiar</button></div></label><div className="permission-row"><span><strong>Permitir comentarios</strong><small>Los invitados pueden anotar y responder</small></span><input type="checkbox" defaultChecked aria-label="Permitir comentarios"/></div><div className="permission-row"><span><strong>Permitir descargas</strong><small>El archivo original permanece protegido</small></span><input type="checkbox" aria-label="Permitir descargas"/></div><button className="modal-primary" onClick={()=>{copy();onClose()}}>Copiar enlace de revisión</button></section></div>;
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
  const [readIds,setReadIds]=useState(()=>{try{return JSON.parse(localStorage.getItem('ronda-activity-read'))||[]}catch{return[]}});
  useEffect(()=>localStorage.setItem('ronda-activity-read',JSON.stringify(readIds)),[readIds]);
  const live=state.activity.map(event=>{const actor=state.members[event.actorId];const isComment=event.kind.startsWith('comment');return {id:event.id,who:actor?.name||'Equipo',initials:actor?.initials||'EQ',color:'#67a9d4',action:event.kind==='comment.created'?'creó un comentario':event.kind==='comment.resolved'?'resolvió un comentario':event.kind==='comment.reopened'?'reabrió un comentario':'registró una decisión',where:'Campaña Amara · Spot principal',project:'Campaña Amara',detail:isComment?(state.comments[event.commentId]?.text||'Actividad de comentario'):(event.decision==='approved'?'Aprobó la versión':'Solicitó cambios'),time:'Ahora',occurredAt:event.occurredAt,type:isComment?'comment':'approval'};});
  const seeded=activities.map((item,index)=>({...item,id:`seed-${index}`,project:item.where.split(' · ')[0],occurredAt:new Date(Date.now()-[4,22,60,120,1500][index]*60000).toISOString()}));
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

function App() {
  const {state,act,persistenceError,retryPersistence}=useRonda();
  const draftKey=`ronda:draft:${state.workspace.id}:project-amara:version-amara-v3:${state.currentUserId}`;
  const [commentDraft,setCommentDraft]=useState(()=>loadSessionDraft(typeof sessionStorage==='undefined'?null:sessionStorage,draftKey));
  const recoveredDraft=useRef(Boolean(commentDraft));
  const [collapsed, setCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState('projects');
  const [activeTool, setActiveTool] = useState('pen');
  const [activeColor, setActiveColor] = useState('#ff725e');
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shortcutsOpen,setShortcutsOpen]=useState(false);
  const [currentTime, setCurrentTime] = useState(14.08);
  const [version, setVersion] = useState(3);
  const [toast, setToast] = useState('');
  const [media, setMedia] = useState(null);
  const [remoteCursor,setRemoteCursor]=useState(null);
  const fileInput = useRef(null);
  const versionStatus=selectVersionStatus(state,'version-amara-v3');
  const approval=versionStatus==='approved'?'Aprobado':versionStatus==='changes_requested'?'Cambios solicitados':'En revisión';
  const openCount=Object.values(state.comments).filter(c=>c.versionId==='version-amara-v3'&&c.status==='open').length;
  useEffect(()=>{saveSessionDraft(typeof sessionStorage==='undefined'?null:sessionStorage,draftKey,commentDraft)},[draftKey,commentDraft]);
  useEffect(()=>{ if(!toast)return; const timer=setTimeout(()=>setToast(''),2200); return()=>clearTimeout(timer); },[toast]);
  useEffect(()=>{const handler=e=>{if(e.key==='Escape'){setShareOpen(false);setShortcutsOpen(false);setCommentsOpen(false);}if(e.key==='?'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))setShortcutsOpen(value=>!value);if(e.key.toLowerCase()==='c'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){e.preventDefault();document.querySelector('.composer textarea')?.focus();}};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler)},[]);
  const loadMedia = event => { const file=event.target.files?.[0]; if(!file)return; const type=file.type.startsWith('video/')?'video':file.type.startsWith('image/')?'image':null; if(!type){setToast('Formato no compatible');return;} if(media?.url)URL.revokeObjectURL(media.url); setCurrentTime(0); setMedia({name:file.name,type,url:URL.createObjectURL(file),duration:type==='image'?1:0,setDuration:duration=>setMedia(current=>({...current,duration}))}); setToast(`${type==='video'?'Video':'Imagen'} cargado`); };
  const followReviewer=person=>{setCurrentTime(person.time);setRemoteCursor(person);setToast(`Siguiendo a ${person.name} en ${formatTime(person.time).time}`)};
  return <div className="app-shell">
    <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} currentView={currentView} onNavigate={setCurrentView}/>
    <main className={`workspace ${currentView!=='review'?'dashboard-workspace':''}`}>
      {persistenceError&&<div className="persistence-alert" role="alert"><Icon name="alert" size={16}/><span><strong>Los cambios están solo en este dispositivo</strong><small>{persistenceError==='quota'?'El almacenamiento del navegador está lleno. Quita algunas referencias pesadas o libera espacio.':'El navegador bloqueó el almacenamiento local.'}</small></span><button onClick={retryPersistence}>Reintentar</button></div>}
      {currentView==='projects' && <ProjectsView onOpen={()=>setCurrentView('review')} onNotify={setToast}/>} 
      {currentView==='activity' && <ActivityView onNavigate={setCurrentView}/>}
      {currentView==='team' && <TeamView onNotify={setToast}/>} 
      {currentView==='settings' && <SettingsView onNotify={setToast}/>} 
      {currentView==='review' && <>
      <header className="topbar">
        <div className="breadcrumb"><button onClick={()=>setCurrentView('projects')}>Campaña Amara</button><Icon name="chevron" size={14}/><div><strong>Spot principal · 30s</strong><span>Última edición hace 6 min</span></div></div>
        <div className="top-actions">
          <PresenceStack onFollow={followReviewer} followingId={remoteCursor?.id}/>
          <button className="shortcut-trigger" aria-label="Ver atajos de teclado" title="Atajos (?)" onClick={()=>setShortcutsOpen(true)}>?</button>
          <NotificationCenter onNavigate={setCurrentView}/>
          <button className="secondary" aria-label="Compartir revisión" onClick={()=>setShareOpen(true)}><Icon name="share" size={17}/><span>Compartir</span></button>
          <div className="approval-menu"><button className={`approval ${approval==='Aprobado'?'approved':''}`} onClick={()=>{const blockers=Object.values(state.comments).filter(c=>c.versionId==='version-amara-v3'&&c.status==='open'&&c.priority==='blocking');if(blockers.length){setToast(`Resuelve ${blockers.length} comentario bloqueante antes de aprobar`);return;}act('review/decide',{versionId:'version-amara-v3',reviewerId:state.currentUserId,decision:REVIEW_DECISION.APPROVED});setToast('Tu aprobación quedó registrada')}}><Icon name="check" size={16}/>{approval}</button></div>
        </div>
      </header>
      <div className="review-layout">
        <div className="review-main">
          <div className="asset-bar"><div className="asset-meta"><span className="file-type">{media?.type==='image'?'IMG':'MP4'}</span><div><strong>{media?.name || 'AMARA_SPOT_MASTER'}</strong><span>{media?'Archivo local de revisión':'1920 × 1080 · H.264 · 48.2 MB'}</span></div></div><div className="asset-actions"><input ref={fileInput} className="visually-hidden" type="file" accept="video/*,image/*" onChange={loadMedia}/><button className="upload-button" onClick={()=>fileInput.current?.click()}><Icon name="plus" size={15}/> Cargar archivo</button><div className="version-select"><span>Versión</span><select aria-label="Versión" value={version} onChange={e=>{setVersion(Number(e.target.value));setToast(`Versión V${e.target.value} abierta`)}}><option value="1">V1</option><option value="2">V2</option><option value="3">V3 · Actual</option></select></div></div></div>
          <MediaStage activeTool={activeTool} setActiveTool={setActiveTool} activeColor={activeColor} setActiveColor={setActiveColor} media={media} currentTime={currentTime} setCurrentTime={setCurrentTime} remoteCursor={remoteCursor}/>
          <div className="review-summary">
            <div><span className="eyebrow">RONDA DE REVISIÓN</span><strong>3 de 4 revisores participaron</strong><small>Dos cambios pendientes antes de aprobar.</small></div>
            <button className="ai-button"><Icon name="spark"/><span><strong>Resumir cambios</strong><small>Organizar con IA</small></span></button>
          </div>
        </div>
        <CommentsPanel onClose={()=>setCommentsOpen(false)} currentTime={currentTime} setCurrentTime={setCurrentTime} draft={commentDraft} setDraft={setCommentDraft} recoveredDraft={recoveredDraft}/>
      </div>
      <button className="mobile-comments" onClick={()=>setCommentsOpen(true)}>{Object.values(state.comments).filter(c=>c.versionId==='version-amara-v3').length} comentarios <span>{openCount} abiertos</span></button>
      {commentsOpen && <div className="comments-drawer"><div className="drawer-scrim" onClick={()=>setCommentsOpen(false)}/><CommentsPanel onClose={()=>setCommentsOpen(false)} currentTime={currentTime} setCurrentTime={setCurrentTime} draft={commentDraft} setDraft={setCommentDraft} recoveredDraft={recoveredDraft}/></div>}
      </>}
      {shareOpen && <ShareDialog onClose={()=>setShareOpen(false)} onNotify={setToast}/>} 
      {shortcutsOpen && <ShortcutHelp onClose={()=>setShortcutsOpen(false)}/>} 
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
    <MobileNav currentView={currentView} onNavigate={setCurrentView}/>
  </div>;
}

const rootElement = document.getElementById('root');
const root = import.meta.hot?.data.root ?? createRoot(rootElement);
if (import.meta.hot) import.meta.hot.data.root = root;
root.render(<RondaProvider><App/></RondaProvider>);
