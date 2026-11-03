import React, { useEffect, useState } from 'react';
import { api } from '../state/accountStorage.js';
import { PLAN_CATALOG, TEAM_PLAN_IDS, PERSONAL_PLAN_IDS } from '../domain/plans.js';
import { PlanUsage } from './PlanUsage.jsx';
import { AccountDeletion } from './AccountDeletion.jsx';
import './account-page.css';

const send = (path, method, body) => api(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const EMAIL_OPTIONS = [['all', 'Todo', 'Menciones, archivos nuevos, comentarios, decisiones y proyectos.'], ['mentions', 'Solo menciones', 'Cuando alguien te etiqueta con @.'], ['none', 'Nada', 'Solo verás los avisos en la campana.']];

function Section({ number, title, text, children }) {
  return <section className="settings-section"><div className="settings-section-title"><span className="settings-section-number">{number}</span><div><h2>{title}</h2><p>{text}</p></div></div>{children}</section>;
}

function useAction() {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(null);
  const run = async (work, ok) => {
    setBusy(true); setMessage(null);
    try { await work(); setMessage({ ok: true, text: ok }); } catch (error) { setMessage({ ok: false, text: error.message }); } finally { setBusy(false); }
  };
  const feedback = message && <p role={message.ok ? 'status' : 'alert'} className={message.ok ? 'account-ok' : 'account-error'}>{message.text}</p>;
  return { busy, run, feedback };
}

function Profile({ settings, onSaved }) {
  const [name, setName] = useState(settings.name), { busy, run, feedback } = useAction();
  return <Section number="01" title="Perfil" text="Así te ven tu equipo y tus clientes.">
    <form onSubmit={event => { event.preventDefault(); run(async () => { onSaved(await send('/api/account/settings', 'PATCH', { name })); setTimeout(() => location.reload(), 700); }, 'Nombre guardado. Actualizando…'); }}>
      <label>Nombre<input required maxLength={100} value={name} disabled={busy} onChange={event => setName(event.target.value)}/></label>
      <label>Correo<input value={settings.email} readOnly disabled/></label>
      <button type="submit" disabled={busy || !name.trim() || name.trim() === settings.name}>Guardar nombre</button>{feedback}
    </form>
  </Section>;
}

function Password() {
  const [current, setCurrent] = useState(''), [next, setNext] = useState(''), { busy, run, feedback } = useAction();
  return <Section number="02" title="Contraseña" text="Al cambiarla se cierran tus otras sesiones.">
    <form onSubmit={event => { event.preventDefault(); run(async () => { await send('/api/account/password', 'POST', { currentPassword: current, newPassword: next }); setCurrent(''); setNext(''); }, 'Contraseña actualizada.'); }}>
      <label>Contraseña actual<input type="password" autoComplete="current-password" value={current} disabled={busy} onChange={event => setCurrent(event.target.value)}/></label>
      <label>Nueva contraseña<input type="password" autoComplete="new-password" minLength={12} maxLength={128} value={next} disabled={busy} onChange={event => setNext(event.target.value)}/><small>Mínimo 12 caracteres.</small></label>
      <button type="submit" disabled={busy || !current || next.length < 12}>Cambiar contraseña</button>{feedback}
    </form>
  </Section>;
}

function Plan() {
  const [teams, setTeams] = useState([]), [target, setTarget] = useState(''), [plan, setPlan] = useState(''), [note, setNote] = useState(''), { busy, run, feedback } = useAction();
  useEffect(() => { api('/api/workspaces').then(data => setTeams((data.workspaces || []).filter(space => space.kind === 'team' && space.role === 'admin'))).catch(() => {}); }, []);
  const options = target ? TEAM_PLAN_IDS : PERSONAL_PLAN_IDS;
  return <Section number="03" title="Mi plan" text="Tu uso actual y, si lo necesitas, otro plan. Te respondemos por correo para activarlo.">
    <PlanUsage/>
    <form onSubmit={event => { event.preventDefault(); run(async () => { await send('/api/account/plan-request', 'POST', { plan, note, ...(target ? { workspaceId: target } : {}) }); setNote(''); }, 'Solicitud enviada. Te escribiremos para activarlo.'); }}>
      {teams.length > 0 && <label>Para<select value={target} disabled={busy} onChange={event => { setTarget(event.target.value); setPlan(''); }}><option value="">Mi cuenta personal</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name} (equipo)</option>)}</select></label>}
      <label>Plan<select value={plan} disabled={busy} onChange={event => setPlan(event.target.value)}><option value="">Elige un plan</option>{options.map(id => <option key={id} value={id}>{PLAN_CATALOG[id].name}</option>)}</select></label>
      <label>Nota (opcional)<textarea maxLength={500} rows={2} value={note} disabled={busy} onChange={event => setNote(event.target.value)}/></label>
      <button type="submit" disabled={busy || !plan}>Pedir cambio de plan</button>{feedback}
    </form>
  </Section>;
}

function Notifications({ settings, onSaved }) {
  const { busy, run, feedback } = useAction();
  return <Section number="04" title="Correos de novedades" text="Los avisos siempre aparecen en la campana. Aquí eliges cuáles te llegan también por correo.">
    <fieldset className="account-choices" disabled={busy}><legend className="visually-hidden">Correos de novedades</legend>
      {EMAIL_OPTIONS.map(([value, label, help]) => <label key={value} className="account-choice"><input type="radio" name="email-notifications" checked={settings.emailNotifications === value} onChange={() => run(async () => onSaved(await send('/api/account/settings', 'PATCH', { emailNotifications: value })), 'Preferencia guardada.')}/><span><strong>{label}</strong><small>{help}</small></span></label>)}
    </fieldset>{feedback}
  </Section>;
}

export function AccountPage() {
  const [settings, setSettings] = useState(null), [error, setError] = useState(''), [deleting, setDeleting] = useState(false);
  useEffect(() => { api('/api/account/settings').then(setSettings).catch(reason => setError(reason.message)); }, []);
  if (error) return <div className="dashboard-page narrow"><p role="alert">{error}</p></div>;
  if (!settings) return null;
  return <div className="dashboard-page narrow settings-page account-page">
    <header className="dashboard-header"><div><h1>Mi cuenta</h1><p>Tus datos, tu plan y qué correos recibes.</p></div></header>
    <Profile settings={settings} onSaved={setSettings}/>
    <Password/>
    <Plan/>
    <Notifications settings={settings} onSaved={setSettings}/>
    <Section number="05" title="Eliminar cuenta" text="Borra tus datos personales y te saca de todos los equipos. No se puede deshacer.">
      <button type="button" className="account-danger" onClick={() => setDeleting(true)}>Eliminar mi cuenta</button>
    </Section>
    {deleting && <AccountDeletion email={settings.email} onClose={() => setDeleting(false)}/>}
  </div>;
}
