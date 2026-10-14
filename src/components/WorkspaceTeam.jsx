import {BrandLoader} from './BrandLoader.jsx';
import React, { useEffect, useState } from 'react';
import { useRonda } from '../state/RondaContext.jsx';
import Icon from './Icon.jsx';
import WorkspacePicker from './WorkspacePicker.jsx';
import {demoSession} from '../state/demoSession.js';
import './workspace-team.css';
import {preferredWorkspace} from '../domain/workspace-routing.js';

const roles = { admin: 'Administrador', editor: 'Editor', reviewer: 'Revisor' };
const actions = { 'invitation.role_changed':'Rol de invitación actualizado', 'invitation.created': 'Invitación creada', 'invitation.accepted': 'Invitación aceptada', 'invitation.revoked': 'Invitación revocada', 'member.removed': 'Miembro retirado', 'member.role_changed': 'Rol actualizado', 'project.created': 'Proyecto compartido creado', 'project.updated': 'Proyecto actualizado', 'project.comment_created': 'Comentario añadido', 'project.comment_status': 'Estado del comentario actualizado' };
const date = value => new Date(value).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
async function request(path, method = 'GET', input) {
  const response = await fetch(path, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...(input === undefined ? {} : { body: JSON.stringify(input) }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.');
  return data;
}

export function WorkspaceTeam({ onNotify }) {
  const { state } = useRonda();
  const [spaces, setSpaces] = useState([]), [selected, setSelected] = useState('');
  const [detail, setDetail] = useState(null), [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [email, setEmail] = useState(''), [role, setRole] = useState('reviewer');
  const [code, setCode] = useState(''), [issued, setIssued] = useState(null);
  const [query, setQuery] = useState(''), [removing, setRemoving] = useState(null);
  const [revision, setRevision] = useState(0);
  const [inviteOpen,setInviteOpen]=useState(false);
  const [revoking,setRevoking]=useState(null);
  useEffect(() => { setIssued(null); setRevoking(null); }, [selected]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setDetail(null); setRemoving(null);
    (async () => {
      if(demoSession()){
        if(active){setSpaces([state.workspace]);setSelected(state.workspace.id);setDetail({workspace:{...state.workspace,role:'admin'},members:Object.values(state.members),seatLimit:20,invitations:[],events:[]});}
        return;
      }
      const { workspaces } = await request('/api/workspaces');
      const id = preferredWorkspace(workspaces,selected);
      const result = id ? await request(`/api/workspaces/${id}`) : null;
      if (active) { setSpaces(workspaces); setDetail(result); if (id && id !== selected) setSelected(id); }
    })().catch(reason => { if (active) setError(reason.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selected, revision]);
  async function mutate(operation, message) {
    if(demoSession()){onNotify('Demo: la gestión de accesos reales está desactivada.');return;}
    if (busy) return;
    setBusy(true); setError('');
    try { await operation(); onNotify(message); setRevision(value => value + 1); }
    catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }
  const admin = detail?.workspace.role === 'admin';
  const members = detail?.members ?? [];
  const pending = detail?.invitations ?? [];
  const visiblePending = pending.filter(item=>item.email.toLowerCase().includes(query.toLowerCase()));
  const visible = members.filter(member => `${member.name} ${member.email}`.toLowerCase().includes(query.toLowerCase()));
  const references = Object.values(state.members).filter(member => member.id !== state.currentUserId);
  const path = `/api/workspaces/${selected}`;
  return <div className="dashboard-page team-page server-team">
    <header className="dashboard-header"><div><span className="eyebrow">ESPACIO DE TRABAJO</span><h1>Tu equipo</h1><p>Las personas que colaboran contigo y sus permisos de acceso.</p></div><div className="team-header-actions"><button aria-label="Actualizar equipo" disabled={busy || loading} onClick={() => setRevision(value => value + 1)}><Icon name="redo" size={16}/></button>{admin&&<LiquidButton aria-expanded={inviteOpen} aria-controls="team-invite-panel" onClick={()=>setInviteOpen(value=>!value)}><Icon name="plus" size={16}/>Invitar persona</LiquidButton>}</div></header>
    <div className="team-toolbar"><WorkspacePicker spaces={spaces} value={selected} disabled={busy || loading || !spaces.length} onChange={setSelected}/><label>Buscar en el equipo<span className="team-search-field"><Icon name="search" size={17}/><input type="search" placeholder="Nombre o correo electrónico…" value={query} onChange={event => setQuery(event.target.value)} /></span></label></div>
    {error && <div className="team-feedback" role="alert"><p>{error}</p><button disabled={busy} onClick={() => setRevision(value => value + 1)}>Volver a cargar</button></div>}
    {loading && <BrandLoader label="Cargando equipo…"/>}
    {!loading && detail && <>
      <section className="team-summary"><div><span className="team-count">{members.length}</span><span>{members.length === 1 ? 'miembro activo' : 'miembros activos'}</span>{admin&&<span> · {pending.length} {pending.length===1?'invitación pendiente':'invitaciones pendientes'}</span>}</div><div className="team-summary-meta"><span>{roles[detail.workspace.role]}</span><span>{members.length + pending.length} / {detail.seatLimit} puestos reservados</span></div></section>
      {admin&&<section className="team-pending-section" aria-label="Invitaciones pendientes"><header><h2>Invitaciones pendientes ({pending.length})</h2><p>Aún no son miembros. Cada persona debe iniciar sesión con su correo y aceptar el código desde Equipo → Unirme a otro espacio. Registrarse por sí solo no acepta la invitación.</p></header>{visiblePending.length?<div className="member-table"><header><span>Persona invitada</span><span>Rol al aceptar</span><span>Estado</span><span>Acciones</span></header>{visiblePending.map(invitation=><div className="member-row" key={invitation.id}><span className="member-person"><i className="avatar role-reviewer" aria-hidden="true"><Icon name="send" size={16}/></i><span><strong>{invitation.email}</strong><small>Vence {date(invitation.expires_at)}</small></span></span><select aria-label={`Rol de invitación para ${invitation.email}`} value={invitation.role} disabled={busy} onChange={event=>mutate(()=>request(`${path}/invitations/${invitation.id}`,'PATCH',{role:event.target.value}),'Rol de invitación actualizado; el código sigue siendo válido')}>{Object.entries(roles).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><span className="member-status pending">Pendiente de aceptar</span><button type="button" disabled={busy} aria-label={`Revocar invitación de ${invitation.email}`} onClick={()=>setRevoking(invitation)}>Revocar</button></div>)}</div>:<p>{pending.length?'No hay invitaciones que coincidan con la búsqueda.':'No hay invitaciones pendientes.'}</p>}</section>}
      {revoking&&<section role="alert" className="team-feedback"><p>¿Revocar la invitación de {revoking.email}? El código dejará de funcionar. No elimina la cuenta de la persona.</p><button disabled={busy} onClick={()=>mutate(async()=>{await request(`${path}/invitations/${revoking.id}`,'DELETE');setRevoking(null);},'Invitación revocada')}>Confirmar revocación</button><button disabled={busy} onClick={()=>setRevoking(null)}>Cancelar</button></section>}
      <h2 className="team-active-heading">Miembros activos ({members.length})</h2>
      <section className="member-table" aria-label="Miembros del espacio"><header><span>Persona</span><span>Rol</span><span>Estado</span><span>Acciones</span></header>{visible.map(member => <div className="member-row" key={member.id}><span className="member-person"><i className={`avatar role-${member.role}`} aria-hidden="true">{member.name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase()}</i><span><strong>{member.name}</strong><small>{member.email}</small></span></span><select aria-label={`Rol de ${member.name}`} value={member.role} disabled={!admin || busy} onChange={event => mutate(() => request(`${path}/members/${member.id}`, 'PATCH', { role: event.target.value }), 'Rol actualizado en el servidor')}>{Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><span className="member-status">{member.id === state.currentUserId ? 'Tu cuenta' : 'Cuenta registrada'}</span><button className="remove-member" disabled={!admin || busy} aria-label={`Quitar a ${member.name}`} onClick={() => setRemoving(member)}>Quitar</button></div>)}</section>
      {!visible.length && <div className="team-empty"><p>No hay miembros con esta búsqueda.</p><button onClick={() => setQuery('')}>Limpiar búsqueda</button></div>}
      {removing && <section className="team-feedback" role="alert"><p>¿Retirar a {removing.name} de este espacio? No elimina su cuenta ni sus datos privados.</p><button disabled={busy} onClick={() => mutate(async () => { await request(`${path}/members/${removing.id}`, 'DELETE'); setRemoving(null); }, 'Miembro retirado del espacio')}>Confirmar retirada</button><button disabled={busy} onClick={() => setRemoving(null)}>Cancelar</button></section>}
      {admin ? <section id="team-invite-panel" hidden={!inviteOpen} className="team-invitations"><h2>Invitar una persona</h2><p>Se enviará un correo con las instrucciones y un código privado de un solo uso, válido por 7 días.</p><form onSubmit={event => { event.preventDefault(); mutate(async () => { const result = await request(`${path}/invitations`, 'POST', { email, role }); setIssued(result); setEmail(''); }, 'Invitación creada; revisa el estado del correo abajo'); }}><label>Correo de la persona<input type="email" required maxLength={254} placeholder="nombre@empresa.com" value={email} onChange={event => setEmail(event.target.value)} /></label><label>Rol<select value={role} onChange={event => setRole(event.target.value)}>{Object.entries(roles).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><button className="primary-action" disabled={busy || !email.trim()} type="submit">Enviar invitación</button></form>{role === 'admin' && <p>Un administrador podrá gestionar miembros y sus roles. Invita con este rol solo a personas de confianza.</p>}

      </section> : <p>Solo los administradores pueden invitar y gestionar miembros.</p>}
      <details className="team-history"><summary>Actividad del equipo ({detail.events.length})</summary>{detail.events.length ? <ol>{detail.events.map(item => <li key={item.id}><strong>{actions[item.action] || item.action}</strong><span>{item.actor || 'Cuenta retirada'} · {date(item.created_at)}</span></li>)}</ol> : <p>Aún no hay cambios registrados.</p>}<p>Últimos 30 eventos guardados en el servidor; no es una auditoría externa certificada.</p></details>
    </>}
    {!loading && !error && !detail && <p>No perteneces a ningún espacio. Puedes aceptar una invitación.</p>}
    {issued && <section className="team-issued" aria-label="Código privado de invitación"><h2>Invitación para {issued.invitation.email}</h2><p role="status">{issued.emailDelivery?.status === 'accepted' ? 'El servidor de correo aceptó el envío. Pide a la persona revisar su bandeja y spam; esto no confirma la entrega final.' : 'No se pudo confirmar el envío del correo. La invitación sigue activa: copia y comparte el código por un canal privado, o revócala antes de crear otra.'}</p><p>Guárdalo antes de salir: no volverá a mostrarse. La persona debe iniciar sesión con ese correo y pegarlo abajo en Equipo.</p><label>Código privado<input readOnly value={issued.token} onFocus={event => event.target.select()} /></label><button onClick={async () => { try { await navigator.clipboard.writeText(issued.token); onNotify('Código copiado'); } catch { onNotify('Selecciona y copia el código manualmente'); } }}>Copiar código</button><button onClick={() => setIssued(null)}>Ocultar código</button></section>}
    <details className="team-accept"><summary><Icon name="link" size={16}/><span>Unirme a otro espacio</span><span className="team-summary-hint">Tengo un código de invitación</span></summary><p>Inicia sesión con el correo indicado y pega el código que te entregó el administrador. Poseer el código no verifica tu dirección de correo.</p><form onSubmit={event => { event.preventDefault(); mutate(async () => { const result = await request('/api/workspace-invitations/accept', 'POST', { token: code.trim() }); setSelected(result.workspaceId); setCode(''); }, 'Invitación aceptada'); }}><label>Código de invitación<input autoComplete="off" spellCheck="false" maxLength={43} required value={code} onChange={event => setCode(event.target.value)} /></label><button disabled={busy || code.trim().length !== 43} type="submit">Aceptar invitación</button></form></details>
    {references.length > 0 && <details className="team-history"><summary>Referencias anteriores ({references.length})</summary><p>Se conservaron sin convertirlas en cuentas ni conceder acceso.</p><ul>{references.map(member => <li key={member.id}>{member.name} · {member.email}</li>)}</ul></details>}
    <details className="team-scope-note"><summary><Icon name="folder" size={16}/>Qué puede ver tu equipo<Icon name="chevron" size={14}/></summary><p>En Proyectos, dentro del espacio de equipo seleccionado, puedes crear proyectos y comentarios generales visibles para los miembros del espacio. Los proyectos privados, archivos y anotaciones anteriores no se comparten automáticamente.</p></details>
  </div>;
}
import {LiquidButton} from './LiquidButton.js';
