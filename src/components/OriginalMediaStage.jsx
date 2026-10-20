import React,{useState,useRef,useEffect,useLayoutEffect} from 'react';
import Icon from './Icon.jsx';
import {AnnotationLayer} from './AnnotationLayer.jsx';
import {annotationVisibleAt} from '../domain/annotations.js';
import {TimelineMarkers} from './TimelineMarkers.jsx';
import {ExternalWeb} from './ExternalWeb.jsx';
import './original-media-stage.css';
import {BrandLoader} from './BrandLoader.jsx';
import {ignoreReviewShortcut} from '../domain/review-focus.js';
import {recordPhaseDuration} from '../state/performanceTelemetry.js';
const formatTime = value => {
  const seconds = Math.max(0, Number(value) || 0);
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * 24);
  return { time: `00:${String(minutes).padStart(2,'0')}:${String(remainder).padStart(2,'0')}`, frame: Math.floor(seconds * 24), frames };
};
export function OriginalMediaStage({ activeTool, setActiveTool, activeColor, setActiveColor, media, currentTime, setCurrentTime, remoteCursor, marks, setMarks, selectedFigure, onFigure, figureComments, onTimelineComment, reviewVersionId, members={}, readonly=false, versionApproved=false, draftOnlyUndo=false }) {
  const [zoom,setZoom]=useState(1),[imageRatio,setImageRatio]=useState(16/9);
  const [viewMode,setViewMode]=useState('auto');
  const viewportRef=useRef(null);
  const [viewportSize,setViewportSize]=useState({width:0,height:0});
  const fitZoom=viewportSize.width&&viewportSize.height?Math.min(1,viewportSize.height*imageRatio/viewportSize.width):1;
  const effectiveZoom=viewMode==='auto'?fitZoom:viewMode==='width'?Math.max(1,Math.min(24,(16/9)/imageRatio*.94)):zoom;
  const changeZoom=value=>{setViewMode('manual');setZoom(value);};
  const zoomIn=()=>changeZoom(Math.min(24,Math.max(fitZoom,effectiveZoom)*1.25));
  const zoomOut=()=>{const next=effectiveZoom/1.25;if(next<=fitZoom)setViewMode('auto');else changeZoom(next);};
  useEffect(()=>{const el=viewportRef.current;if(!el)return;const measure=()=>{const width=el.clientWidth,height=el.clientHeight;setViewportSize(previous=>previous.width===width&&previous.height===height?previous:{width,height});el.scrollLeft=Math.max(0,(el.scrollWidth-el.clientWidth)/2);};measure();const observer=new ResizeObserver(measure);observer.observe(el);return()=>observer.disconnect();},[media?.url]);
  useEffect(()=>{setZoom(1);setViewMode('auto');setRedoMarks([]);},[media?.url]);
  useEffect(()=>{const el=viewportRef.current;if(el){el.scrollLeft=(el.scrollWidth-el.clientWidth)/2;if(viewMode!=='manual')el.scrollTop=0;}},[effectiveZoom,viewMode]);
  const [playing, setPlaying] = useState(false);
  const [muted,setMuted]=useState(false);
  const [playbackError,setPlaybackError]=useState('');
  const [readyUrl,setReadyUrl]=useState(''),[buffering,setBuffering]=useState(false),[failedUrl,setFailedUrl]=useState('');
  const [redoMarks,setRedoMarks]=useState([]);
  const videoRef = useRef(null);
  const stageRef = useRef(null);
  const previewLoad=useRef(null);
  useLayoutEffect(()=>{previewLoad.current=media?.url?{url:media.url,started:performance.now()}:null;return()=>{previewLoad.current=null;}},[media?.url]);
  const recordPreviewReady=()=>{const start=previewLoad.current;if(start?.url===media?.url){recordPhaseDuration('review.preview-ready',performance.now()-start.started);previewLoad.current=null;}};
  const colors = ['#ff725e','#f2bd5c','#8ebd72','#67a9d4','#b89be8','#f1eee7'];
  const stamp = formatTime(currentTime);
  const visibleMarks=marks.filter(mark=>mark.draft||annotationVisibleAt(mark,currentTime,media?.type==='image'));
  const duration = media ? (media.duration || 0) : 36.42;
  useEffect(()=>{setPlaybackError('');setPlaying(false);},[media?.url]);
  const playbackFailed=()=>{setPlaying(false);setPlaybackError('No se pudo iniciar la reproducción. Revisa la pieza e inténtalo de nuevo.');};
  const togglePlayback = () => {
    if (!videoRef.current) { setPlaying(!playing); return; }
    if (videoRef.current.paused) {
      try { const attempt=videoRef.current.play(); if(attempt&&typeof attempt.catch==='function')attempt.catch(playbackFailed); }
      catch { playbackFailed(); }
    } else videoRef.current.pause();
  };
  const seek=value=>{const next=Math.max(0,Math.min(duration,currentTime+value));setCurrentTime(next);if(videoRef.current)videoRef.current.currentTime=next;};
  const toggleFullscreen=()=>{if(!document.fullscreenElement)stageRef.current?.requestFullscreen?.();else document.exitFullscreen?.();};
  useEffect(()=>{if(videoRef.current&&Math.abs(videoRef.current.currentTime-currentTime)>.2)videoRef.current.currentTime=currentTime},[currentTime]);
  const updateMarks=next=>{setMarks(next);setRedoMarks([]);};
  const undoMark=()=>setMarks(current=>{const index=draftOnlyUndo?current.findLastIndex(m=>m.draft):current.length-1;if(index<0)return current;setRedoMarks(redo=>[current[index],...redo]);return current.filter((_,i)=>i!==index)});
  const redoMark=()=>setRedoMarks(current=>{if(!current.length)return current;setMarks(marksNow=>[...marksNow,current[0]]);return current.slice(1)});
  useEffect(()=>{const handler=e=>{
    if(ignoreReviewShortcut(e,document))return;
    if(e.key==='Escape'&&document.fullscreenElement===stageRef.current){document.exitFullscreen?.();return;}
    if(media?.type==='web')return;
    const key=e.key.toLowerCase(),canPlayback=!media||['video','audio'].includes(media.type);
    if(!readonly&&(e.ctrlKey||e.metaKey)&&key==='z'){e.preventDefault();e.shiftKey?redoMark():undoMark();return;}
    if(!readonly&&(e.ctrlKey||e.metaKey)&&key==='y'){e.preventDefault();redoMark();return;}
    if(canPlayback&&key===' '){e.preventDefault();togglePlayback();return;}
    if(canPlayback&&key==='j'){e.preventDefault();seek(-5);return;}
    if(canPlayback&&key==='l'){e.preventDefault();seek(5);return;}
    if(canPlayback&&key==='arrowleft'){e.preventDefault();seek(-1/24);return;}
    if(canPlayback&&key==='arrowright'){e.preventDefault();seek(1/24);return;}
    if(canPlayback&&key==='m'){e.preventDefault();setMuted(value=>!value);return;}
    if(canPlayback&&key==='f'){e.preventDefault();toggleFullscreen();return;}
    if(readonly)return;
    if(key==='d'){e.preventDefault();setActiveTool(tool=>tool?'':'pen');return;}
    if(['1','2','3','4'].includes(key)){e.preventDefault();setActiveTool(['pen','arrow','square','type'][Number(key)-1]);}
  };window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);});
  if(media?.type==='web')return <section className="media-section original-media-stage" data-media-type={media?.type}><ExternalWeb url={media.url} name={media.name}/><p>Comentarios generales del artefacto · sin sincronización con la animación de la página.</p></section>;
  return <section className="media-section original-media-stage" data-media-type={media?.type}>
    {media?.type==='image'&&<div className="image-view-controls" aria-label="Vista de la imagen"><span>Imagen · revisión y anotaciones</span><div><button disabled={viewMode==='auto'||effectiveZoom<=fitZoom} onClick={zoomOut} aria-label="Alejar imagen">−</button><output aria-live="polite">{viewMode==='width'?'Ancho':`${Math.round(effectiveZoom*100)}%`}</output><button disabled={effectiveZoom>=24} onClick={zoomIn} aria-label="Acercar imagen">+</button><button onClick={()=>setViewMode('auto')}>Ajustar a pantalla</button><button onClick={()=>setViewMode('width')}>Ajustar al ancho</button></div></div>}
    <div className="media-stage" ref={stageRef}>
      <button className="stage-exit-fullscreen" aria-label="Salir de pantalla completa" onClick={toggleFullscreen}><Icon name="maximize" size={18}/><span>Salir de pantalla completa</span></button>
      <div className={`media-viewport ${media?.type==='image'?(viewMode==='auto'?'is-fit':'is-zoomed'):''}`} ref={viewportRef}>
      <div className="film-frame" style={media?.type==='image'?{width:`${effectiveZoom*100}%`,minWidth:effectiveZoom<1?'0':'100%',aspectRatio:imageRatio}:undefined}>
        {media?.type === 'video' && <video ref={videoRef} className="uploaded-media" onError={()=>{setFailedUrl(media.url);setReadyUrl(media.url);setBuffering(false);}} src={media.url} muted={muted} onTimeUpdate={e=>setCurrentTime(e.currentTarget.currentTime)} onLoadedMetadata={e=>media.setDuration?.(e.currentTarget.duration)} onPlay={()=>{setPlaying(true);setPlaybackError('');}} onPause={()=>setPlaying(false)} onWaiting={()=>setBuffering(true)} onPlaying={()=>setBuffering(false)} onCanPlay={()=>{recordPreviewReady();setReadyUrl(media.url);setBuffering(false);}}/>}
        {media?.type === 'image' && <img className="uploaded-media" src={media.url} alt={media.name} onLoad={e=>{recordPreviewReady();setImageRatio(e.currentTarget.naturalWidth/e.currentTarget.naturalHeight||16/9);setFailedUrl('');setReadyUrl(media.url);}} onError={()=>{setFailedUrl(media.url);setReadyUrl(media.url);}}/>}
        {!media && <div className="scene-art" role="img" aria-label="Fotograma de una campaña de producto cosmético">
          <div className="scene-grain"/><div className="sun-disc"/><div className="product-shadow"/>
          <div className="product"><div className="cap"/><div className="bottle"><span>AMARA</span><small>BOTANICAL SERUM</small></div></div>
          <div className="scene-copy"><span>02 / RITUAL</span><strong>La calma<br/>también se cultiva.</strong></div>
        </div>}
        {media?.type==='audio'&&<audio ref={videoRef} src={media.url} controls muted={muted} onError={()=>{setFailedUrl(media.url);setBuffering(false);}} onTimeUpdate={e=>setCurrentTime(e.currentTarget.currentTime)} onLoadedMetadata={e=>media.setDuration?.(e.currentTarget.duration)} onPlay={()=>{setPlaying(true);setPlaybackError('');}} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} onWaiting={()=>setBuffering(true)} onPlaying={()=>setBuffering(false)} onCanPlay={()=>{recordPreviewReady();setReadyUrl(media.url);setBuffering(false);}}/>}
        {media?.type==='pdf'&&<iframe title={media.name} src={media.url} style={{width:'100%',height:'100%',position:'absolute',zIndex:2}}/>}
        {media?.type==='file'&&<div style={{position:'absolute',zIndex:3,padding:24,background:'#181a16'}}><strong>{media.name}</strong><p>Sin vista previa. Comentarios generales disponibles.</p><a href={media.url} download={media.name}>Descargar archivo local</a></div>}
        {['image','video'].includes(media?.type)&&(readyUrl!==media.url||buffering)&&<span className="media-brand-loading"><BrandLoader size="compact" label={buffering?'Preparando reproducción…':'Cargando pieza…'}/></span>}
        {media&&failedUrl===media.url&&<span className="media-brand-loading" role="alert">No se pudo cargar la pieza. Vuelve a abrirla para reintentar.</span>}
        {media&&playbackError&&failedUrl!==media.url&&<span className="media-brand-loading" role="alert">{playbackError} Usa Reproducir para volver a intentarlo.</span>}
        <AnnotationLayer activeTool={readonly?'':activeTool} activeColor={activeColor} marks={visibleMarks} setMarks={next=>updateMarks(current=>[...current.filter(mark=>!annotationVisibleAt(mark,currentTime,media?.type==='image')),...(typeof next==='function'?next(visibleMarks):next)])} selectedFigure={selectedFigure}/>
        {visibleMarks.map(mark=>{const index=marks.findIndex(item=>item.id===mark.id);return <button key={mark.id} className={`figure-pin ${selectedFigure===mark.id?'selected':''}`} style={{left:`${mark.points[0].x*100}%`,top:`${mark.points[0].y*100}%`}} aria-label={`Figura ${index+1}, ${figureComments.filter(c=>c.annotationId===mark.id).length} comentarios`} onClick={()=>onFigure(mark)}>{index+1}</button>})}
        {remoteCursor&&<div className="remote-cursor" style={{left:`${remoteCursor.x}%`,top:`${remoteCursor.y}%`,'--presence-color':remoteCursor.color}}><i/><span>{remoteCursor.name}</span></div>}
        <div className="frame-badge">{stamp.time} · F{stamp.frame}</div>
      </div>
      </div>
      <div className="annotation-toolbar-wrap">
      {readonly&&<p className="annotation-readonly-status" role="status">{versionApproved?'Versión aprobada · solo lectura':'Herramientas temporalmente deshabilitadas'}</p>}
      <div className="annotation-tools" inert={readonly?true:undefined} aria-label="Herramientas de anotación">
        {['pen','arrow','square','type'].map((tool,index) => <button key={tool} disabled={readonly} title={readonly?'Anotaciones en solo lectura':`${['Lápiz','Flecha','Rectángulo','Texto'][index]} · ${index+1}`} onClick={()=>setActiveTool(tool)} className={activeTool===tool?'active':''} aria-pressed={activeTool===tool} aria-label={`${['Lápiz','Flecha','Rectángulo','Texto'][index]} (${index+1})`}><Icon name={tool}/><kbd>{index+1}</kbd></button>)}
        <span className="tool-divider"/>
        <div className="color-options">{colors.map((c,index)=><button key={c} disabled={readonly} aria-label={`Color ${['coral','ámbar','verde','azul','violeta','blanco'][index]}`} aria-pressed={activeColor===c} title={readonly?'Anotaciones en solo lectura':c} onClick={()=>setActiveColor(c)} className={activeColor===c?'selected':''} style={{'--swatch':c,backgroundColor:c}}/>)}</div>
        <span className="tool-divider"/><button onClick={undoMark} disabled={readonly||!(draftOnlyUndo?marks.some(m=>m.draft):marks.length)} title="Deshacer · Ctrl/⌘ + Z" aria-label="Deshacer última anotación"><Icon name="undo"/></button><button onClick={redoMark} disabled={readonly||!redoMarks.length} title="Rehacer · Ctrl/⌘ + Shift + Z" aria-label="Rehacer anotación"><Icon name="redo"/></button>
      </div>
      </div>
    </div>
    <div className={`player-controls ${media?.type==='image'?'image-player-controls':''}`}>
      {media?.type!=='image'&&<>
      <button className="play" disabled={media?.type==='image'} onClick={togglePlayback} aria-label={playing?'Pausar':'Reproducir'}><Icon name={playing?'pause':'play'} size={20}/></button>
      <span className="timecode"><strong>{stamp.time}</strong><span>/ {formatTime(duration).time}</span></span>
      <div className="scrubber"><input aria-label={media?.type==='audio'?'Posición del audio':'Posición del video'} type="range" min="0" max={duration || 1} step="0.01" value={Math.min(currentTime,duration || 1)} onChange={e=>{const value=Number(e.target.value);setCurrentTime(value);if(videoRef.current)videoRef.current.currentTime=value}}/><div className="scrubber-fill" style={{width:`${Math.min(100,currentTime/(duration||1)*100)}%`}}/><TimelineMarkers versionId={reviewVersionId} comments={figureComments} duration={duration} members={members} onOpen={c=>{videoRef.current?.pause();setPlaying(false);onTimelineComment(c)}}/><span className="playhead" style={{left:`${Math.min(100,currentTime/(duration||1)*100)}%`}}/></div>
      <button aria-label={muted?'Activar sonido':'Silenciar'} onClick={()=>setMuted(value=>!value)} className={muted?'active':''}><Icon name="volume"/></button>{media?.type==='video'&&<span className="fps">24 FPS</span>}</>}<button aria-label="Pantalla completa (F)" onClick={toggleFullscreen}><Icon name="maximize"/></button>
    </div>
  </section>;
}

