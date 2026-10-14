import React,{useState} from 'react';
import Icon from './Icon.jsx';
import {sharedProjectLink} from '../domain/shared-project-link.js';
export function ShareProjectButton({workspaceId,projectId}){
 const [open,setOpen]=useState(false),[copied,setCopied]=useState(false);
 const url=sharedProjectLink(location.origin,workspaceId,projectId);
 return <><button className="secondary share-project-trigger" onClick={()=>{setOpen(true);setCopied(false);}}><Icon name="share" size={17}/><span>Compartir</span></button>{open&&<div className="modal-layer"><button className="modal-scrim" aria-label="Cerrar compartir proyecto" onClick={()=>setOpen(false)}/><section className="modal project-share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-project-title" onKeyDown={e=>{if(e.key==='Escape')setOpen(false);}}><h2 id="share-project-title">Compartir proyecto</h2><p>Este enlace abre directamente la parrilla de piezas del proyecto.</p><label>Enlace del proyecto<input autoFocus readOnly value={url} onFocus={e=>e.target.select()}/></label><small>Solo pueden entrar las personas que inicien sesión y pertenezcan al equipo. Compartir el enlace no concede permisos.</small><footer><button onClick={()=>setOpen(false)}>Cerrar</button><button onClick={async()=>{try{await navigator.clipboard.writeText(url);setCopied(true);}catch{setCopied(false);}}}>{copied?'Enlace copiado':'Copiar enlace'}</button></footer><span role="status">{copied?'Listo para enviarlo a tu equipo.':''}</span></section></div>}</>;
}
