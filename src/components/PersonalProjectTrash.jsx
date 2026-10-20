import React,{useEffect,useRef,useState} from 'react';
import {useRonda} from '../state/RondaContext.jsx';
function DeleteProjectDialog({project,onClose,onConfirm}){
 const dialog=useRef(null),[name,setName]=useState('');
 useEffect(()=>{const previous=document.activeElement;dialog.current?.showModal();return()=>previous?.isConnected&&previous.focus();},[]);
 return <dialog ref={dialog} className="modal project-delete-dialog" onCancel={onClose}><form onSubmit={event=>{event.preventDefault();if(name===project.name)onConfirm(name);}}><h2>¿Eliminar «{project.name}»?</h2><p>El proyecto se moverá a la papelera. Sus piezas, versiones y comentarios se conservan y puedes restaurarlo.</p><label>Escribe el nombre del proyecto para confirmar<input autoFocus required autoComplete="off" value={name} onChange={event=>setName(event.target.value)}/></label><footer><button type="button" onClick={onClose}>Cancelar</button><button className="project-delete-confirm" type="submit" disabled={name!==project.name}>Mover a la papelera</button></footer></form></dialog>;
}
export function usePersonalProjectTrash(){
 const {state,act}=useRonda();
 const [selected,setSelected]=useState(null);
 const deleted=Object.values(state.projects).filter(project=>project.deletedAt);
 return {requestDelete:setSelected,dialog:selected&&<DeleteProjectDialog key={selected.id} project={selected} onClose={()=>setSelected(null)} onConfirm={confirmName=>{act('project/trash',{id:selected.id,confirmName});setSelected(null);}}/>,trash:deleted.length>0&&<details className="project-trash"><summary>Papelera de proyectos · {deleted.length}</summary>{deleted.map(project=><div key={project.id}><strong>{project.name}</strong><button type="button" onClick={()=>act('project/restore',{id:project.id})} aria-label={`Restaurar proyecto ${project.name}`}>Restaurar</button></div>)}</details>};
}
