import React,{useEffect,useRef,useState} from 'react';
import {useRonda} from '../state/RondaContext.jsx';
import Icon from './Icon.jsx';
function DeleteProjectDialog({project,onClose,onConfirm}){
 const dialog=useRef(null),[name,setName]=useState('');
 useEffect(()=>{const previous=document.activeElement;dialog.current?.showModal();return()=>previous?.isConnected&&previous.focus();},[]);
 return <dialog ref={dialog} className="modal project-delete-dialog" onCancel={onClose}><form onSubmit={event=>{event.preventDefault();if(name===project.name)onConfirm(name);}}><h2>¿Eliminar «{project.name}»?</h2><p>El proyecto se moverá a la papelera. Sus piezas, versiones y comentarios se conservan y puedes restaurarlo.</p><label>Escribe el nombre del proyecto para confirmar<input autoFocus required autoComplete="off" value={name} onChange={event=>setName(event.target.value)}/></label><footer><button type="button" onClick={onClose}>Cancelar</button><button className="project-delete-confirm" type="submit" disabled={name!==project.name}>Mover a la papelera</button></footer></form></dialog>;
}
export function usePersonalProjectTrash(){
 const {state,act}=useRonda();
 const [selected,setSelected]=useState(null),[permanent,setPermanent]=useState(null);
 const deleted=Object.values(state.projects).filter(project=>project.deletedAt);
 return {requestDelete:setSelected,dialog:<>{selected&&<DeleteProjectDialog key={selected.id} project={selected} onClose={()=>setSelected(null)} onConfirm={confirmName=>{act('project/trash',{id:selected.id,confirmName});setSelected(null);}}/>}{permanent&&<PermanentDeleteDialog key={permanent.id} project={permanent} onClose={()=>setPermanent(null)} onConfirm={confirmName=>{act('project/deletePermanently',{id:permanent.id,confirmName});setPermanent(null);}}/>}</>,trash:deleted.length>0&&<details className="project-trash"><summary>Papelera de proyectos · {deleted.length}</summary>{deleted.map(project=><div className="project-trash-row" key={project.id}><strong>{project.name}</strong><div className="project-trash-actions"><button className="project-trash-icon" type="button" onClick={()=>act('project/restore',{id:project.id})} aria-label={`Restaurar proyecto ${project.name}`} title="Restaurar proyecto"><Icon name="undo" size={18}/></button><button className="project-trash-icon project-trash-icon-danger" type="button" onClick={()=>setPermanent(project)} aria-label={`Eliminar ${project.name} definitivamente`} title="Eliminar definitivamente"><Icon name="trash" size={18}/></button></div></div>)}</details>};
}
function PermanentDeleteDialog({project,onClose,onConfirm}){
 const dialog=useRef(null),[name,setName]=useState('');
 useEffect(()=>{const previous=document.activeElement;dialog.current?.showModal();return()=>previous?.isConnected&&previous.focus();},[]);
 return <dialog ref={dialog} className="modal project-delete-dialog project-permanent-delete-dialog" onCancel={onClose}><form onSubmit={event=>{event.preventDefault();if(name===project.name)onConfirm(name);}}><h2>Eliminar «{project.name}» definitivamente</h2><p>Esta acción no se puede deshacer. Se eliminarán sus piezas, versiones, comentarios y anotaciones.</p><label>Escribe el nombre del proyecto para confirmar<input autoFocus required autoComplete="off" value={name} onChange={event=>setName(event.target.value)}/></label><footer><button type="button" onClick={onClose}>Cancelar</button><button className="project-delete-confirm" type="submit" disabled={name!==project.name}>Eliminar definitivamente</button></footer></form></dialog>;
}
