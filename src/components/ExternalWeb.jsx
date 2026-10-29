import React,{useState,useEffect,useRef} from 'react';
import {AnnotationLayer} from './AnnotationLayer.jsx';
import Icon from './Icon.jsx';
import {documentMarkToViewport,normalizeWebReviewMetrics,selectionToDocumentMark,viewportMarkToDocument} from '../domain/web-review-bridge.js';
import {iframeCaptureRect} from '../domain/web-capture.js';
import './external-artifacts.css';
import './external-web-pin.css';

export function ExternalWeb({url,name,activeTool='',setActiveTool=()=>{},activeColor='#b89be8',setActiveColor=()=>{},marks=[],setMarks=()=>{},selectedFigure,onFigure=()=>{},onQuickComment,figureComments=[],readonly=false}){
  const [loaded,setLoaded]=useState(false),[fullscreen,setFullscreen]=useState(false),[capturing,setCapturing]=useState(false),[captureError,setCaptureError]=useState(''),[commentMark,setCommentMark]=useState(null),[commentDraft,setCommentDraft]=useState(''),[commentBusy,setCommentBusy]=useState(false),[webMetrics,setWebMetrics]=useState(null),[textSelectionMode,setTextSelectionMode]=useState(false),[extensionConnected,setExtensionConnected]=useState(false),[extensionInstalled,setExtensionInstalled]=useState(false);
  const holder=useRef(null),iframe=useRef(null),bridgeNonce=useRef(crypto.randomUUID());
  useEffect(()=>{setLoaded(false);setActiveTool('');setCommentMark(null);setCommentDraft('');setWebMetrics(null);setTextSelectionMode(false);setExtensionConnected(false);bridgeNonce.current=crypto.randomUUID();},[url]);
  useEffect(()=>{
    const receive=event=>{if(event.source===window&&event.origin===window.location.origin&&event.data?.type==='ronda:web-review:extension-installed')setExtensionInstalled(true)};
    window.addEventListener('message',receive);
    window.postMessage({type:'ronda:web-review:check-extension'},window.location.origin);
    return()=>window.removeEventListener('message',receive);
  },[]);
  useEffect(()=>{const update=()=>setFullscreen(document.fullscreenElement===holder.current);document.addEventListener('fullscreenchange',update);return()=>document.removeEventListener('fullscreenchange',update);},[]);
  let safe;try{const parsed=new URL(url);safe=parsed.protocol==='https:'&&!parsed.username&&!parsed.password&&parsed.origin!==window.location.origin?parsed.href:null;}catch{}
  if(!safe)return <p role="alert">Enlace externo no válido.</p>;
  const webHost=new URL(safe).hostname.replace(/^www\./,'');
  const colors=['#ff725e','#f2bd5c','#8ebd72','#67a9d4','#b89be8','#f1eee7'];
  const hasDocumentBridge=Boolean(webMetrics);
  const legacyMarks=marks.filter(mark=>mark.coordinateSpace!=='document');
  // Viewport-only marks have no saved scroll offset. Rendering them over a live
  // page would make them appear attached to the screen, not to the document.
  const viewportMarks=marks.filter(mark=>mark.coordinateSpace==='document').map(mark=>documentMarkToViewport(mark,webMetrics));
  const commentMarkViewport=commentMark?documentMarkToViewport(commentMark,webMetrics):null;
  const undoDraftAnnotation=()=>{setMarks(current=>current.filter(mark=>!mark.draft));setCommentMark(null);setCommentDraft('')};
  useEffect(()=>{
    const undo=e=>{if(e.defaultPrevented||readonly||!(e.ctrlKey||e.metaKey)||e.key.toLowerCase()!=='z'||!marks.some(mark=>mark.draft))return;e.preventDefault();undoDraftAnnotation();};
    window.addEventListener('keydown',undo);return()=>window.removeEventListener('keydown',undo);
  },[marks,readonly]);
  useEffect(()=>{
    const receive=event=>{
      if(event.source!==iframe.current?.contentWindow||event.origin!=='null')return;
      if(event.data?.type==='ronda:web-review:extension-ready'){
        setExtensionConnected(true);
        // The sandboxed iframe has an opaque origin, so '*' is the only valid target.
        iframe.current?.contentWindow?.postMessage({type:'ronda:web-review:init',nonce:bridgeNonce.current},'*'); // NOSONAR
        return;
      }
      if(event.data?.nonce!==bridgeNonce.current)return;
      if(event.data?.type==='ronda:web-review:viewport'){
        const metrics=normalizeWebReviewMetrics(event.data);if(metrics)setWebMetrics(metrics);
      }
      if(event.data?.type==='ronda:web-review:selection'&&textSelectionMode&&!readonly){
        const metrics=normalizeWebReviewMetrics(event.data.metrics)||webMetrics;
        const mark=selectionToDocumentMark(event.data,metrics,activeColor);
        if(mark){setTextSelectionMode(false);setMarks(current=>[...current,mark]);openComment(mark,`“${mark.textQuote}”\n\n`);}
      }
    };
    window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);
  },[url,textSelectionMode,readonly,webMetrics,activeColor,marks,onFigure,setMarks]);
  const startBridge=()=>iframe.current?.contentWindow?.postMessage({type:'ronda:web-review:init',nonce:bridgeNonce.current},'*'); // NOSONAR: opaque-origin sandboxed iframe
  const saveViewportMarks=next=>{
    if(!hasDocumentBridge)return;
    const visible=typeof next==='function'?next(viewportMarks):next;
    const originalById=new Map(marks.map(mark=>[mark.id,mark]));
    setMarks(visible.map(mark=>originalById.has(mark.id)?originalById.get(mark.id):viewportMarkToDocument(mark,webMetrics)));
  };
  const openComment=(mark,initialDraft='')=>{setCommentMark(mark);setCommentDraft(initialDraft);onFigure(mark,{openComments:false})};
  const publishQuickComment=async event=>{event.preventDefault();if(!commentMark||!commentDraft.trim()||!onQuickComment||commentBusy)return;setCommentBusy(true);try{const published=await onQuickComment(commentMark,commentDraft.trim());if(published!==false){setCommentMark(null);setCommentDraft('')}}finally{setCommentBusy(false)}};
  const toggleFullscreen=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await holder.current?.requestFullscreen?.();}catch{}}
  const connectExtension=()=>{
    window.postMessage({type:'ronda:web-review:open-connection'},window.location.origin);
    setCaptureError('Se abrió el panel de Ronda. Confirma el acceso solo para este dominio; si el panel no aparece, abre el icono de la extensión.');
  };
  const extensionStoreUrl=import.meta.env.VITE_RONDA_EXTENSION_STORE_URL||'';
  const capturePage=async()=>{
    if(!navigator.mediaDevices?.getDisplayMedia){setCaptureError('Este navegador no permite capturar una pestaña. Puedes usar una captura de pantalla y subirla al proyecto.');return;}
    if(!window.confirm('Desplaza la página hasta la zona que quieres revisar. En el selector, comparte esta pestaña de Ronda: recortaremos únicamente el área de la web visible y la guardaremos como una imagen del proyecto. Las anotaciones quedarán fijadas a esa captura. Para otra zona, repite después de desplazarte. ¿Continuar?'))return;
    let stream;
    setCapturing(true);setCaptureError('');
    try{
      stream=await navigator.mediaDevices.getDisplayMedia({video:{displaySurface:'browser'},audio:false,preferCurrentTab:true});
      const track=stream.getVideoTracks()[0];
      if(!track)throw new Error('No se recibió la pestaña seleccionada.');
      const frame=await new Promise((resolve,reject)=>{
        const video=document.createElement('video');video.muted=true;video.playsInline=true;video.srcObject=stream;
        const timeout=setTimeout(()=>reject(new Error('La captura tardó demasiado. Inténtalo de nuevo.')),8000);
        video.onloadedmetadata=async()=>{try{await video.play();const draw=()=>{if(video.videoWidth&&video.videoHeight){clearTimeout(timeout);resolve({video,width:video.videoWidth,height:video.videoHeight});}else requestAnimationFrame(draw);};draw();}catch(error){clearTimeout(timeout);reject(error);}};
        video.onerror=()=>{clearTimeout(timeout);reject(new Error('No se pudo leer la pestaña seleccionada.'))};
      });
      const bounds=iframe.current?.getBoundingClientRect();
      const crop=iframeCaptureRect(frame.width,frame.height,window.innerWidth,window.innerHeight,bounds);
      if(!crop)throw new Error('La web no está visible para capturar. Desplázate a una zona visible e inténtalo de nuevo.');
      const canvas=document.createElement('canvas');canvas.width=crop.width;canvas.height=crop.height;
      canvas.getContext('2d').drawImage(frame.video,crop.x,crop.y,crop.width,crop.height,0,0,crop.width,crop.height);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      if(!blob)throw new Error('No se pudo generar la captura.');
      const file=new File([blob],`${(name||'pagina-web').replace(/[^a-z0-9_-]+/gi,'-').slice(0,64)}-captura.png`,{type:'image/png'});
      window.dispatchEvent(new CustomEvent('ronda:web-capture',{detail:{file,tool:hasDocumentBridge?'':activeTool,color:activeColor}}));
    }catch(error){if(error?.name!=='NotAllowedError')setCaptureError(error?.message||'No se pudo capturar la pestaña.');}
    finally{stream?.getTracks().forEach(track=>track.stop());setCapturing(false);}
  };
  return <div className="external-web" ref={holder}>
    <header className="external-web-header"><div className="external-web-header-meta"><span className="external-web-header-mark"><Icon name="link" size={18}/></span><div className="external-web-header-copy"><span>ARTEFACTO WEB</span><strong title={name||webHost}>{name||'Página externa'}</strong><small>{webHost} · contenido en vivo</small></div></div><div className="external-web-header-actions"><button type="button" className="external-web-fullscreen" onClick={toggleFullscreen}><Icon name="maximize" size={15}/>{fullscreen?'Salir de pantalla completa':'Ampliar visor'}</button><a className="external-web-open" href={safe} target="_blank" rel="noopener noreferrer">Abrir original ↗</a></div></header>
    <div className={`external-web-frame-notice ${loaded?'is-live':'is-preload'}`} role="note">{!loaded&&<Icon name="link" size={15}/>}<span>{textSelectionMode?'Selecciona el texto directamente en la web; Ronda fijará el resaltado y el comentario a esa posición.':hasDocumentBridge&&activeTool?'Dibuja sobre la vista actual. Para desplazarte por la página, elige Navegar.':hasDocumentBridge?'Vista en vivo conectada · las anotaciones se guardan en coordenadas del documento.':activeTool?`Herramienta preparada: ${['pen','arrow','square','type'].includes(activeTool)?['Lápiz','Flecha','Rectángulo','Texto'][['pen','arrow','square','type'].indexOf(activeTool)]:'anotación'}. Conecta el dominio para fijar las marcas a la página viva; también puedes capturar esta vista.`:'La vista integrada depende de las políticas del sitio. Carga el enlace para recorrerlo; las herramientas de captura estarán disponibles después.'}</span></div>
    {loaded&&!hasDocumentBridge&&<div className="external-web-extension-setup" role="region" aria-label="Conectar anotaciones en vivo">
      <span>{extensionInstalled?'La extensión está instalada. Autoriza únicamente el dominio de esta web para activar las anotaciones en vivo.':'Para anotar directamente sobre esta página y mantener las marcas ancladas, instala la extensión de Ronda. Es opcional para el resto de Ronda.'}</span>
      {extensionInstalled?<button type="button" onClick={connectExtension}>Conectar este sitio</button>:extensionStoreUrl?<><a className="external-web-extension-install" href={extensionStoreUrl} target="_blank" rel="noopener noreferrer">Instalar extensión</a><button type="button" className="external-web-extension-refresh" onClick={()=>window.location.reload()}>Ya la instalé · continuar</button></>:<span className="external-web-extension-pending">Extensión en preparación para Chrome Web Store</span>}
    </div>}
    {legacyMarks.length>0&&<p className="external-web-capture-error" role="status">{legacyMarks.length} anotación{legacyMarks.length===1?' antigua no tiene':'es antiguas no tienen'} guardado el desplazamiento original. Se conserva{legacyMarks.length===1?'':'n'} en los comentarios, pero no se dibuja{legacyMarks.length===1?'':'n'} sobre esta página para evitar que aparezca{legacyMarks.length===1?'':'n'} en un lugar incorrecto.</p>}
    {loaded?<div className={`external-web-viewport ${textSelectionMode?'text-selection-mode':''}`}>
      <iframe ref={iframe} title={name||'Artefacto web en revisión'} src={safe} onLoad={startBridge} sandbox="allow-scripts" referrerPolicy="no-referrer" allow="fullscreen" style={{pointerEvents:activeTool&&hasDocumentBridge&&!textSelectionMode?'none':'auto'}}/>
      <AnnotationLayer activeTool={readonly||!hasDocumentBridge?'':activeTool} activeColor={activeColor} marks={viewportMarks} setMarks={saveViewportMarks} selectedFigure={selectedFigure} onAnnotationCreated={mark=>{if(hasDocumentBridge)openComment(viewportMarkToDocument(mark,webMetrics))}}/>
      {viewportMarks.flatMap(mark=>(mark.selectionRects||[]).map((rect,index)=><span key={`${mark.id||'selection'}-${index}`} className="figure-selection-highlight" aria-hidden="true" style={{left:`${rect.x*100}%`,top:`${rect.y*100}%`,width:`${rect.width*100}%`,height:`${rect.height*100}%`}}/>))}
      {viewportMarks.filter(mark=>mark.points?.[0]).map((mark,index)=><button type="button" key={mark.id||index} className={`figure-pin ${selectedFigure===mark.id?'selected':''}`} style={{left:`${mark.points[0].x*100}%`,top:`${mark.points[0].y*100}%`}} aria-label={`Anotación ${index+1}, ${figureComments.filter(comment=>comment.annotationId===mark.id).length} comentarios`} onClick={()=>openComment(mark)}>{index+1}</button>)}
      {commentMarkViewport&&<form className="external-web-comment-popover" role="dialog" aria-label="Comentario en la anotación" style={{'--anchor-x':`${commentMarkViewport.points[0].x*100}%`,'--anchor-y':`${commentMarkViewport.points[0].y*100}%`}} onSubmit={publishQuickComment} onKeyDown={event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();event.stopPropagation();undoDraftAnnotation();return;}if(event.key==='Escape'){event.preventDefault();setCommentMark(null);setCommentDraft('')}if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();event.currentTarget.requestSubmit()}}}>
        <header><span className="external-web-comment-avatar">Tú</span><strong>Deja un comentario</strong><button type="button" aria-label="Cerrar comentario" onClick={()=>{setCommentMark(null);setCommentDraft('')}}>×</button></header>
        {figureComments.filter(comment=>comment.annotationId===commentMark.id).slice(-2).map(comment=><p className="external-web-comment-existing" key={comment.id}>{comment.text}</p>)}
        <textarea autoFocus maxLength={2000} aria-label="Escribe un comentario para esta anotación" placeholder="Añade contexto sobre este punto…" value={commentDraft} onChange={event=>setCommentDraft(event.target.value)}/>
        <footer><span>Ctrl/⌘ + Enter para publicar · Esc para cerrar</span><button type="submit" disabled={readonly||commentBusy||!commentDraft.trim()||!onQuickComment}>{commentBusy?'Publicando…':'Publicar'}</button></footer>
      </form>}
    </div>:<div className="external-web-consent"><section className="external-web-consent-card" aria-labelledby="external-web-consent-title"><span className="external-web-consent-icon"><Icon name="link" size={23}/></span><span className="external-web-consent-kicker">LISTO PARA REVISAR</span><h2 id="external-web-consent-title">Prepara esta página para revisarla</h2><p>Carga el enlace para abrirlo aquí y desplazarte hasta el detalle que quieres comentar. Si el sitio limita la vista integrada, abre el original desde la barra superior.</p><div className="external-web-consent-source"><Icon name="link" size={15}/><span>{webHost}</span><span>Enlace externo</span></div><div className="external-web-actions"><button type="button" className="external-web-load" onClick={()=>setLoaded(true)}><Icon name="maximize" size={16}/>Cargar en el visor</button></div><small className="external-web-consent-hint">Al cargarla, podrás capturar la vista desde las herramientas de anotación.</small>{captureError&&<small role="alert">{captureError}</small>}</section></div>}
    {loaded&&<div className="external-web-annotation-toolbar" aria-label="Herramientas de anotación web">
      <button type="button" aria-pressed={!activeTool&&!textSelectionMode} className={!activeTool&&!textSelectionMode?'active':''} onClick={()=>{setTextSelectionMode(false);setActiveTool('')}}>Navegar</button>
      {hasDocumentBridge&&<button type="button" className={`external-web-select-text ${textSelectionMode?'active':''}`} disabled={readonly||!extensionConnected} title={extensionConnected?'Seleccionar texto de la web':'El puente del documento no está conectado'} aria-pressed={textSelectionMode} onClick={()=>{setActiveTool('');setTextSelectionMode(value=>!value)}}><Icon name="type" size={17}/>Seleccionar texto</button>}
      {['pen','arrow','square','type'].map((tool,index)=><button type="button" key={tool} disabled={readonly} title={['Lápiz','Flecha','Rectángulo','Texto'][index]} aria-label={['Lápiz','Flecha','Rectángulo','Texto'][index]} aria-pressed={activeTool===tool} className={activeTool===tool?'active':''} onClick={()=>{setTextSelectionMode(false);setActiveTool(tool)}}><Icon name={tool} size={17}/></button>)}
      {colors.map((color,index)=><button type="button" key={color} disabled={readonly} className={`external-web-swatch ${activeColor===color?'active':''}`} style={{'--swatch':color}} aria-label={`Color ${index+1}`} aria-pressed={activeColor===color} onClick={()=>setActiveColor(color)}/>)}
      {!hasDocumentBridge&&<span className="external-web-tool-hint">{activeTool?`Listo para anotar con ${['pen','arrow','square','type'].includes(activeTool)?['Lápiz','Flecha','Rectángulo','Texto'][['pen','arrow','square','type'].indexOf(activeTool)]:'la herramienta seleccionada'}. Captura esta zona para continuar.`:'Elige una herramienta y captura la zona visible para anotarla sin que se mueva.'}</span>}
      <button type="button" className="external-web-capture" disabled={readonly||capturing} onClick={capturePage}>{capturing?'Preparando…':'Capturar vista para anotar'}</button>
    </div>}
    {loaded&&captureError&&<p className="external-web-capture-error" role="alert">{captureError}</p>}
    {loaded&&<small className={`external-web-bridge-status ${webMetrics?'connected':''}`} role="status">{webMetrics?'Desplazamiento del documento sincronizado. Las nuevas anotaciones siguen el scroll.':'Modo navegación: desplaza la página a la zona deseada y captura esta pestaña. Ronda guardará solo la vista web como pieza para anotar.'}</small>}
  </div>;
}
