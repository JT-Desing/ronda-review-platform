import React from 'react';
import {PLAN_CATALOG,TEAM_PLAN_IDS,planSummary} from '../domain/plans.js';
import './platform-plans.css';
export function TeamPlanPicker({value,onChange,disabled}){
 return <fieldset className="team-plan-picker" disabled={disabled}><legend>Plan del equipo</legend>{TEAM_PLAN_IDS.map(id=><label key={id} className={value===id?'selected':''}><input type="radio" name="team-plan" value={id} checked={value===id} onChange={()=>onChange(id)}/><span><strong>{PLAN_CATALOG[id].name}</strong><small>{planSummary(id)}</small></span></label>)}<p>El equipo queda pendiente hasta que Ronda active el plan. Mientras tanto solo lo usas tú, con 2 GB.</p></fieldset>;
}
