import {planStatusNotice} from '../domain/plan-status.js';
import React,{useEffect,useState} from 'react';
import {api} from '../state/accountStorage.js';
import {PLAN_CATALOG,PLAN_STATUS_LABELS,formatBytes,usageLevel} from '../domain/plans.js';
import './platform-plans.css';

// workspaceId set: a team the viewer administers. Without it: the viewer's personal plan.
export function PlanUsage({workspaceId}){
 const [data,setData]=useState(null);
 useEffect(()=>{let live=true;setData(null);api(workspaceId?`/api/workspaces/${encodeURIComponent(workspaceId)}/plan`:'/api/account/plan').then(value=>live&&setData(value)).catch(()=>{});return()=>{live=false;};},[workspaceId]);
 if(!data)return null;
 const storage=usageLevel(data.usage.storageBytes,data.limits.storageBytes);
 const seats=workspaceId?usageLevel(data.usage.seats,data.limits.members):null;
 // Without an active plan the free limits apply only as a lock, so they are not shown as a quota.
 const active=data.status==='active';
 const warning=active&&(storage.warning||seats?.warning);
 const full=storage.percent>=100||seats?.percent>=100;
 return <section className={`plan-usage${warning?' warning':''}`} aria-label="Uso del plan">
  <div className="plan-usage-name"><strong>Plan {PLAN_CATALOG[data.plan]?.name}</strong><span className="plan-badge">{PLAN_STATUS_LABELS[data.status]}</span></div>
  {active&&seats&&<div className={`plan-meter${seats.warning?' warning':''}`}><span>Personas e invitaciones<strong>{data.usage.seats} de {data.limits.members}</strong></span><i style={{'--fill':`${seats.percent}%`}}/></div>}
  {!active&&<p className="plan-usage-current">En uso: {workspaceId?`${data.usage.seats} ${data.usage.seats===1?'persona':'personas'} · `:''}{formatBytes(data.usage.storageBytes)}</p>}
  {active&&<div className={`plan-meter${storage.warning?' warning':''}`}><span>Espacio<strong>{formatBytes(data.usage.storageBytes)} de {formatBytes(data.limits.storageBytes)}</strong></span><i style={{'--fill':`${storage.percent}%`}}/></div>}
  {data.status!=='active'&&<p role="status">{planStatusNotice(data.status,'admin')?.text}</p>}
  {warning&&<p role="status">{full?'Llegaste al límite del plan.':'Estás cerca del límite del plan.'} Escríbenos para sumar un paquete de 100 GB o cambiar de plan.</p>}
 </section>;
}
