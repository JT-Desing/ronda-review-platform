import React,{useState,useEffect,useRef} from 'react';
import {AnnotationLayer} from './AnnotationLayer.jsx';
import Icon from './Icon.jsx';
import {documentMarkToViewport,normalizeWebReviewMetrics,viewportMarkToDocument} from '../domain/web-review-bridge.js';
import './external-artifacts.css';

export function ExternalWeb({url,name,activeTool='',setActiveTool=()=>{},activeColor='#b89be8',setActiveColor=()=>{},marks=[],setMarks=()=>{},selectedFigure,onFigure=()=>{},onQuickComment,figureComments=[],readonly=false}){
  const [loaded,setLoaded]=useState(false),[fullscreen,setFullscreen]=useState(false),[capturing,setCapturing]=useState(false),[captureError,setCaptureError]=useState(''),[commentMark,setCommentMark]=useState(null),[commentDraft,setCommentDraft]=useState(''),[commentBusy,setCommentBusy]=useState(false),[webMetrics,setWebMetrics]=useState(null);
  const holder=useRef(null),iframe=useRef(null),bridgeNonce=useRef(crypto.randomUUID());
  useEffect(()=>{setLoaded(false);setActiveTool('');setCommentMark(null);setCommentDraft('');setWebMetrics(null);bridgeNonce.current=crypto.randomUUID();},[url]);
  useEffect(()=>{const update=()=>setFullscreen(document.fullscreenElement===holder.current);document.addEventListener('fullscreenchange',update);return()=>document.removeEventListener('fullscreenchange',update);},[]);
  let safe;try{const parsed=new URL(url);safe=parsed.protocol==='https:'&&!parsed.username&&!parsed.password&&parsed.origin!==window.location.origin?parsed.href:null;}catch{}
  if(!safe)return <p role="alert">Enlace externo no válido.</p>;
  const colors=['#ff725e','#f2bd5c','#8ebd72','#67a9d4','#b89be8','#f1eee7'];
  const viewportMarks=marks.map(mark=>documentMarkToViewport(mark,webMetrics));
  const commentMarkViewport=commentMark?documentMarkToViewport(commentMark,webMetrics):null;
  useEffect(()=>{
    const receive=event=>{
      if(event.source!==iframe.current?.contentWindow||event.origin!=='null'||event.data?.type!=='ronda:web-review:viewport'||event.data?.nonce!==bridgeNonce.current)return;
      const metrics=normalizeWebReviewMetrics(event.data);if(metrics)setWebMetrics(metrics);
    };
    window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);
  },[url]);
  const startBridge=()=>iframe.current?.contentWindow?.postMessage({type:'ronda:web-review:init',nonce:bridgeNonce.current},'*');
  const saveViewportMarks=next=>{
    const visible=typeof next==='function'?next(viewportMarks):next;
    const originalById=new Map(marks.map(mark=>[mark.id,mark]));
    setMarks(visible.map(mark=>originalById.has(mark.id)?originalById.get(mark.id):viewportMarkToDocument(mark,webMetrics)));
  };
  const openComment=mark=>{setCommentMark(mark);setCommentDraft('');onFigure(mark,{openComments:false})};
  const publishQuickComment=async event=>{event.preventDefault();if(!commentMark||!commentDraft.trim()||!onQuickComment||commentBusy)return;setCommentBusy(true);try{const published=await onQuickComment(commentMark,commentDraft.trim());if(published!==false){setCommentMark(null);setCommentDraft('')}}finally{setCommentBusy(false)}};
  const toggleFullscreen=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await holder.current?.requestFullscreen?.();}catch{}}
  const capturePage=async()=>{
    if(!navigator.mediaDevices?.getDisplayMedia){setCaptureError('Este navegador no permite capturar una pestaña. Puedes usar una captura de pantalla y subirla al proyecto.');return;}
    if(!window.confirm('La captura se guardará y será visible para los miembros de este proyecto. En el selector del navegador, elige únicamente la pestaña de la página que quieres revisar. ¿Continuar?'))return;
    let stream;
    setCapturing(true);setCaptureError('');
    try{
      stream=await navigator.mediaDevices.getDisplayMedia({video:{displaySurface:'browser'},audio:false});
      const track=stream.getVideoTracks()[0];
      if(!track)throw new Error('No se recibió la pestaña seleccionada.');
      const frame=await new Promise((resolve,reject)=>{
        const video=document.createElement('video');video.muted=true;video.playsInline=true;video.srcObject=stream;
        const timeout=setTimeout(()=>reject(new Error('La captura tardó demasiado. Inténtalo de nuevo.')),8000);
        video.onloadedmetadata=async()=>{try{await video.play();const draw=()=>{if(video.videoWidth&&video.videoHeight){clearTimeout(timeout);resolve({video,width:video.videoWidth,height:video.videoHeight});}else requestAnimationFrame(draw);};draw();}catch(error){clearTimeout(timeout);reject(error);}};
        video.onerror=()=>{clearTimeout(timeout);reject(new Error('No se pudo leer la pestaña seleccionada.'))};
      });
      const canvas=document.createElement('canvas');canvas.width=frame.width;canvas.height=frame.height;
      canvas.getContext('2d').drawImage(frame.video,0,0,frame.width,frame.height);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      if(!blob)throw new Error('No se pudo generar la captura.');
      const file=new File([blob],`${(name||'pagina-web').replace(/[^a-z0-9_-]+/gi,'-').slice(0,64)}-captura.png`,{type:'image/png'});
      window.dispatchEvent(new CustomEvent('ronda:web-capture',{detail:{file}}));
    }catch(error){if(error?.name!=='NotAllowedError')setCaptureError(error?.message||'No se pudo capturar la pestaña.');}
    finally{stream?.getTracks().forEach(track=>track.stop());setCapturing(false);}
  };
  return <div className="external-web" ref={holder}>
    <header><span>Artefacto web · contenido en vivo</span><button type="button" onClick={toggleFullscreen}><Icon name="maximize" size={15}/>{fullscreen?'Salir de pantalla completa':'Ampliar visor'}</button><a href={safe} target="_blank" rel="noopener noreferrer">Abrir original ↗</a></header>
    <div className="external-web-frame-notice" role="note">{activeTool?'Dibuja sobre la vista actual. Para desplazarte por la página, elige Navegar.':webMetrics?'Vista en vivo conectada · las anotaciones se guardan en coordenadas del documento.':'La página se muestra directamente. Para anclar comentarios al contenido al hacer scroll, instala la integración de Ronda en el sitio revisado; mientras tanto, captura la pestaña y anota la imagen fija.'}</div>
    {loaded?<div className="external-web-viewport">
      <iframe ref={iframe} title={name||'Artefacto web en revisión'} src={safe} onLoad={startBridge} sandbox="allow-scripts" referrerPolicy="no-referrer" allow="fullscreen" style={{pointerEvents:activeTool?'none':'auto'}}/>
      <AnnotationLayer activeTool={readonly||!webMetrics?'':activeTool} activeColor={activeColor} marks={viewportMarks} setMarks={saveViewportMarks} selectedFigure={selectedFigure} onAnnotationCreated={mark=>openComment(viewportMarkToDocument(mark,webMetrics))}/>
      {viewportMarks.filter(mark=>mark.points?.[0]).map((mark,index)=><button type="button" key={mark.id||index} className={`figure-pin ${selectedFigure===mark.id?'selected':''}`} style={{left:`${mark.points[0].x*100}%`,top:`${mark.points[0].y*100}%`}} aria-label={`Anotación ${index+1}, ${figureComments.filter(comment=>comment.annotationId===mark.id).length} comentarios`} onClick={()=>openComment(mark)}>{index+1}</button>)}
      {commentMarkViewport&&<form className="external-web-comment-popover" role="dialog" aria-label="Comentario en la anotación" style={{'--anchor-x':`${commentMarkViewport.points[0].x*100}%`,'--anchor-y':`${commentMarkViewport.points[0].y*100}%`}} onSubmit={publishQuickComment} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();setCommentMark(null);setCommentDraft('')}if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();event.currentTarget.requestSubmit()}}}>
        <header><span className="external-web-comment-avatar">Tú</span><strong>Deja un comentario</strong><button type="button" aria-label="Cerrar comentario" onClick={()=>{setCommentMark(null);setCommentDraft('')}}>×</button></header>
        {figureComments.filter(comment=>comment.annotationId===commentMark.id).slice(-2).map(comment=><p className="external-web-comment-existing" key={comment.id}>{comment.text}</p>)}
        <textarea autoFocus maxLength={2000} aria-label="Escribe un comentario para esta anotación" placeholder="Añade contexto sobre este punto…" value={commentDraft} onChange={event=>setCommentDraft(event.target.value)}/>
        <footer><span>Ctrl/⌘ + Enter para publicar · Esc para cerrar</span><button type="submit" disabled={readonly||commentBusy||!commentDraft.trim()||!onQuickComment}>{commentBusy?'Publicando…':'Publicar'}</button></footer>
      </form>}
    </div>:<div className="external-web-consent"><p>Abre la página en el visor. Si su política de seguridad bloquea la integración, puedes capturar la pestaña real y guardarla como imagen revisable en este proyecto.</p><div className="external-web-actions"><button onClick={()=>setLoaded(true)}>Cargar página para revisar</button><button type="button" className="secondary" disabled={readonly||capturing} onClick={capturePage}>{capturing?'Preparando captura…':'Capturar pestaña para comentar'}</button></div>{captureError&&<small role="alert">{captureError}</small>}</div>}
    {loaded&&<div className="external-web-annotation-toolbar" aria-label="Herramientas de anotación web"><button type="button" aria-pressed={!activeTool} className={!activeTool?'active':''} onClick={()=>setActiveTool('')}>Navegar</button>{['pen','arrow','square','type'].map((tool,index)=><button type="button" key={tool} disabled={readonly||!webMetrics} title={['Lápiz','Flecha','Rectángulo','Texto'][index]} aria-label={['Lápiz','Flecha','Rectángulo','Texto'][index]} aria-pressed={activeTool===tool} className={activeTool===tool?'active':''} onClick={()=>setActiveTool(tool)}><Icon name={tool} size={17}/></button>)}{colors.map((color,index)=><button type="button" key={color} disabled={readonly||!webMetrics} className={`external-web-swatch ${activeColor===color?'active':''}`} style={{'--swatch':color}} aria-label={`Color ${index+1}`} aria-pressed={activeColor===color} onClick={()=>setActiveColor(color)}/>)}<button type="button" className="external-web-capture" disabled={readonly||capturing} onClick={capturePage}>{capturing?'Capturando…':'Capturar pestaña'}</button></div>}
    {loaded&&captureError&&<p className="external-web-capture-error" role="alert">{captureError}</p>}
    {loaded&&<small className={`external-web-bridge-status ${webMetrics?'connected':''}`} role="status">{webMetrics?'Documento conectado · las anotaciones siguen el desplazamiento de la página.':'Modo compatible · las herramientas de anotación se activan al instalar la integración Ronda en esta web.'} <a href="https://github.com/JT-Desing/ronda-review-platform/blob/feature/shared-review/docs/Ronda-web-review-bridge.md" target="_blank" rel="noopener noreferrer">Guía de integración ↗</a></small>}
  </div>;
}
