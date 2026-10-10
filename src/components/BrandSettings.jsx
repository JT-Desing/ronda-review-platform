import React, { useState } from 'react';
import { useRonda } from '../state/RondaContext.jsx';
import Icon from './Icon.jsx';
import './brand-personalization.css';
import BrandReferenceCarousel from './BrandReferenceCarousel.jsx';

export default function BrandSettings({onNotify}) {
  const {state,act}=useRonda();
  const baseline=state.workspace.branding||{name:'',logo:'',domain:''};
  const [draft,setDraft]=useState(baseline),[error,setError]=useState(''),[loading,setLoading]=useState(false);
  const dirty=JSON.stringify(draft)!==JSON.stringify(baseline);
  async function upload(file) {
    if(!file)return;
    setError('');
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>512*1024){setError('Usa PNG, JPG o WebP de hasta 512 KB.');return;}
    setLoading(true);
    try {
      const logo=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});
      await new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=reject;image.src=logo});
      setDraft(current=>({...current,logo}));
    }catch{setError('No se pudo leer la imagen. Selecciona otro archivo.');}finally{setLoading(false);}
  }
  function save(e){e.preventDefault();setError('');const domain=draft.domain.trim().toLowerCase();if(domain&&!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)){setError('Escribe un dominio sin https://, rutas ni puertos, por ejemplo revisiones.tuempresa.com.');return;}act('workspace/update',{branding:{...draft,name:draft.name.trim(),domain}});setDraft({...draft,name:draft.name.trim(),domain});onNotify('Identidad actualizada; consulta el estado de guardado de tu cuenta');}
  const name=draft.name||state.workspace.name;
  const avatar=<span className="identity-avatar">{draft.logo?<img src={draft.logo} alt="Logo de tu empresa"/>:name.slice(0,1).toUpperCase()}</span>;
  return <form className="dashboard-page brand-personalization" onSubmit={save}>
    <header className="dashboard-header"><div><span className="eyebrow">TU ESPACIO · TU IDENTIDAD</span><h1>Personalización</h1><p>Haz que tu marca se sienta en casa.</p></div></header>
    <div className="identity-layout"><div className="identity-fields">
      <section className="identity-section"><header><h2>Identidad de marca</h2><p>Define cómo aparece tu empresa en este espacio.</p></header>
        <label className="identity-field">Nombre comercial<input maxLength={80} placeholder="Nombre de tu empresa" value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
        <div className="identity-upload">{avatar}<div><strong>Logo de la empresa</strong><p>PNG, JPG o WebP · hasta 512 KB</p><div className="identity-upload-actions"><label className="identity-file-button"><Icon name="plus" size={16}/>{loading?'Leyendo…':'Subir logo'}<input aria-label="Subir logo de la empresa" type="file" accept="image/png,image/jpeg,image/webp" disabled={loading} onChange={e=>{upload(e.target.files[0]);e.target.value='';}}/></label>{draft.logo&&<button type="button" onClick={()=>setDraft({...draft,logo:''})}>Quitar</button>}</div></div></div>
        <p className="identity-helper">Usa una imagen cuadrada. Se aplicará en la navegación y en el avatar de tus previews sociales.</p>
      </section>
      <section className="identity-section identity-domain"><header><div><h2>Dominio personalizado</h2><p>Guarda la dirección que quieres conectar.</p></div><span className="identity-pending">Sin conectar</span></header>
        <label className="identity-field">Dominio deseado<input maxLength={253} placeholder="revisiones.tuempresa.com" value={draft.domain} onChange={e=>setDraft({...draft,domain:e.target.value})}/></label>
        <p className="identity-helper"><Icon name="alert" size={15}/> Requiere verificar propiedad, DNS y HTTPS. Guardar no activa el dominio ni cambia el túnel actual. No hay límites de plan implementados.</p>
      </section>
    </div><aside className="identity-preview" aria-label="Vista previa de identidad"><span className="eyebrow">VISTA PREVIA</span><h2>Así se verá tu marca</h2><p>Los cambios se reflejan aquí antes de guardar.</p><div className="identity-preview-nav">{avatar}<div><strong>{name}</strong><small>Espacio de trabajo</small></div></div><div className="identity-preview-social"><div>{avatar}<strong>{name}</strong><Icon name="more" size={18}/></div><BrandReferenceCarousel/></div><p className="identity-helper">Imágenes fijas de referencia. Cada publicación conserva su contenido y nombre específico.</p></aside></div>
    {error&&<p className="identity-error" role="alert">{error}</p>}
    <footer className="identity-savebar"><span role="status">{loading?'Leyendo logo…':dirty?'Cambios sin guardar':'Consulta el estado de guardado en la barra superior'}</span><div><button type="button" disabled={!dirty||loading} onClick={()=>{setDraft(baseline);setError('')}}>Descartar</button><button className="identity-save" disabled={!dirty||loading} type="submit"><Icon name="check" size={16}/>Guardar cambios</button></div></footer>
  </form>;
}
