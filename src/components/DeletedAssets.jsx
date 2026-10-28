import React from 'react';
import {useRonda} from '../state/RondaContext.jsx';
import './asset-trash.css';
export function DeletedAssets({projectId}){
  const {state,act}=useRonda();
  const items=Object.values(state.trashedAssets||{}).filter(item=>item.asset.projectId===projectId);
  if(!items.length)return null;
  return <details className="asset-trash"><summary>Papelera de piezas ({items.length})</summary><p>Se conservan los archivos, versiones y comentarios para poder restaurarlos. Mover a la papelera no libera almacenamiento.</p><ul>{items.map(({asset})=><li key={asset.id}><span>{asset.name}</span><button type="button" onClick={()=>act('asset/restore',{id:asset.id,projectId})}>Restaurar</button></li>)}</ul></details>;
}
