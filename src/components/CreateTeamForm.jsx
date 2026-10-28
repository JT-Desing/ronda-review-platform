import React,{useState} from 'react';
import {reviewSend} from '../state/sharedReviewApi.js';
export function CreateTeamForm({onCreated}){
 const [name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[key,setKey]=useState(()=>crypto.randomUUID());
 return <details className="create-team-panel"><summary>Crear un equipo</summary><form onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setError('');try{const result=await reviewSend('/api/workspaces','POST',{name,requestId:key});setName('');setKey(crypto.randomUUID());onCreated(result.workspace);}catch(reason){setError(reason.message);}finally{setBusy(false);}}}><h2>Tu empresa en Ronda</h2><p>Los proyectos de este equipo serán compartidos con sus miembros. Tu espacio personal seguirá siendo privado.</p><label>Nombre del equipo<input required maxLength={80} disabled={busy} autoComplete="organization" value={name} onChange={e=>{setName(e.target.value);setKey(crypto.randomUUID());}} placeholder="Ej. Estudio Aurora"/></label>{error&&<p role="alert">{error}</p>}<button disabled={busy||!name.trim()} type="submit">{busy?'Creando equipo…':'Crear equipo'}</button></form></details>;
}
