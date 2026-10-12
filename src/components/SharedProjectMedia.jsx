import React,{useEffect,useRef,useState} from 'react';
import {projectPath,reviewRequest,uploadFile} from '../state/sharedReviewApi.js';
import {SharedReviewRoom} from './SharedReviewRoom.jsx';
export function SharedProjectMedia({workspaceId,projectId,role,onDirtyChange,onNotify}){
  const [assets,setAssets]=useState([]),[selected,setSelected]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[refresh,setRefresh]=useState(0);
  const abort=useRef(null),generation=useRef(0),input=useRef(null),context={workspaceId,projectId};
  const lastUpload=useRef(null);
  useEffect(()=>{const token=++generation.current;setAssets([]);setSelected('');setError('');setBusy(false);abort.current?.abort();reviewRequest(projectPath(context)+'/assets').then(r=>{if(token===generation.current)setAssets(r.assets);}).catch(e=>{if(token===generation.current)setError(e.message);});return()=>{generation.current++;abort.current?.abort();};},[workspaceId,projectId,refresh]);
  async function add(file,key=crypto.randomUUID()){if(!file||busy)return;const token=generation.current;lastUpload.current={file,key};abort.current=new AbortController();setBusy(true);setError('');setProgress(0);onDirtyChange?.(true);try{const result=await uploadFile(context,file,key,setProgress,abort.current.signal);if(token===generation.current){lastUpload.current=null;setAssets(a=>a.some(item=>item.id===result.asset.id)?a:[...a,result.asset]);setSelected(result.asset.id);onNotify('Pieza compartida guardada');}}catch(e){if(token===generation.current&&e.name!=='AbortError')setError(e.message);}finally{if(token===generation.current){setBusy(false);onDirtyChange?.(false);}}}
  if(selected)return <SharedReviewRoom key={`${workspaceId}:${projectId}:${selected}`} workspaceId={workspaceId} projectId={projectId} assetId={selected} onBack={()=>setSelected('')} onDirtyChange={onDirtyChange} onNotify={onNotify}/>;
  return <section className="shared-project-media"><header><div><h3>Piezas del equipo</h3><p>Los miembros del espacio pueden revisar estos archivos.</p></div>{['admin','editor'].includes(role)&&<button className="primary-action" disabled={busy} onClick={()=>input.current?.click()}>Subir pieza</button>}</header>
    <input ref={input} type="file" hidden accept="image/png,image/jpeg,image/webp,video/mp4" onChange={e=>{add(e.target.files?.[0]);e.target.value='';}}/>
    {busy&&<p role="status">{progress<100?`Subiendo ${progress}%…`:'Finalizando versión…'}</p>}
    {error&&<p role="alert">{error} {lastUpload.current&&<button disabled={busy} onClick={()=>add(lastUpload.current.file,lastUpload.current.key)}>Reintentar carga</button>}<button onClick={()=>setRefresh(r=>r+1)}>Actualizar</button></p>}
    <div className="shared-asset-list">{assets.map(a=><button key={a.id} onClick={()=>setSelected(a.id)}><span>{a.kind==='video'?'Video':'Imagen'}</span><strong>{a.name}</strong><small>Abrir revisión →</small></button>)}</div>
    {!assets.length&&!busy&&<p className="shared-media-empty">Todavía no hay piezas compartidas. Los archivos privados no se copian aquí automáticamente.</p>}
    <small>Límites del prototipo: 100 MB por archivo · 2 GB por espacio. No corresponden al almacenamiento de los planes comerciales.</small>
  </section>;
}
