import React,{useEffect,useRef,useState} from 'react';
import {ReviewLoading} from './ReviewLoading.jsx';
import {projectPath,reviewRequest,reviewSend,uploadFile} from '../state/sharedReviewApi.js';
import {SharedReviewRoom} from './SharedReviewRoom.jsx';
import {SharedDeliveryGrid} from './SharedDeliveryGrid.jsx';
export function SharedProjectMedia({workspaceId,projectId,role,onDirtyChange,onNotify,projectName,onExitProject}){
  const [assets,setAssets]=useState([]),[trash,setTrash]=useState([]),[selected,setSelected]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[refresh,setRefresh]=useState(0),[loading,setLoading]=useState(true);
  const abort=useRef(null),generation=useRef(0),input=useRef(null),reviewDirty=useRef(false),operation=useRef(false);
  const context={workspaceId,projectId},canManage=['admin','editor'].includes(role),path=projectPath(context);
  const loadAssets=()=>Promise.all([reviewRequest(path+'/assets'),canManage?reviewRequest(path+'/assets/trash'):Promise.resolve({assets:[]})]);
  useEffect(()=>{
    const token=++generation.current;setLoading(true);setAssets([]);setTrash([]);setSelected('');setError('');setBusy(false);operation.current=false;reviewDirty.current=false;abort.current?.abort();
    loadAssets().then(([active,deleted])=>{if(token===generation.current){setAssets(active.assets);setTrash(deleted.assets);setSelected(active.assets[0]?.id||'');}}).catch(e=>{if(token===generation.current)setError(e.message);}).finally(()=>{if(token===generation.current)setLoading(false);});
    return()=>{generation.current++;abort.current?.abort();};
  },[workspaceId,projectId,role,refresh]);
  async function mutate(action,success){
    if(operation.current)return false;
    if(reviewDirty.current){setError('Publica o descarta el borrador antes de modificar la entrega.');return false;}
    const token=generation.current;operation.current=true;setBusy(true);setError('');setProgress(0);onDirtyChange?.(true);
    try{await action();if(token!==generation.current)return false;const [active,deleted]=await loadAssets();if(token!==generation.current)return false;setAssets(active.assets);setTrash(deleted.assets);setSelected(current=>active.assets.some(a=>a.id===current)?current:active.assets[0]?.id||'');onNotify?.(success);return true;}
    catch(e){if(token===generation.current)setError(e.message);return false;}
    finally{if(token===generation.current){operation.current=false;setBusy(false);onDirtyChange?.(false);}}
  }
  const add=async file=>{if(!file)return;await mutate(async()=>{abort.current=new AbortController();const result=await uploadFile(context,file,crypto.randomUUID(),setProgress,abort.current.signal);if(!abort.current.signal.aborted)setSelected(result.asset.id);},'Pieza compartida guardada');};
  const deliveryGrid=<><SharedDeliveryGrid assets={assets} trash={trash} workspaceId={workspaceId} projectName={projectName} role={role} selected={selected} busy={busy} error={error} progress={progress}
    onSelect={id=>{if(id!==selected&&(!reviewDirty.current||window.confirm('Hay cambios sin publicar. ¿Descartarlos?')))setSelected(id);}}
    onOrder={order=>mutate(()=>reviewSend(path+'/assets/order','PUT',{order,previousOrder:assets.map(a=>a.id)}),'Orden guardado para el equipo')}
    onTrash={asset=>mutate(()=>reviewSend(path+'/assets/'+asset.id+'/trash','POST',{revision:asset.revision}),'Pieza movida a la papelera')}
    onRestore={asset=>mutate(()=>reviewSend(path+'/assets/'+asset.id+'/restore','POST',{revision:asset.revision}),'Pieza restaurada')}
    onUpload={()=>input.current?.click()}
    onRefresh={()=>{if(!operation.current&&!reviewDirty.current)setRefresh(value=>value+1);}}
    onLink={async link=>{const ok=await mutate(async()=>{const data=await reviewSend(path+'/assets','POST',{url:link.url,name:link.name,requestId:crypto.randomUUID()});setSelected(data.asset.id);},'Enlace guardado en el equipo');if(!ok)throw new Error('No se pudo agregar el enlace. Revisa el aviso de la entrega.');}}/>
    <input ref={input} type="file" hidden accept="image/png,image/jpeg,image/webp,video/mp4" onChange={e=>{add(e.target.files?.[0]);e.target.value='';}}/></>;
  if(loading)return <section className="shared-media-opening"><ReviewLoading/></section>;
  if(error&&!assets.length&&!trash.length)return <section className="shared-media-opening"><p role="alert">{error}</p><button onClick={()=>setRefresh(r=>r+1)}>Reintentar</button></section>;
  if(selected)return <SharedReviewRoom key={workspaceId+':'+projectId+':'+selected} workspaceId={workspaceId} projectId={projectId} assetId={selected} projectName={projectName} deliveryGrid={deliveryGrid} onBack={()=>{if(onExitProject)onExitProject();else setSelected('');}} onDirtyChange={dirty=>{reviewDirty.current=dirty;onDirtyChange?.(dirty);}} onNotify={onNotify}/>;
  return <section className="shared-project-media">{deliveryGrid}</section>;
}
