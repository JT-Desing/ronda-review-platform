import React,{useEffect,useRef,useState} from 'react';
import Icon from './Icon.jsx';
import './share-review.css';

export default function ShareReviewDialog({onClose,onNotify,reviewUrl}){
  const dialog=useRef(null),[status,setStatus]=useState('idle');
  useEffect(()=>{
    const previous=document.activeElement;
    dialog.current?.querySelector('button')?.focus();
    const key=e=>{
      if(e.key==='Escape'){e.preventDefault();onClose();return}
      if(e.key!=='Tab')return;
      const focusable=[...dialog.current.querySelectorAll('button:not(:disabled),input:not(:disabled)')];
      const first=focusable[0],last=focusable.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
    };
    const el=dialog.current;el.addEventListener('keydown',key);
    return()=>{el.removeEventListener('keydown',key);previous?.focus()};
  },[onClose]);
  const copy=async()=>{setStatus('copying');try{await navigator.clipboard.writeText(reviewUrl);setStatus('copied');onNotify('Enlace copiado')}catch{setStatus('error');dialog.current.querySelector('input').select()}};
  return <div className="modal-layer share-layer"><button className="modal-scrim" aria-label="Cerrar enlace de revisión" onClick={onClose}/>
    <section ref={dialog} className="modal share-review-modal" role="dialog" aria-modal="true" aria-labelledby="share-title" aria-describedby="share-description">
      <header className="share-review-heading"><span className="share-symbol"><Icon name="link" size={24}/></span><button className="share-close" aria-label="Cerrar" onClick={onClose}><Icon name="x" size={18}/></button></header>
      <span className="eyebrow">ENLACE DE REVISIÓN</span><h2 id="share-title">Una revisión, a un enlace.</h2>
      <p id="share-description">Copia la dirección para volver a esta revisión.</p>
      <label className="share-link-label">Dirección de la revisión<div className="share-link-field"><Icon name="link" size={16}/><input aria-label="Dirección de la revisión" readOnly value={reviewUrl} onFocus={e=>e.target.select()}/></div></label>
      <div className="share-access-note"><Icon name="alert" size={16}/><p><strong>Acceso público aún no disponible</strong>Este enlace no concede acceso a tus archivos privados. El destinatario necesita una sesión y permisos; no habilita comentarios de invitados.</p></div>
      <div className="share-future-options"><div><span><strong>Comentarios de invitados</strong><small>Disponible al conectar enlaces públicos</small></span><span className="share-pending">Próximamente</span></div><div><span><strong>Descarga de originales</strong><small>Los permisos no se cambian desde este panel</small></span><span className="share-pending">Próximamente</span></div></div>
      <footer><button className={`share-copy ${status==='copied'?'copied':''}`} disabled={status==='copying'} onClick={copy}><Icon name={status==='copied'?'check':'link'} size={17}/>{status==='copied'?'Enlace copiado':status==='copying'?'Copiando…':'Copiar enlace de revisión'}</button><span role="status">{status==='error'?'No se pudo copiar. El enlace está seleccionado para copiarlo manualmente.':status==='copied'?'Listo para pegar. Los permisos permanecen sin cambios.':'Tus archivos siguen siendo privados.'}</span></footer>
    </section>
  </div>;
}
