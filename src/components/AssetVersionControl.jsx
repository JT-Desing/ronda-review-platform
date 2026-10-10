import React,{useState,useRef,useEffect} from 'react';
import {useRonda} from '../state/RondaContext.jsx';
import {versionsForAsset} from '../domain/asset-versions.js';
import {fileStore,fileKind} from './DeliveryGrid.jsx';

export default function AssetVersionControl({media,onSelect,onNotify}){
  const {state,act}=useRonda();const [busy,setBusy]=useState(false);
  const request=useRef(0),live=useRef(true),currentAsset=useRef(media?.id);currentAsset.current=media?.id;
  useEffect(()=>{live.current=true;return()=>{live.current=false;request.current++}},[]);
  useEffect(()=>{request.current++;setBusy(false)},[media?.id]);
  const asset=state.assets?.find(item=>item.id===media?.id);
  if(!asset)return <span className="version-select">V3 · Referencia</span>;
  const versions=versionsForAsset(state,asset.id);
  const selected=media.versionId||`asset-${asset.id}-v1`;
  const open=async version=>{
    if(!version)return;const token=++request.current;const originalId=asset.id;
    setBusy(true);
    try{const file=await fileStore(version.fileId||asset.id);if(!live.current||token!==request.current||currentAsset.current!==originalId)return;onSelect({...asset,...(version.fileId?{name:version.name,type:version.type,mime:version.mime,size:version.size}:{}),versionId:version.id,versionNumber:version.number,identity:version.fileId||asset.id,url:URL.createObjectURL(file)});}catch(error){if(live.current&&token===request.current)onNotify(error.message||'No se pudo abrir la versión. La revisión actual no cambió.');}finally{if(live.current&&token===request.current)setBusy(false);}
  };
  const upload=async event=>{
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    if(fileKind(file)!==asset.type){onNotify('La nueva versión debe tener el mismo tipo de medio que la pieza.');return;}
    const token=++request.current;const originalId=asset.id;
    setBusy(true);
    try{
      const fileId=crypto.randomUUID();await fileStore(fileId,file);
      if(!live.current||token!==request.current||currentAsset.current!==originalId)return;
      const number=Math.max(0,...versions.map(v=>v.number))+1;
      const payload={assetId:asset.id,fileId,name:file.name,type:asset.type,mime:file.type,size:file.size};
      act('asset/versionAdd',payload);
      onSelect({...asset,...payload,id:asset.id,versionId:`asset-${asset.id}-v${number}`,versionNumber:number,identity:fileId,url:URL.createObjectURL(file)});
      onNotify(`V${number} creada; consulta el estado de guardado de tu cuenta.`);
    }catch(error){onNotify(error.message||'No se pudo guardar la nueva versión. El historial se conserva.');}finally{setBusy(false);}
  };
  return <div className="version-select"><label>Versión <select aria-label="Versión de la pieza" disabled={busy} value={selected} onChange={e=>open(versions.find(v=>v.id===e.target.value))}>{versions.map(v=><option key={v.id} value={v.id}>V{v.number}{v.id===(asset.activeVersionId||`asset-${asset.id}-v1`)?' · Actual':''}</option>)}</select></label><label className="upload-button">{busy?'Procesando…':'Nueva versión'}<input className="visually-hidden" aria-label="Subir nueva versión de esta pieza" type="file" disabled={busy} onChange={upload}/></label></div>;
}
