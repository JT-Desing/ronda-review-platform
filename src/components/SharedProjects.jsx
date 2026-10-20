import {BrandLoader} from './BrandLoader.jsx';
import {ReviewLoading} from './ReviewLoading.jsx';
import React, { useCallback, useEffect, useState } from 'react';
import { api,currentAccountId } from '../state/accountStorage.js';
import './shared-projects.css';
import {SharedProjectMedia} from './SharedProjectMedia.jsx';
import {canLeaveSharedReview} from '../state/sharedReviewState.js';
import Icon from './Icon.jsx';
import {readSharedProjectLink,setSharedProjectLocation} from '../domain/shared-project-link.js';
import {ShareProjectButton} from './ShareProjectButton.jsx';
import {CreateTeamForm} from './CreateTeamForm.jsx';
import {ProjectInvitations,ProjectJoin} from './ProjectInvitations.jsx';
import {ProjectMemberPicker,ProjectAccessPanel} from './ProjectMembers.jsx';
import {teamWorkspaces,preferredWorkspace,readPreferredTeam,rememberPreferredTeam,forgetPreferredTeam} from '../domain/workspace-routing.js';
import './shared-review-layout-fix.css';
import {ProjectTile} from './StudioWorkspace.jsx';
const send = (path, method, input) => api(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
const date = value => new Date(value).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
const workspacePreferenceStorage=()=>{try{return localStorage;}catch{return null;}};

export function SharedProjects({ onNotify, onDirtyChange }) {
  const [requestedSpace,setRequestedSpace]=useState(()=>readSharedProjectLink(location.hash)?.workspaceId||'');
  const [spaces, setSpaces] = useState([]), [space, setSpace] = useState(''), [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(()=>readSharedProjectLink(location.hash)?.projectId||''), [detail, setDetail] = useState(null), [role, setRole] = useState('');
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [refresh, setRefresh] = useState(0);
  const [creating, setCreating] = useState(false), [name, setName] = useState(''), [client, setClient] = useState(''), [createKey, setCreateKey] = useState(() => crypto.randomUUID());
  const [createMembers,setCreateMembers]=useState(undefined);
  useEffect(()=>setCreateMembers(undefined),[space]);
  const [drafts, setDrafts] = useState({}), [editing, setEditing] = useState(null), [query, setQuery] = useState('');
  const [childDirty,setChildDirty]=useState(false);
  const [permissionRevision,setPermissionRevision]=useState(0);
  const [deleting,setDeleting]=useState(null),[confirmName,setConfirmName]=useState(''),[deletedProjects,setDeletedProjects]=useState([]);
  const hasPending=childDirty||Object.values(drafts).some(item=>item.text.trim())||Boolean(name.trim())||Boolean(editing);
  const canChange=()=>{if(!canLeaveSharedReview({dirty:hasPending,busy},()=>window.confirm('Hay cambios sin publicar. ¿Descartarlos y cambiar de vista?')))return false;if(hasPending){setDrafts({});setName('');setEditing(null);setChildDirty(false);}return true;};
  useEffect(() => { onDirtyChange?.(hasPending); }, [hasPending, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  useEffect(()=>{
    const resume=()=>{if(!hasPending&&!busy)setRefresh(value=>value+1);};
    window.addEventListener('ronda-session-restored',resume);
    return()=>window.removeEventListener('ronda-session-restored',resume);
  },[hasPending,busy]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    (async () => {
      const response = await api('/api/workspaces');
      const teams=teamWorkspaces(response.workspaces);
      const requestedIsValid=teams.some(item=>item.id===requestedSpace);
      const directLinkSpace=readSharedProjectLink(location.hash)?.workspaceId;
      if(requestedSpace&&!requestedIsValid&&requestedSpace===directLinkSpace)throw new Error('No tienes acceso a este equipo. Pide una invitación o entra con la cuenta invitada.');
      if(requestedSpace&&!requestedIsValid)setRequestedSpace('');
      const preferenceStorage=workspacePreferenceStorage();
      const savedSpace=readPreferredTeam(preferenceStorage,currentAccountId());
      const savedIsValid=teams.some(item=>item.id===savedSpace);
      if(savedSpace&&!savedIsValid)forgetPreferredTeam(preferenceStorage,currentAccountId());
      const currentSpace = preferredWorkspace(teams,requestedIsValid?requestedSpace:savedIsValid?savedSpace:'');
      const listing = currentSpace ? await api(`/api/workspaces/${currentSpace}/projects`) : null;
      const currentProject = listing?.projects.some(item => item.id === selected) ? selected : '';
      const projectDetail = currentProject ? await api(`/api/workspaces/${currentSpace}/projects/${currentProject}`) : null;
      if (active) {
        setSpaces(teams); setProjects(listing?.projects ?? []);setDeletedProjects(listing?.deletedProjects??[]); setRole(projectDetail?.workspace.role??listing?.workspace.role ?? ''); setDetail(projectDetail);
        setSpace(currentSpace||'');
        rememberPreferredTeam(preferenceStorage,currentAccountId(),currentSpace);
        if(selected&&!currentProject){setSelected('');if(currentSpace)setSharedProjectLocation(window,currentSpace,'');}
      }
    })().catch(reason => { if (active) { setError(reason.message); setProjects([]); setRole(''); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [requestedSpace, selected, refresh]);
  const canEdit = ['admin', 'editor'].includes(role);
  const refreshPermissions=useCallback(()=>{setRole('');setPermissionRevision(value=>value+1);setRefresh(value=>value+1);},[]);
  const syncProjectRoute=projectId=>{if(space)setSharedProjectLocation(window,space,projectId||'');};
  const draftId = `${space}:${selected}`;
  const draft = drafts[draftId] ?? { text: '', requestId: crypto.randomUUID() };
  useEffect(() => {
    if (!Object.values(drafts).some(item => item.text.trim()) && !name.trim() && !editing) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [drafts, name, editing]);
  async function mutate(operation, message) {
    if (busy) return;
    setBusy(true); setError('');
    try { await operation(); onNotify(message); setRefresh(value => value + 1); }
    catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }
  const path = `/api/workspaces/${space}/projects`;
  const filtered = projects.filter(project => `${project.name} ${project.client}`.toLowerCase().includes(query.toLowerCase()));
  if(loading&&!space&&!error)return <div className="dashboard-page shared-projects shared-projects-loading" data-mode="gallery" aria-busy="true"><BrandLoader size="stage" label="Cargando proyectos del equipo…"/></div>;
  return <div className="dashboard-page shared-projects" data-mode={selected?'project':'gallery'} aria-busy={loading}>
    {!selected&&!loading&&<CreateTeamForm onCreated={workspace=>{setRequestedSpace(workspace.id);setRefresh(value=>value+1);onNotify('Equipo creado. Crea tu primer proyecto o usa Invitar al equipo.');}}/>}
    <header className="dashboard-header"><div><span className="eyebrow">COLABORACIÓN DEL EQUIPO</span><h1>Proyectos compartidos</h1><p>Organiza las entregas y reúne las revisiones de tu equipo.</p></div><button className="shared-refresh" disabled={busy || loading} onClick={() => {if(canChange())setRefresh(value => value + 1);}}><Icon name="redo" size={16}/>Actualizar</button></header>
    <details className="shared-scope-help"><summary><Icon name="users" size={16}/><span>Visible para tu equipo <small>· Tu contenido privado permanece separado</small></span><Icon name="chevron" size={14}/></summary><p>Los miembros de este espacio pueden ver los proyectos y las piezas que subas aquí. Tus proyectos privados no se copian ni se comparten automáticamente.</p></details>
    {!selected&&!loading&&space&&role==='admin'&&<ProjectInvitations key={space} workspaceId={space}/>}
    {!selected&&!loading&&<ProjectJoin onJoined={id=>{setRequestedSpace(id);setRefresh(n=>n+1);}}/>}
    {spaces.length>0&&<div className="shared-toolbar"><label>Espacio del equipo<select disabled={busy || loading || !spaces.length} value={space} onChange={event => { if(!canChange())return;const nextSpace=event.target.value;setSharedProjectLocation(window,nextSpace,'');setSpace(nextSpace);setRequestedSpace(nextSpace);setProjects([]);setDetail(null);setLoading(true);setSelected('');setEditing(null);setCreating(false); }}>{spaces.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Buscar proyecto compartido<input type="search" placeholder="Nombre o cliente" value={query} onChange={event => setQuery(event.target.value)} /></label>{canEdit && <button disabled={busy || loading} className="primary-action" onClick={() => setCreating(true)}>Nuevo proyecto compartido</button>}</div>}
    {error && <div role="alert" className="shared-feedback"><p>{error}</p><button disabled={busy} onClick={() => {if(canChange())setRefresh(value => value + 1);}}>Actualizar datos</button></div>}
    {deleting&&<div className="modal-layer"><button className="modal-scrim" aria-label="Cancelar eliminación" disabled={busy} onClick={()=>setDeleting(null)}/><form className="modal project-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-project-title" onKeyDown={e=>{if(e.key==='Escape'&&!busy)setDeleting(null);}} onSubmit={e=>{e.preventDefault();if(busy||confirmName!==deleting.name)return;mutate(async()=>{await send(`${path}/${deleting.id}/trash`,'POST',{revision:deleting.revision,confirmName});setDeleting(null);setConfirmName('');},'Proyecto movido a la papelera');}}><h2 id="delete-project-title">¿Eliminar «{deleting.name}»?</h2><p>Se retirará del equipo. Sus piezas, versiones y comentarios se conservarán en la papelera y un administrador podrá restaurarlo.</p><label>Escribe el nombre del proyecto para confirmar<input autoFocus autoComplete="off" value={confirmName} onChange={e=>setConfirmName(e.target.value)}/></label><footer><button type="button" disabled={busy} onClick={()=>setDeleting(null)}>Cancelar</button><button className="project-delete-confirm" type="submit" disabled={busy||confirmName!==deleting.name}>{busy?<BrandLoader size="inline" label="Procesando…"/>:'Mover a la papelera'}</button></footer>{error&&<p role="alert">{error}</p>}</form></div>}
    {role==='admin'&&!selected&&deletedProjects.length>0&&<details className="project-trash"><summary>Papelera de proyectos · {deletedProjects.length}</summary>{deletedProjects.map(p=><div key={p.id}><strong>{p.name}</strong><button disabled={busy} onClick={()=>mutate(()=>send(`${path}/${p.id}/restore`,'POST',{revision:p.revision,confirmName:p.name}),'Proyecto restaurado')}>Restaurar</button></div>)}</details>}
    {loading && !selected && <BrandLoader size="inline" label="Actualizando proyectos…"/>}
    {!loading&&!spaces.length&&!error&&<p role="status">Todavía no tienes un equipo compartido. Puedes crearlo arriba o aceptar tu código de invitación aquí. Tus proyectos personales siguen en el acceso con tu nombre.</p>}
    {creating && canEdit && <form className="shared-panel" onSubmit={event => { event.preventDefault(); mutate(async () => { const result = await send(path, 'POST', { name, client, requestId: createKey,members:createMembers }); setName(''); setClient(''); setCreateKey(crypto.randomUUID()); setCreating(false); setSharedProjectLocation(window,space,result.project.id);setSelected(result.project.id); }, 'Proyecto compartido creado'); }}><h2>Nuevo proyecto compartido</h2><p>Elige quién participa y con qué rol en este proyecto. No publiques información privada de otro cliente.</p><label>Nombre del proyecto compartido<input required maxLength={100} value={name} onChange={event => { setName(event.target.value); setCreateKey(crypto.randomUUID()); }} /></label><label>Cliente del proyecto compartido<input maxLength={100} value={client} onChange={event => { setClient(event.target.value); setCreateKey(crypto.randomUUID()); }} /></label><ProjectMemberPicker workspaceId={space} value={createMembers} onChange={value=>{setCreateMembers(value);setCreateKey(crypto.randomUUID());}} disabled={busy}/><footer><button disabled={busy} type="button" onClick={() => setCreating(false)}>Cerrar formulario</button><button className="primary-action" disabled={busy || !name.trim()} type="submit">Crear proyecto compartido</button></footer></form>}
    {spaces.length>0 && (!loading||Boolean(space)) && !error && <div className="shared-layout"><section className="shared-list studio-project-grid" aria-label="Proyectos del equipo">{filtered.length ? filtered.map((project,index)=><ProjectTile key={project.id} project={{...project,assets:[],assetCount:project.asset_count||0,pending:(project.open_comments||0)+(project.open_review_comments||0),status:project.asset_count?'in_review':'draft',palette:index%4}} canRename={canEdit} renameHelpText="El nuevo nombre se comparte con todo el equipo." onDelete={role==='admin'&&!busy?project=>{setDeleting(project);setConfirmName('');}:undefined} onRename={async name=>{const result=await send(`${path}/${project.id}`,'PATCH',{name,client:project.client||'',revision:project.revision});setProjects(items=>items.map(item=>item.id===project.id?{...item,...result.project}:item));onNotify('Nombre actualizado para todo el equipo');}} onOpen={()=>{if(!canChange())return;syncProjectRoute(project.id);setSelected(project.id);setEditing(null);}}/>) : loading?<BrandLoader label="Cargando proyectos…"/>:<div className="shared-empty"><h2>{query?'Sin resultados':'El espacio está listo'}</h2><p>{query?'Prueba otro nombre o cliente.':canEdit?'Crea el primer proyecto para trabajar con tu equipo.':'Un administrador o editor puede crear el primer proyecto.'}</p></div>}</section>
      {detail?.project.id===selected ? <section className="shared-panel shared-conversation" aria-label="Conversación del proyecto"><button className="shared-all-projects" type="button" onClick={()=>{if(!canChange())return;syncProjectRoute('');setSelected('');setEditing(null);}}>← Todos los proyectos del equipo</button><header><div><span className="eyebrow">PROYECTO DEL EQUIPO</span><h2>{detail.project.name}</h2><p>{detail.project.client || 'Sin cliente'}</p></div><ShareProjectButton workspaceId={space} projectId={selected}/>{canEdit && <button disabled={busy} onClick={() => setEditing({ name: detail.project.name, client: detail.project.client, revision: detail.project.revision })}>Editar proyecto</button>}</header>
        {editing && canEdit && <form onSubmit={event => { event.preventDefault(); mutate(async () => { await send(`${path}/${selected}`, 'PATCH', editing); setEditing(null); }, 'Proyecto actualizado'); }}><label>Editar nombre<input maxLength={100} required value={editing.name} onChange={event => setEditing({ ...editing, name: event.target.value })} /></label><label>Editar cliente<input maxLength={100} value={editing.client} onChange={event => setEditing({ ...editing, client: event.target.value })} /></label><footer><button type="button" disabled={busy} onClick={() => setEditing(null)}>Cancelar edición</button><button type="submit" disabled={busy || !editing.name.trim()}>Guardar proyecto</button></footer></form>}
        {detail?.canManageMembers&&<ProjectAccessPanel key={`${space}:${selected}:${detail.project.revision}`} workspaceId={space} detail={detail} onSaved={()=>setRefresh(n=>n+1)}/>}
        <SharedProjectMedia key={`${space}:${selected}`} workspaceId={space} projectId={selected} projectName={detail?.project.name} onExitProject={()=>{if(canChange()){syncProjectRoute('');setSelected('');}}} role={role} onRoleUpdate={setRole} permissionRevision={permissionRevision} onPermissionDenied={refreshPermissions} onNotify={onNotify} onDirtyChange={setChildDirty}/>
        <section className="shared-general-conversation" aria-label="Comentarios generales del proyecto">
        <h3>Conversación general del proyecto</h3>
        <div className="shared-comments">{detail.comments.length ? detail.comments.map(comment => <article key={comment.id} className={comment.status === 'resolved' ? 'resolved' : ''}><header><strong>{comment.author || 'Cuenta retirada'}</strong><time dateTime={comment.created_at}>{date(comment.created_at)}</time></header><p>{comment.text}</p><footer><span>{comment.status === 'resolved' ? 'Resuelto' : 'Abierto'}</span>{canEdit && <button disabled={busy} onClick={() => mutate(() => send(`${path}/${selected}/comments/${comment.id}`, 'PATCH', { status: comment.status === 'open' ? 'resolved' : 'open', revision: comment.revision }), 'Estado del comentario actualizado')}>{comment.status === 'open' ? 'Resolver' : 'Reabrir'}</button>}</footer></article>) : <p className="shared-empty">Todavía no hay comentarios. Deja una indicación general para el equipo.</p>}</div>
        <form className="shared-composer" onSubmit={event => { event.preventDefault(); mutate(async () => { await send(`${path}/${selected}/comments`, 'POST', { text: draft.text, requestId: draft.requestId }); setDrafts(value => ({ ...value, [draftId]: { text: '', requestId: crypto.randomUUID() } })); }, 'Comentario compartido publicado'); }}><label>Comentario para el equipo<textarea required maxLength={2000} rows={3} value={draft.text} placeholder="Describe el cambio o la indicación para este proyecto…" onChange={event => setDrafts(value => ({ ...value, [draftId]: { text: event.target.value, requestId: crypto.randomUUID() } }))} /></label><footer><small>{draft.text.length}/2000 · visible para el equipo</small><button className="primary-action" disabled={busy || !draft.text.trim()} type="submit">Publicar comentario</button></footer></form><small>Últimos 100 comentarios. Usa Actualizar para consultar cambios de otras sesiones; no hay sincronización en tiempo real ni avisos por correo.</small>
        </section>
      </section> : selected?<ReviewLoading/>:<section className="shared-project-welcome"><span className="shared-welcome-icon"><Icon name="folder" size={28}/></span><span className="eyebrow">TU MESA DE TRABAJO</span><h2>Todo el proyecto, en un lugar</h2><p>Selecciona un proyecto para ver sus piezas, versiones y conversaciones.</p><div className="shared-welcome-features"><span><Icon name="image" size={15}/>Piezas y versiones</span><span><Icon name="users" size={15}/>Revisión en equipo</span></div></section>}
    </div>}
  </div>;
}
