import React, {useEffect, useState} from 'react';
import first from './brand-preview-reference.png';
import second from './brand-preview-reference-2.png';

export default function BrandReferenceCarousel(){
  const [active,setActive]=useState(0),[paused,setPaused]=useState(false),[reduced,setReduced]=useState(false);
  useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(query.matches);update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update)},[]);
  useEffect(()=>{if(paused||reduced)return;const timer=setInterval(()=>{if(!document.hidden)setActive(index=>(index+1)%2)},7000);return()=>clearInterval(timer)},[active,paused,reduced]);
  return <div className="brand-reference-carousel" role="region" aria-label="Imágenes de referencia" aria-roledescription="carrusel">
    <div className="brand-reference-slides">{[first,second].map((src,index)=><img key={src} src={src} alt={index===0?'Composición abstracta monocromática de referencia':'Composición de cristal iridiscente de referencia'} className={`identity-reference ${index===active?'visible':''}`} aria-hidden={index!==active} draggable={false}/>)}</div>
    <button className="reference-arrow previous" type="button" aria-label="Imagen anterior" onClick={()=>setActive(index=>(index+1)%2)}>‹</button><button className="reference-arrow next" type="button" aria-label="Imagen siguiente" onClick={()=>setActive(index=>(index+1)%2)}>›</button>
    <div className="brand-reference-controls"><div className="brand-reference-dots" aria-label="Seleccionar imagen">{[0,1].map(index=><button key={index} type="button" aria-label={`Mostrar imagen ${index+1} de 2`} aria-pressed={active===index} onClick={()=>setActive(index)}><span/></button>)}</div><button className="brand-reference-pause" type="button" onClick={()=>setPaused(value=>!value)} disabled={reduced} aria-label={paused?'Reanudar carrusel':'Pausar carrusel'}>{reduced?'Manual':paused?'Reanudar':'Pausar'}</button></div>
    <div className="reference-social-footer"><div className="reference-social-icons social-reference-matched" aria-label="Iconos decorativos; 325 me gusta de ejemplo"><div className="reference-actions" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path d="M12 21s-9-5.7-9-12a5.3 5.3 0 0 1 9-3.8A5.3 5.3 0 0 1 21 9c0 6.3-9 12-9 12Z"/></svg><span>325</span>
      <svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 0-5 8l5 1-1-5a9 9 0 0 0 1-4Z"/></svg>
      <svg viewBox="0 0 24 24"><path d="M4 14V9a4 4 0 0 1 4-4h11m-4-4 4 4-4 4M20 10v5a4 4 0 0 1-4 4H5m4-4-4 4 4 4"/></svg>
      <svg viewBox="0 0 24 24"><path d="M21 3 3.9 3c-1.7 0-2.3 1.8-1 2.8L10 11l3.7 9.2c.6 1.4 2.4 1.4 3 0L23 5c.5-1.2-.5-2-2-2ZM10 11l11-7"/></svg>
      </div><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 3h14v18l-7-5-7 5Z"/></svg></div><p>Une identité, de nouvelles perspectives.</p></div>
  </div>;
}
