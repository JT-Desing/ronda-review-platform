import {BrandLoader} from './BrandLoader.jsx';
import React,{useState} from 'react';
import './external-artifacts.css';
import {jsonRequest} from '../state/jsonRequest.js';
export function LinkImport({onAdd,disabled=false}){
  const [open,setOpen]=useState(false),[url,setUrl]=useState(''),[name,setName]=useState(''),[link,setLink]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  function cancel(){setOpen(false);setUrl('');setName('');setLink(null);setError('');}
  async function submit(e){e.preventDefault();setBusy(true);setError('');try{
    if(!link){const data=await jsonRequest('/api/links/inspect',{method:'POST',timeoutMs:15000,headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});setLink(data);setName(data.name.slice(0,100));}
    else{await onAdd({...link,name:name.trim()});setOpen(false);setUrl('');setLink(null);setName('');}
  }catch(reason){setError(reason.message);}finally{setBusy(false);}}
  return <div className="link-import"><button type="button" onClick={()=>setOpen(v=>!v)} disabled={busy||disabled} aria-expanded={open}>＋ Agregar enlace</button>{open&&<form onSubmit={submit}>
    <label>URL pública HTTPS<input type="url" required maxLength={2048} value={url} disabled={busy} onChange={e=>{setUrl(e.target.value);setLink(null);}} placeholder="https://…"/></label>
    <small>Consultaremos el tipo de contenido. Al abrirlo, el proveedor externo recibirá la conexión de tu navegador. No pegues credenciales ni enlaces privados de acceso temporal.</small>
    {link&&<><p>Detectado: <strong>{{image:'Imagen',video:'Video',web:'Página / artefacto web'}[link.type]}</strong></p><label>Nombre de la pieza<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label><small>Se guarda el enlace, no una copia. Su contenido puede cambiar o dejar de estar disponible.</small></>}
    {error&&<p role="alert">{error}</p>}<div><button type="submit" disabled={busy||!!link&&!name.trim()}>{busy?<BrandLoader size="inline" label="Procesando…"/>:link?'Agregar a la revisión':'Identificar contenido'}</button><button type="button" disabled={busy} onClick={cancel}>Cancelar</button></div>
  </form>}</div>;
}
