import {BrandLoader} from './BrandLoader.jsx';
import {RetryableFeature} from './FeatureLoadBoundary.jsx';
import React, { useEffect, useRef, useState } from 'react';
const loadPdfReview=()=>import('./PdfReview.jsx').then(module=>({default:module.PdfReview}));

export function DocumentReview({media,page,setPage,onComment,renderAnnotations,renderToolbar,onHtmlHeightChange}){
  const [html,setHtml]=useState('');const [error,setError]=useState('');
  const [drawing,setDrawing]=useState(false);
  const [htmlHeight,setHtmlHeight]=useState(3000);
  const htmlFrame=useRef(null);
  useEffect(()=>{if(media.type==='html')setDrawing(true)},[media.url,media.type]);
  useEffect(()=>{let active=true;setError('');setHtml('');if(media.type==='html')fetch(media.url).then(r=>r.text()).then(text=>{if(active)setHtml(`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; form-action 'none'; base-uri 'none'">${text}`)}).catch(()=>{if(active)setError('No se pudo abrir el HTML')});return()=>{active=false}},[media.url,media.type]);
  useEffect(()=>{
    setHtmlHeight(3000);
    const frame=htmlFrame.current;
    if(media.type!=='html'||!html||!frame)return;
    let active=true,observer,frameId;
    const measure=()=>{
      try{
        const doc=frame.contentDocument;
        if(!doc)return;
        const body=doc.body,root=doc.documentElement;
        const height=Math.max(root?.scrollHeight||0,root?.offsetHeight||0,body?.scrollHeight||0,body?.offsetHeight||0);
        if(active&&height>0){const measured=Math.min(60000,Math.max(1000,Math.ceil(height)));setHtmlHeight(measured);onHtmlHeightChange?.(measured);}
      }catch{/* A browser policy may prevent measurement; retain the safe fallback canvas. */}
    };
    const onLoad=()=>{
      measure();
      try{
        const doc=frame.contentDocument;
        if(doc?.documentElement&&'ResizeObserver'in window){observer=new ResizeObserver(measure);observer.observe(doc.documentElement);if(doc.body)observer.observe(doc.body);}
      }catch{/* Keep the fallback height if the isolated document cannot be inspected. */}
    };
    frame.addEventListener('load',onLoad);
    if(frame.contentDocument?.readyState==='complete')onLoad();
    frameId=requestAnimationFrame(measure);
    return()=>{active=false;frame.removeEventListener('load',onLoad);observer?.disconnect();cancelAnimationFrame(frameId)};
  },[html,media.type,media.url,onHtmlHeightChange]);
  if(media.type==='pdf')return <RetryableFeature load={loadPdfReview} retryView="review" retryMedia={media} message="No se pudo cargar el visor PDF. Comprueba tu conexión y vuelve a intentarlo." loadingFallback={<section className="document-review"><BrandLoader label="Cargando visor PDF…"/></section>} media={media} page={page} setPage={setPage} onComment={onComment} renderAnnotations={renderAnnotations}/>;
  return <section className="document-review"><header><strong>{media.name}</strong><button className="document-draw-toggle" aria-pressed={drawing} onClick={()=>setDrawing(value=>!value)}>{drawing?'Navegar documento':'Anotar sobre la vista'}</button>{renderToolbar?.(drawing)}</header><div className="document-scroll"><div className="document-sheet html-sheet" style={media.type==='html'?{height:htmlHeight}:undefined}>{media.type==='html'?error?<p role="alert">{error}</p>:html?<iframe ref={htmlFrame} title={`HTML aislado: ${media.name}`} sandbox="allow-same-origin" srcDoc={html}/>:<BrandLoader label="Cargando documento…"/>:<div className="document-unavailable"><h3>{media.type==='presentation'?'Presentación':'Documento'} listo para organizar</h3><p>La conversión de {media.extension} a páginas todavía no está conectada. Exporta a PDF y súbelo para revisar el contenido visualmente. Puedes dejar comentarios generales sobre este archivo.</p><a href={media.url} download={media.name}>Descargar original</a></div>}{renderAnnotations?.(drawing)}</div></div><small>{media.type==='html'?`Vista completa del documento · ancho 1000 px · ${htmlHeight.toLocaleString('es-CO')} px de alto. Scripts y red bloqueados.`:''}</small></section>;
}
