import {BrandLoader} from './BrandLoader.jsx';
import {ReviewLoading} from './ReviewLoading.jsx';
import DrawingTrail from './DrawingTrail.jsx';
import {ShortcutHelp} from './ShortcutHelp.jsx';
import {ReviewSummaryDialog} from './ReviewSummaryDialog.jsx';
import React,{useEffect,useRef,useState} from 'react';
import {currentAccountId} from '../state/accountStorage.js';
import {useRonda} from '../state/RondaContext.jsx';
import {AccountProfileMenu} from './AccountProfileMenu.jsx';
import {getRoom,versionPath,projectPath,reviewRequest,reviewSend,uploadFile,postComment,postDecision} from '../state/sharedReviewApi.js';
import {pickVersion,sharedAnnotation,applyRoomError,createReviewGuard,canLeaveSharedReview} from '../state/sharedReviewState.js';
import {OriginalMediaStage as UploadedMediaStage} from './OriginalMediaStage.jsx';
import {DocumentReview} from './DocumentReview.jsx';
import {AnnotationLayer} from './AnnotationLayer.jsx';
import {AnnotationCommentPopover} from './AnnotationCommentPopover.jsx';
import Icon from './Icon.jsx';
import {ShareProjectButton} from './ShareProjectButton.jsx';
import {AudioCommentInput} from './AudioCommentInput.jsx';
import {parseCommentCommand} from '../domain/comment-commands.js';
import {PriorityCommands} from './PriorityCommands.jsx';
import {retainReviewView,reusableReviewMedia} from '../state/reviewMediaCache.js';
import {filterSharedComments,sharedCommentsEmptyMessage,sharedCommentCounts,sharedApprovalBlocked} from '../domain/shared-comment-filter.js';
import {measurePhase} from '../state/performanceTelemetry.js';
import './review-comments-restored.css';
import {SocialReferenceIcon} from './SocialReferenceIcons.jsx';
import './shared-review-room.css';
function HtmlReviewStage(props){
  const [redoMarks,setRedoMarks]=useState([]);
  const [htmlHeight,setHtmlHeight]=useState(3000);
  const surface={width:1000,height:htmlHeight};
  const toCanvas=mark=>{
    if(mark.coordinateSpace==='document'){
      const width=mark.documentSize?.width||surface.width,height=mark.documentSize?.height||3000;
      return {...mark,points:mark.points.map(point=>({x:point.x*width/surface.width,y:point.y*height/surface.height}))};
    }
    // Older HTML annotations used a 1000 × 3000 reference surface.
    return {...mark,points:mark.points.map(point=>({x:point.x,y:point.y*3000/surface.height}))};
  };
  const canvasMarks=props.marks.map(toCanvas);
  const setCanvasMarks=next=>props.setMarks(current=>{
    const previous=current.map(toCanvas),known=new Map(previous.map(mark=>[mark.id,mark]));
    const result=typeof next==='function'?next(previous):next;
    return result.map(mark=>{
      if(known.has(mark.id))return known.get(mark.id);
      return {...mark,coordinateSpace:'document',documentSize:{width:surface.width,height:surface.height},points:mark.points.map(point=>({x:point.x,y:point.y}))};
    });
  });
  const undo=()=>{
    const index=props.marks.findLastIndex(mark=>mark.draft);if(index<0)return;
    setRedoMarks(current=>[props.marks[index],...current]);
    props.setMarks(props.marks.filter((_,i)=>i!==index));
  };
  const redo=()=>{
    if(!redoMarks.length)return;
    setRedoMarks(current=>current.slice(1));
    const restored={...redoMarks[0],id:crypto.randomUUID(),draft:undefined};
    props.setMarks([...props.marks.filter(mark=>!mark.draft),restored]);
  };
  const draftAnnotation=canvasMarks.find(mark=>mark.draft);
  const renderAnnotations=drawing=><><AnnotationLayer activeTool={drawing&&!props.readonly?props.activeTool:''} activeColor={props.activeColor} marks={canvasMarks} setMarks={setCanvasMarks} selectedFigure={props.selectedFigure} onAnnotationCreated={()=>setRedoMarks([])}/>{canvasMarks.map((mark,index)=><button key={mark.id} className={`figure-pin ${props.selectedFigure===mark.id?'selected':''}`} style={{left:`${mark.points[0].x*100}%`,top:`${mark.points[0].y*100}%`}} aria-label={`Abrir anotación ${index+1}`} onClick={()=>props.onFigure(mark)}>{index+1}</button>)}{draftAnnotation&&<AnnotationCommentPopover mark={draftAnnotation} disabled={props.readonly} onPublish={props.onQuickComment} onUndo={undo} onClose={()=>props.setMarks(current=>current.filter(mark=>!mark.draft))}/>}</>;
  const renderToolbar=(drawing,setDrawing)=>!props.readonly&&<div className="annotation-tools html-annotation-tools" aria-label="Herramientas de anotación HTML">
    <button type="button" title="Navegar documento" aria-label="Navegar documento" aria-pressed={!drawing} className={!drawing?'active':''} onClick={()=>setDrawing(false)}><Icon name="cursor"/><span className="tool-caret" aria-hidden="true">⌄</span></button>
    {['pen','arrow','square','type'].map((tool,index)=><button key={tool} type="button" title={`${['Lápiz','Flecha','Rectángulo','Texto'][index]} · ${index+1}`} aria-label={['Lápiz','Flecha','Rectángulo','Texto'][index]} aria-pressed={props.activeTool===tool} className={props.activeTool===tool?'active':''} onClick={()=>{setDrawing(true);props.setActiveTool(tool)}}><Icon name={tool}/><kbd>{index+1}</kbd></button>)}
    <span className="tool-divider"/><div className="color-options">{['#ff725e','#f2bd5c','#8ebd72','#67a9d4','#b89be8','#f1eee7'].map((color,index)=><button key={color} type="button" aria-label={`Color ${['coral','ámbar','verde','azul','violeta','blanco'][index]}`} aria-pressed={props.activeColor===color} className={props.activeColor===color?'selected':''} onClick={()=>props.setActiveColor(color)} style={{'--swatch':color,backgroundColor:color}}/>)}</div>
    <span className="tool-divider"/><button type="button" onClick={undo} disabled={!props.marks.some(mark=>mark.draft)} title="Deshacer · Ctrl/⌘ + Z" aria-label="Deshacer última anotación"><Icon name="undo"/></button><button type="button" onClick={redo} disabled={!redoMarks.length} title="Rehacer anotación" aria-label="Rehacer anotación"><Icon name="redo"/></button>
  </div>;
  return <DocumentReview media={props.media} page={1} setPage={()=>{}} onHtmlHeightChange={setHtmlHeight} renderAnnotations={renderAnnotations} renderToolbar={renderToolbar}/>;
}
function OriginalMediaStage(props){
  if(props.media?.type!=='html')return <UploadedMediaStage {...props}/>;
  return <HtmlReviewStage {...props}/>;
}
export function SharedReviewRoom({workspaceId,projectId,assetId,onBack,onNotify,onDirtyChange,deliveryGrid,projectName,onRoomUpdate,onRefreshDelivery,workspaceRole,permissionRevision=0,onPermissionDenied,initialTool='',initialColor}){
  const {state}=useRonda();
  const [versions,setVersions]=useState([]),[versionId,setVersionId]=useState(''),[room,setRoom]=useState(null),[media,setMedia]=useState(null);
  const [requestedVersion,setRequestedVersion]=useState('');
  const [reviewersOpen,setReviewersOpen]=useState(false);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[error,setError]=useState(''),[refresh,setRefresh]=useState(0);
  const [draft,setDraft]=useState({text:'',requestId:crypto.randomUUID()}),[draftMark,setDraftMark]=useState(null),[reply,setReply]=useState({}),[tool,setTool]=useState(initialTool),[color,setColor]=useState(initialColor||'#b89be8'),[currentTime,setTime]=useState(0),[selected,setSelected]=useState(null),[preview,setPreview]=useState(false),[reviewers,setReviewers]=useState([]);
  const controller=useRef(null),generation=useRef(0),fileInput=useRef(null),commentInput=useRef(null),context={workspaceId,projectId,assetId,versionId};
  const guard=useRef(createReviewGuard());
  const sessionExpired=useRef(false);
  useEffect(()=>{
    const expired=()=>{sessionExpired.current=true;};
    const restored=()=>{sessionExpired.current=false;setError('');if(guard.current.canRefresh())setRefresh(n=>n+1);};
    window.addEventListener('ronda-session-expired',expired);
    window.addEventListener('ronda-session-restored',restored);
    return()=>{window.removeEventListener('ronda-session-expired',expired);window.removeEventListener('ronda-session-restored',restored);};
  },[]);
  const lastUpload=useRef(null);
  const cachedMedia=useRef(null);
  const [editDraft,setEditDraft]=useState(null),[summaryOpen,setSummaryOpen]=useState(false),[shortcutsOpen,setShortcutsOpen]=useState(false);
  const [attachments,setAttachments]=useState([]),[audioError,setAudioError]=useState(''),[audioPending,setAudioPending]=useState(false),[recording,setRecording]=useState(false);
  const [duration,setDuration]=useState(0),[search,setSearch]=useState(''),[replyOpen,setReplyOpen]=useState({});
  const [priorityFilter,setPriorityFilter]=useState('all');
  const reviewersDirty=Boolean(room&&JSON.stringify([...reviewers].sort())!==JSON.stringify([...room.version.reviewerIds].sort()));
  const dirty=Boolean(attachments.length||audioPending||recording||draft.text.trim()||draftMark||Object.values(reply).some(r=>r.text.trim())||editDraft||reviewersDirty||busy||loading);
  guard.current.update({dirty,busy:busy||loading});
  useEffect(()=>{onDirtyChange?.(dirty);const warn=e=>{e.preventDefault();e.returnValue='';};if(dirty)window.addEventListener('beforeunload',warn);return()=>{window.removeEventListener('beforeunload',warn);onDirtyChange?.(false);};},[dirty,onDirtyChange]);
  useEffect(()=>{setTime(0);setSelected(null);setTool(initialTool||'');if(initialColor)setColor(initialColor);},[versionId,initialTool,initialColor]);
  useEffect(()=>{
    let active=true,url;const token=++generation.current;guard.current.begin();controller.current=new AbortController();setLoading(true);setError('');
    if(!retainReviewView(cachedMedia.current?.versionId,requestedVersion)){setMedia(null);setRoom(null);}
    const commit=(data,nextMedia)=>{
      const previous=cachedMedia.current?.media.url;
      cachedMedia.current={versionId:data.version.id,fileId:data.version.fileId,externalUrl:data.version.externalUrl,media:nextMedia};
      setRoom({...data,comments:(data.comments||[]).filter(comment=>comment.status==='open')});setReviewers(data.version.reviewerIds);setMedia(nextMedia);
      if(previous&&previous!==nextMedia.url&&previous.startsWith('blob:'))URL.revokeObjectURL(previous);
    };
    (async()=>{
      const listing=await reviewRequest(`${projectPath(context)}/assets/${assetId}/versions`,{signal:controller.current.signal});if(!active)return;
      setVersions(listing.versions);const selectedVersion=pickVersion(listing.versions,requestedVersion,listing.asset.activeVersionId);
      const data=await getRoom({...context,versionId:selectedVersion});if(!active)return;
      onRoomUpdate?.(data);
      setVersionId(selectedVersion);
      const reusable=reusableReviewMedia(cachedMedia.current,data);
      if(reusable){commit(data,reusable);return;}
      if(data.version.externalUrl){commit(data,{url:data.version.externalUrl,kind:data.asset.kind,name:data.version.name,external:true});return;}
      if(data.asset.kind==='html'){commit(data,{url:`/api/workspaces/${workspaceId}/media/${data.version.fileId}`,kind:'html',name:data.version.name});return;}
      if(data.asset.kind==='file'){commit(data,{url:`/api/workspaces/${workspaceId}/media/${data.version.fileId}?download=1`,kind:'file',name:data.version.name});return;}
      // Keep authenticated HTTP Range streaming: never wait for an entire video blob.
      if(data.asset.kind==='video'){commit(data,{url:`/api/workspaces/${workspaceId}/media/${data.version.fileId}`,kind:'video',name:data.version.name});return;}
      const response=await measurePhase('review.preview-fetch',()=>fetch(`/api/workspaces/${workspaceId}/media/${data.version.fileId}`,{credentials:'same-origin',signal:controller.current.signal}));
      if(!response.ok)throw Object.assign(new Error('No tienes acceso al medio o el archivo no está disponible.'),{status:response.status});
      const blob=await measurePhase('review.preview-buffer',()=>response.blob());if(!active)return;url=URL.createObjectURL(blob);if(data.asset.kind==='image'){const image=new Image();image.src=url;await measurePhase('review.image-decode',()=>image.decode());if(!active)return;}commit(data,{url,kind:data.asset.kind,name:data.version.name});
    })().catch(e=>{if(active&&e.name!=='AbortError'){setError(e.message);if([403,404].includes(e.status))setRoom(null);}}).finally(()=>{if(active)setLoading(false);});
    const focus=()=>{if(!sessionExpired.current&&guard.current.canRefresh())setRefresh(n=>n+1);};window.addEventListener('focus',focus);
    return()=>{active=false;guard.current.begin();if(token===generation.current)generation.current++;controller.current?.abort();if(url&&url!==cachedMedia.current?.media.url)URL.revokeObjectURL(url);window.removeEventListener('focus',focus);};
  },[workspaceId,projectId,assetId,requestedVersion,refresh,permissionRevision]);
  useEffect(()=>()=>{controller.current?.abort();const url=cachedMedia.current?.media.url;if(url?.startsWith('blob:'))URL.revokeObjectURL(url);},[]);
  const canEdit=['admin','editor'].includes(workspaceRole)&&['admin','editor'].includes(room?.role),readonly=room?.version.status==='approved';
  const hasDraft=()=>Boolean(attachments.length||audioPending||recording||draft.text.trim()||draftMark||Object.values(reply).some(r=>r.text.trim())||editDraft||reviewersDirty);
  const discard=()=>canLeaveSharedReview({dirty:hasDraft(),busy},()=>window.confirm('Hay cambios sin publicar. ¿Descartarlos?'));
  const clearDraft=()=>{setAttachments([]);setAudioError('');setDraft({text:'',requestId:crypto.randomUUID()});setDraftMark(null);setReply({});setEditDraft(null);};
  async function run(operation,message,after){if(busy||loading)return null;const token=generation.current;setBusy(true);setError('');try{const result=await operation();if(token===generation.current){after?.(result);onNotify?.(message);setRefresh(n=>n+1);return result;}return null}catch(e){if(token===generation.current){const state=applyRoomError({room,draft},e);setError(state.error);setRoom(state.room);if(e.status===403)onPermissionDenied?.();}return null}finally{if(token===generation.current)setBusy(false);}}
  async function versionUpload(file,key=crypto.randomUUID()){if(!file)return;const c={...context};lastUpload.current={file,key,versionId};controller.current=new AbortController();await run(()=>uploadFile(c,file,key,setProgress,controller.current.signal),'Nueva versión compartida',result=>{lastUpload.current=null;clearDraft();setRequestedVersion(result.version.id);});}
  async function addAudio(files){
    if(busy||loading||readonly)return;const token=generation.current;setAudioError('');setAudioPending(true);
    try{const next=[];for(const file of [...files]){if(!file.type.startsWith('audio/')&&!file.name.toLowerCase().endsWith('.mp3'))throw new Error('Selecciona un archivo de audio.');if(file.size>2097152)throw new Error('Cada audio debe pesar menos de 2 MB.');const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});next.push({id:crypto.randomUUID(),name:file.name,dataUrl,size:file.size});}if(token!==generation.current)return;setAttachments(current=>{if(current.length+next.length>3||[...current,...next].reduce((sum,a)=>sum+a.size,0)>4194304){setAudioError('Máximo 3 audios y 4 MB por comentario.');return current;}return [...current,...next];});setDraft(d=>({...d,requestId:crypto.randomUUID()}));}catch(e){if(token===generation.current)setAudioError(e.message||'No se pudo leer el audio.');}finally{setAudioPending(false);}
  }
  function pick(id){if(id!==versionId&&discard()){clearDraft();setRequestedVersion(id);}}
  const marks=[...(room?.comments||[]).filter(c=>c.status==='open'&&c.annotation).map(c=>({...c.annotation,id:c.id,timeSeconds:c.anchor.timeSeconds})),...(draftMark?[{...draftMark,id:'draft',draft:true}]:[])];
  function updateMarks(next){if(readonly||busy||loading)return;const result=typeof next==='function'?next(marks):next;const known=new Set((room?.comments||[]).map(comment=>comment.id));const mark=[...result].reverse().find(item=>item.id!=='draft'&&!known.has(item.id));if(!mark){setDraftMark(null);setSelected(null);return;}setDraftMark({...sharedAnnotation(mark),timeSeconds:currentTime});setSelected('draft');setDraft(d=>({...d,requestId:crypto.randomUUID()}));}
  async function quickWebComment(mark,text){const parsed=parseCommentCommand(text);if(readonly||busy||loading||!parsed.text)return false;const result=await run(()=>postComment(context,{text:parsed.text,priority:parsed.priority,requestId:crypto.randomUUID(),anchor:{timeSeconds:media?.kind==='video'?(mark.timeSeconds??currentTime):null},annotation:sharedAnnotation(mark)}),'Comentario publicado',()=>{setDraftMark(null);setSelected(null);});return Boolean(result?.comment)}
  const counts=sharedCommentCounts(room);
  const visibleComments=filterSharedComments(room?.comments||[],'Todos',search).filter(c=>priorityFilter==='all'||c.priority===priorityFilter);
  const emptyMessage=sharedCommentsEmptyMessage({comments:room?.comments||[],visible:visibleComments,filter:'Todos',search,nextCursor:room?.nextCursor});
  if(loading&&!room)return <section className="shared-review-room shared-room-opening"><ReviewLoading/></section>;
  return <section className="shared-review-room" aria-label="Revisión compartida">
    <DrawingTrail enabled={!preview&&!readonly&&!busy&&Boolean(tool)&&tool!=='type'} color={color}/>
    <header className="topbar"><div className="breadcrumb"><button disabled={loading||busy} onClick={()=>{if(discard()){clearDraft();onBack();}}}>{projectName||'Proyecto'}</button><Icon name="chevron" size={14}/><div><strong>{room?.asset.name||'Cargando pieza…'}</strong><span>Guardado en el espacio del equipo</span></div></div><div className="top-actions"><ShareProjectButton workspaceId={workspaceId} projectId={projectId}/><button className="shortcut-trigger" aria-label="Ver atajos de teclado" title="Atajos (?)" onClick={()=>setShortcutsOpen(true)}>?</button><button aria-label="Actualizar" aria-describedby={hasDraft()?'review-refresh-draft-hint':undefined} title={hasDraft()?'Publica o descarta tu borrador antes de actualizar los datos de revisión.':undefined} className="secondary" disabled={loading||busy||hasDraft()} onClick={()=>{setRefresh(n=>n+1);onRefreshDelivery?.();}}><Icon name="redo" size={17}/><span>Actualizar</span></button>{room&&<button className={readonly?'approval approved':'approval'} disabled={loading||busy||readonly||!room.version.reviewerIds.includes(currentAccountId())||(counts.blocking>0||counts.partial)} onClick={()=>run(()=>postDecision(context,{decision:'approved',revision:room.version.revision,requestId:crypto.randomUUID()}),'Decisión registrada')}><Icon name="check" size={16}/>{readonly?'Aprobado':'Aprobar versión'}</button>}<AccountProfileMenu initials={state.members[state.currentUserId]?.initials}/></div></header>
    {hasDraft()&&<p id="review-refresh-draft-hint" className="review-refresh-hint" role="status">Publica o descarta tu borrador antes de actualizar los datos de revisión.</p>}
    {error&&<div role="alert" className="shared-review-error"><p>{error}</p><small>Tu borrador se conserva. Actualiza los datos antes de reintentar.</small>{lastUpload.current?.versionId===versionId&&<button disabled={loading||busy} onClick={()=>versionUpload(lastUpload.current.file,lastUpload.current.key)}>Reintentar versión</button>}</div>}

    {busy&&progress>0&&<BrandLoader size="inline" label={progress<100?`Subiendo ${progress}%…`:'Finalizando…'}/>}
    {loading&&<BrandLoader label="Cargando revisión…"/>}
    {room&&<>
    <div className="review-layout shared-original-review"><div className="review-main">{deliveryGrid}<div className="asset-bar"><div className="asset-meta"><span className="file-type">{room?.asset.kind==='video'?'VIDEO':room?.asset.kind==='web'?'WEB':'IMG'}</span><div><strong>{room?.asset.name||'Pieza de revisión'}</strong><span>{room?.version.externalUrl?'Enlace externo · contenido en vivo':'Archivo de revisión · espacio del equipo'}</span></div></div><div className="asset-actions"><label className="shared-version-picker"><span className="sr-only">Versión</span><select aria-label="Versión" disabled={loading||busy} value={versionId} onChange={e=>pick(e.target.value)}>{versions.map(v=><option key={v.id} value={v.id}>V{v.number}{v.id===room?.asset.activeVersionId?' · Actual':''}</option>)}</select></label>{canEdit&&!room?.version.externalUrl&&<><button className="upload-button" disabled={loading||busy||loading} onClick={()=>{if(discard())fileInput.current?.click();}}><Icon name="plus" size={15}/>Nueva versión</button><input ref={fileInput} type="file" hidden accept={room?.asset.kind==='video'?'video/mp4':'image/png,image/jpeg,image/webp'} onChange={e=>{versionUpload(e.target.files?.[0]);e.target.value='';}}/></>}</div></div><div className="social-mode-switch" role="group" aria-label="Modo de visualización"><div className="review-mode-options"><button aria-pressed={!preview} onClick={()=>setPreview(false)}><Icon name="pen" size={16}/><span>Revisión y anotaciones</span></button><button disabled={room?.asset.kind==='web'} aria-pressed={preview} onClick={()=>setPreview(true)}><Icon name="image" size={16}/><span>Preview social</span></button></div><span className="review-mode-hint">{preview?'Vista de publicación':'Revisa cada detalle'}</span></div>{media&&(preview&&media.kind!=='web'?<div className="shared-social-card"><header><span className="shared-social-avatar">R</span><strong>{room.asset.name}</strong><span>···</span></header>{media.kind==='image'?<img src={media.url} alt={media.name}/>:<video src={media.url} controls/>}<footer><div className="shared-social-icons" aria-hidden="true">{['heart','chat','repost','send','bookmark'].map(name=><SocialReferenceIcon key={name} name={name}/>)}</div><span>Vista orientativa · esta versión · sin métricas conectadas</span></footer></div>:<OriginalMediaStage media={{...media,type:media.kind,duration,setDuration}} currentTime={currentTime} setCurrentTime={setTime} marks={marks} setMarks={updateMarks} activeTool={tool} setActiveTool={setTool} activeColor={color} setActiveColor={setColor} readonly={readonly||busy||loading} versionApproved={readonly} draftOnlyUndo selectedFigure={selected} reviewVersionId={versionId} members={Object.fromEntries(room.members.map(m=>[m.id,m]))} figureComments={room.comments.map(c=>({...c,versionId,timeSeconds:c.anchor.timeSeconds,annotationId:c.annotation?c.id:null}))} onTimelineComment={c=>{setSelected(c.id);setTime(c.anchor.timeSeconds??0);}} onFigure={(mark,options={})=>{setSelected(mark.id);if(options.openComments!==false)document.getElementById(`shared-comment-${mark.id}`)?.scrollIntoView({block:'nearest',behavior:'smooth'});}} onQuickComment={quickWebComment}/>)}
    <div className="review-summary"><div><span className="eyebrow">RONDA DE REVISIÓN</span><strong>{counts.open} comentarios pendientes</strong><small>{room.version.reviewerIds.length?`${room.version.reviewerIds.filter(id=>room.version.decisions[id]==='approved').length}/${room.version.reviewerIds.length} aprobaciones`:'Sin revisores asignados'} · compartido con el equipo</small></div><button className="ai-button" onClick={()=>setSummaryOpen(true)}><Icon name="spark"/><span><strong>Resumir cambios</strong><small>Ver pendientes y bloqueantes</small></span></button></div><details className="shared-review-people" open={reviewersOpen} onToggle={e=>setReviewersOpen(e.currentTarget.open)}><summary>Revisores y decisiones</summary>{room.members.map(m=><label key={m.id}><input type="checkbox" checked={reviewers.includes(m.id)} disabled={!canEdit||readonly||busy} onChange={e=>setReviewers(r=>e.target.checked?[...r,m.id]:r.filter(id=>id!==m.id))}/><span>{m.name}</span><small>{room.version.decisions[m.id]==='approved'?'Aprobó':room.version.decisions[m.id]==='changes_requested'?'Pidió cambios':room.version.reviewerIds.includes(m.id)?'Pendiente':''}</small></label>)}{canEdit&&!readonly&&<button disabled={loading||busy||JSON.stringify([...reviewers].sort())===JSON.stringify([...room.version.reviewerIds].sort())} onClick={()=>run(()=>reviewSend(versionPath(context)+'/reviewers','PUT',{reviewerIds:reviewers,revision:room.version.revision}),'Revisores actualizados')}>Guardar revisores</button>}
    {room.version.reviewerIds.includes(currentAccountId())&&!readonly&&<div className="shared-decision-actions"><button disabled={loading||busy} onClick={()=>run(()=>postDecision(context,{decision:'changes_requested',revision:room.version.revision,requestId:crypto.randomUUID()}),'Cambios solicitados')}>Solicitar cambios</button><button className="primary-action" disabled={loading||busy||sharedApprovalBlocked(counts)} onClick={()=>run(()=>postDecision(context,{decision:'approved',revision:room.version.revision,requestId:crypto.randomUUID()}),'Decisión registrada')}>Aprobar versión</button></div>}
    </details></div><aside className="comments-panel shared-original-comments" aria-label="Comentarios pendientes de esta versión"><div className="panel-head"><div><span className="panel-kicker">REVISIÓN</span><strong>Comentarios</strong><small>{counts.open} pendientes{counts.partial?' · más por cargar':''}</small></div></div><div className="comment-toolbar"><label className="comment-search"><input aria-label="Buscar comentarios pendientes" placeholder="Buscar" value={search} onChange={e=>setSearch(e.target.value)}/></label></div><label className="priority-filter">Prioridad<select aria-label="Filtrar por prioridad" value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)}><option value="all">Todas</option><option value="high">Urgentes</option><option value="blocking">Bloqueantes</option><option value="normal">Normales</option></select></label><div className="comments-scroll">
    {visibleComments.map(c=><article key={c.id} id={`shared-comment-${c.id}`} className={`comment-card ${c.status==='resolved'?'resolved':''} ${selected===c.id?'selected':''}`}><div className="comment-head"><span className="avatar" style={{background:'#67a9d4'}}>{(c.author||'Miembro').slice(0,2).toUpperCase()}</span><span className="comment-author"><strong>{c.author||'Miembro'}</strong><small>{c.status==='resolved'?'Resuelto':'Abierto'}</small></span>{['blocking','high'].includes(c.priority)&&<span className={`priority-label priority-${c.priority}`}>{c.priority==='blocking'?'Bloqueante':'Urgente'}</span>}</div><button className="comment-location" onClick={()=>{setSelected(c.id);if(c.anchor.timeSeconds!==null)setTime(c.anchor.timeSeconds);setPreview(false);}}>{c.anchor.timeSeconds!==null?`${c.anchor.timeSeconds.toFixed(2)} s`:'Ver anotación'}</button><p className="comment-copy">{c.text}</p>{!!c.attachments?.length&&<div className="comment-attachments">{c.attachments.map(a=><div key={a.id}><span>{a.name}</span><audio controls preload="none" src={versionPath(context)+`/comments/${c.id}/audio/${a.id}`} aria-label={`Escuchar ${a.name}`}/></div>)}</div>}{c.anchor.timeSeconds!==null&&<small>{c.anchor.timeSeconds.toFixed(2)} s</small>}{!readonly&&c.authorId===currentAccountId()&&<button disabled={loading||busy} onClick={()=>setEditDraft({id:c.id,text:c.text,revision:c.revision})}>Editar texto</button>}{editDraft?.id===c.id&&!readonly&&<form onSubmit={e=>{e.preventDefault();run(()=>reviewSend(versionPath(context)+`/comments/${c.id}/text`,'PATCH',editDraft),'Comentario editado',()=>setEditDraft(null));}}><label>Editar tu comentario<textarea required maxLength={2000} value={editDraft.text} onChange={e=>setEditDraft(d=>({...d,text:e.target.value}))}/></label><button disabled={loading||busy||!editDraft.text.trim()}>Guardar</button><button type="button" onClick={()=>setEditDraft(null)}>Cancelar</button></form>}{c.replies.map(r=><p className="reply-list" key={r.id}><strong>{r.author}</strong> {r.text}</p>)}{!readonly&&<>{replyOpen[c.id]&&<form className="inline-reply" onSubmit={e=>{e.preventDefault();const r=reply[c.id];if(r?.text.trim())run(()=>reviewSend(versionPath(context)+`/comments/${c.id}/replies`,'POST',r),'Respuesta publicada',()=>setReply(value=>({...value,[c.id]:{text:'',requestId:crypto.randomUUID()}})));}}><label className="sr-only" htmlFor={`reply-${c.id}`}>Responder a {c.author}</label><input id={`reply-${c.id}`} maxLength={2000} placeholder="Responder…" value={reply[c.id]?.text||''} onChange={e=>setReply(value=>({...value,[c.id]:{text:e.target.value,requestId:crypto.randomUUID()}}))}/><button disabled={loading||busy||!reply[c.id]?.text.trim()}>Enviar</button></form>}<footer className="comment-foot"><div><button disabled={loading||busy} onClick={()=>setReplyOpen(v=>({...v,[c.id]:!v[c.id]}))}>Responder{c.replies.length?` · ${c.replies.length}`:''} </button></div>{canEdit&&<button disabled={loading||busy} onClick={()=>run(()=>reviewSend(versionPath(context)+`/comments/${c.id}/status`,'PATCH',{status:c.status==='open'?'resolved':'open',revision:c.revision}),'Comentario actualizado')} ><Icon name="check" size={14}/>{c.status==='open'?'Resolver':'Reabrir'}</button>}</footer></>}</article>)}
    {emptyMessage&&<p className="shared-media-empty" role="status">{emptyMessage}</p>}
    {room.nextCursor&&<button disabled={loading||busy} onClick={async()=>{const token=generation.current,pageToken=guard.current.begin();try{const next=await reviewRequest(versionPath(context)+`/comments?cursor=${encodeURIComponent(room.nextCursor)}`);if(token===generation.current&&guard.current.isCurrent(pageToken))setRoom(r=>({...r,comments:[...r.comments,...next.comments.filter(comment=>comment.status==='open')],commentStats:next.commentStats||r.commentStats,nextCursor:next.nextCursor}));}catch(e){if(token===generation.current&&guard.current.isCurrent(pageToken))setError(e.message);}}}>Ver más comentarios</button>}
    </div>{!readonly&&<form className="composer shared-original-composer restored-composer" onSubmit={e=>{e.preventDefault();const parsed=parseCommentCommand(draft.text);if(audioPending||recording||(!parsed.text&&!attachments.length))return;run(()=>postComment(context,{text:parsed.text,attachments:attachments.map(({name,dataUrl})=>({name,dataUrl})),priority:parsed.priority,requestId:draft.requestId,anchor:{timeSeconds:media?.kind==='video'?(draftMark?.timeSeconds??currentTime):null},annotation:sharedAnnotation(draftMark)}),'Comentario compartido publicado',()=>{clearDraft();setTool('');});}}>
      {attachments.map(a=><div className="audio-draft" key={a.id}><span>{a.name}</span><audio controls preload="metadata" src={a.dataUrl} aria-label={`Revisar audio ${a.name}`}/><button type="button" aria-label={`Quitar audio ${a.name}`} onClick={()=>{setAttachments(current=>current.filter(item=>item.id!==a.id));setDraft(d=>({...d,requestId:crypto.randomUUID()}));}}><Icon name="x" size={15}/></button></div>)}
      {draftMark&&<div className="figure-link-status"><span>Figura vinculada</span><button type="button" onClick={()=>setDraftMark(null)}>Desvincular ×</button></div>}
      <div className="composer-message-bar"><AudioCommentInput onAttach={addAudio} onError={setAudioError} onRecordingChange={setRecording} disabled={loading||busy||audioPending}/><div className="composer-input"><label className="sr-only" htmlFor="shared-comment-draft">Escribir comentario</label><textarea id="shared-comment-draft" ref={commentInput} maxLength={2000} value={draft.text} onChange={e=>setDraft(d=>({...d,text:e.target.value,requestId:crypto.randomUUID()}))} placeholder="Escribe un mensaje para el equipo…" onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();e.currentTarget.form?.requestSubmit();}}}/><div className="composer-meta"><span>{media?.kind==='video'?`${currentTime.toFixed(2)} s · `:''}Ctrl/⌘ + Enter</span><span>{draft.text.length}/2000</span></div></div><button className="send" aria-label="Publicar comentario" disabled={loading||busy||recording||audioPending||(!parseCommentCommand(draft.text).text&&!attachments.length)} type="submit"><Icon name="send" size={18}/></button></div>
      <PriorityCommands value={draft.text} onChange={text=>setDraft(d=>({...d,text,requestId:crypto.randomUUID()}))}/>
      {(audioError||audioPending)&&<small role={audioError?'alert':'status'} className="attachment-error">{audioError||<BrandLoader size="inline" label="Preparando audio…"/>}</small>}
    </form>}
    </aside></div></>}
    {shortcutsOpen&&<ShortcutHelp onClose={()=>setShortcutsOpen(false)}/>}
    {summaryOpen&&room&&<ReviewSummaryDialog comments={room.comments} partial={Boolean(room.nextCursor)} onClose={()=>setSummaryOpen(false)}/>}
  </section>;
}
