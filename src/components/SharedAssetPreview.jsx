import React,{useEffect,useState} from 'react';
import Icon from './Icon.jsx';
export function SharedAssetPreview({asset,workspaceId}){
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[asset.id,asset.previewFileId]);
  const local=asset.previewFileId&&asset.previewSize>0&&asset.previewSize<=8*1024*1024&&!failed;
  const url=local?`/api/workspaces/${workspaceId}/media/${asset.previewFileId}`:null;
  if(url&&asset.kind==='image')return <img src={url} alt="" loading="lazy" decoding="async" onError={()=>setFailed(true)}/>;
  if(url&&asset.kind==='video')return <video src={url+'#t=0.1'} muted preload="metadata" onError={()=>setFailed(true)}/>;
  return <span className="shared-piece-placeholder"><Icon name={asset.kind==='web'?'link':asset.kind==='video'?'play':asset.kind==='file'||asset.kind==='pdf'?'folder':'image'} size={28}/><small>{asset.kind==='web'?'Artefacto web':asset.kind==='pdf'?'Documento PDF':asset.kind==='file'?'Archivo descargable':failed?'Vista previa no disponible':'Abrir vista previa'}</small></span>;
}
