import React,{useCallback,useEffect,useState} from 'react';
import {api} from '../state/accountStorage.js';
import {PLAN_CATALOG,TEAM_PLAN_IDS,PERSONAL_PLAN_IDS,PLAN_STATUS_LABELS,formatBytes,usageLevel} from '../domain/plans.js';
import './platform-plans.css';

const send=(path,method,body)=>api(path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const toInteger=value=>value===''||value===null?null:Number(value);

function Meter({label,used,limit,format=value=>value}){
 const {percent,warning}=usageLevel(used,limit);
 return <div className={`plan-meter${warning?' warning':''}`}><span>{label}<strong>{format(used)} de {format(limit)}</strong></span><i style={{'--fill':`${percent}%`}} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}/></div>;
}

function PlanFields({draft,setDraft,planIds}){
 return <><label>Plan<select value={draft.plan} onChange={e=>setDraft({...draft,plan:e.target.value})}>{planIds.map(id=><option key={id} value={id}>{PLAN_CATALOG[id].name}</option>)}</select></label>
  <label>Estado<select value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value})}>{Object.entries(PLAN_STATUS_LABELS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
  <label>Paquetes +100 GB<input type="number" min="0" max="100" value={draft.extraPacks} onChange={e=>setDraft({...draft,extraPacks:Number(e.target.value)})}/></label>
  {draft.plan==='a-medida'&&<><label>Personas<input type="number" min="1" placeholder="300" value={draft.customMembers??''} onChange={e=>setDraft({...draft,customMembers:toInteger(e.target.value)})}/></label><label>Espacio (GB)<input type="number" min="1" placeholder="2048" value={draft.customStorageGb??''} onChange={e=>setDraft({...draft,customStorageGb:toInteger(e.target.value)})}/></label></>}</>;
}

function CompanyRow({space,onSaved,onNotify}){
 const [draft,setDraft]=useState({plan:space.plan,status:space.status,extraPacks:space.extraPacks,customMembers:space.customMembers,customStorageGb:space.customStorageGb}),[busy,setBusy]=useState(false);
 const save=async e=>{e.preventDefault();setBusy(true);try{await send(`/api/platform/workspaces/${encodeURIComponent(space.id)}`,'PATCH',draft);onNotify(`Plan de ${space.name} actualizado`);onSaved();}catch(reason){onNotify(reason.message);}finally{setBusy(false);}};
 return <article className={`platform-company status-${space.status}`}><header><div><h2>{space.name}</h2><small>{space.admins?.join(', ')||'Sin administrador'}</small></div><span className="plan-badge">{PLAN_CATALOG[space.plan]?.name} · {PLAN_STATUS_LABELS[space.status]}</span></header>
  <Meter label="Personas e invitaciones" used={space.members+space.invitations} limit={space.limits.members}/>
  <Meter label="Espacio" used={space.storageBytes} limit={space.limits.storageBytes} format={formatBytes}/>
  <form onSubmit={save}><PlanFields draft={draft} setDraft={setDraft} planIds={TEAM_PLAN_IDS}/><button disabled={busy}>{busy?'Guardando…':'Guardar plan'}</button></form></article>;
}

function NewCompany({onCreated,onNotify}){
 const empty={name:'',adminEmail:'',plan:'estudio',status:'active',extraPacks:0,customMembers:null,customStorageGb:null};
 const [draft,setDraft]=useState(empty),[busy,setBusy]=useState(false);
 const submit=async e=>{e.preventDefault();setBusy(true);try{await send('/api/platform/workspaces','POST',draft);onNotify(`Empresa ${draft.name} creada`);setDraft(empty);onCreated();}catch(reason){onNotify(reason.message);}finally{setBusy(false);}};
 return <details className="platform-new"><summary>Crear empresa</summary><form onSubmit={submit}><label>Nombre de la empresa<input required maxLength={80} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label>Correo del administrador<input required type="email" value={draft.adminEmail} onChange={e=>setDraft({...draft,adminEmail:e.target.value})}/><small>La persona tiene que haberse registrado en Ronda.</small></label><PlanFields draft={draft} setDraft={setDraft} planIds={TEAM_PLAN_IDS}/><button disabled={busy}>{busy?'Creando…':'Crear empresa'}</button></form></details>;
}

function PersonalAccount({onNotify}){
 const [email,setEmail]=useState(''),[account,setAccount]=useState(null),[draft,setDraft]=useState(null),[busy,setBusy]=useState(false);
 const find=async e=>{e.preventDefault();setBusy(true);try{const result=await api(`/api/platform/accounts?email=${encodeURIComponent(email)}`);setAccount(result.account);setDraft({plan:result.account.plan,status:result.account.status,extraPacks:result.account.extraPacks});}catch(reason){setAccount(null);onNotify(reason.message);}finally{setBusy(false);}};
 const save=async e=>{e.preventDefault();setBusy(true);try{const result=await send(`/api/platform/accounts/${encodeURIComponent(account.id)}`,'PATCH',draft);setAccount({...account,...result.account});onNotify(`Plan personal de ${account.email} actualizado`);}catch(reason){onNotify(reason.message);}finally{setBusy(false);}};
 return <section className="platform-personal"><h2>Cuenta personal</h2><form onSubmit={find}><label>Correo<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><button disabled={busy}>Buscar</button></form>
  {account&&<article className="platform-company"><header><div><h2>{account.name}</h2><small>{account.email}</small></div><span className="plan-badge">{PLAN_CATALOG[account.plan]?.name} · {PLAN_STATUS_LABELS[account.status]}</span></header><Meter label="Espacio" used={account.storageBytes} limit={account.limits.storageBytes} format={formatBytes}/><form onSubmit={save}><PlanFields draft={draft} setDraft={setDraft} planIds={PERSONAL_PLAN_IDS}/><button disabled={busy}>Guardar plan</button></form></article>}</section>;
}

export function PlatformPlans({onNotify}){
 const [spaces,setSpaces]=useState(null),[error,setError]=useState('');
 const load=useCallback(async()=>{try{setError('');setSpaces((await api('/api/platform/workspaces')).workspaces);}catch(reason){setError(reason.message);}},[]);
 useEffect(()=>{load();},[load]);
 const pending=spaces?.filter(space=>space.status==='pending').length||0;
 return <div className="dashboard-page platform-plans"><header className="platform-head"><div><h1>Planes y empresas</h1><p>Activa planes mientras no esté integrada la pasarela de pago. Los límites se aplican en el servidor.</p></div>{pending>0&&<strong className="platform-pending">{pending} {pending===1?'empresa espera':'empresas esperan'} activación</strong>}</header>
  <NewCompany onCreated={load} onNotify={onNotify}/>
  {error&&<p role="alert" className="account-error">{error}</p>}
  {!spaces&&!error&&<p>Cargando empresas…</p>}
  <section className="platform-list">{spaces?.map(space=><CompanyRow key={`${space.id}-${space.plan}-${space.status}-${space.extraPacks}`} space={space} onSaved={load} onNotify={onNotify}/>)}</section>
  <PersonalAccount onNotify={onNotify}/></div>;
}
