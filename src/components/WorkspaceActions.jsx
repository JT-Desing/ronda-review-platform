import {ReviewSummaryDialog} from './ReviewSummaryDialog.jsx';
import React, { useState,useEffect } from 'react';
import { useRonda, selectPlanUsage } from '../state/RondaContext.jsx';
import { SharedProjects } from './SharedProjects.jsx';
import { ProjectLibrary } from './StudioWorkspace.jsx';
import {demoSession} from '../state/demoSession.js';

export function ProjectActions({onNotify,onDirtyChange}) {
  if(demoSession())return <div className="dashboard-page"><h1>Proyectos del equipo</h1><p>El modo demo no accede a los proyectos reales. Vuelve a tu cuenta para trabajar con ePayco MKT.</p></div>;
  return <SharedProjects onNotify={onNotify} onDirtyChange={onDirtyChange}/>;
}


export { WorkspaceTeam as TeamActions } from './WorkspaceTeam.jsx';

export function SettingsActions({ onNotify, onNavigate }) {
  const { state, act } = useRonda();
  const [draft, setDraft] = useState({ name: state.workspace.name, language: state.workspace.language || 'Español', comments: state.workspace.comments ?? true, downloads: state.workspace.downloads ?? false });
  const save = e => { e.preventDefault(); if (!draft.name.trim()) return onNotify('El nombre del espacio es obligatorio'); act('workspace/update', { ...draft, name: draft.name.trim() }); onNotify('Preferencias guardadas en este navegador'); };
  const baseline={name:state.workspace.name,language:state.workspace.language||'Español',comments:state.workspace.comments??true,downloads:state.workspace.downloads??false};
  const dirty=Object.keys(baseline).some(key=>baseline[key]!==draft[key]);
  return <form className="dashboard-page narrow settings-page" onSubmit={save}><header className="dashboard-header"><div><h1>Configuración</h1><p>Gestiona la identidad y las preferencias de tu espacio.</p></div></header><button type="button" className="mobile-settings-brand-link" onClick={() => onNavigate('branding')}><span><strong>Personalización</strong><small>Nombre comercial, logo y dominio</small></span><span aria-hidden="true">→</span></button><section className="settings-section"><div className="settings-section-title"><span className="settings-section-number">01</span><div><h2>Identidad del espacio</h2><p>Cómo se presenta tu equipo.</p></div></div><label>Nombre del espacio<input required maxLength={80} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}/></label><label>Idioma preferido<select value={draft.language} onChange={e => setDraft({ ...draft, language: e.target.value })}><option>Español</option><option>English</option><option>Português</option></select></label><p className="settings-note">El idioma se guarda como preferencia. La traducción de la interfaz aún no está disponible.</p></section><section className="settings-section"><div className="settings-section-title"><span className="settings-section-number">02</span><div><h2>Enlaces de revisión</h2><p>Preferencias para futuros enlaces.</p></div></div><p className="settings-note">Prototipo local: estas preferencias no protegen contenido privado ni aplican permisos de servidor.</p>{[['comments', 'Comentarios de invitados'], ['downloads', 'Descarga de originales']].map(([key, label]) => <label className="setting-toggle" key={key}><span><strong>{label}</strong><small>{key==='comments'?'Permitir comentarios sin crear una cuenta.':'Permitir obtener el archivo original.'}</small></span><input role="switch" aria-label={label} type="checkbox" checked={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.checked })}/></label>)}</section><footer className="settings-savebar"><span role="status">{dirty?'Tienes cambios sin guardar':'Preferencias actualizadas; consulta el estado de guardado arriba'}</span><div><button className="save-settings" disabled={!dirty||!draft.name.trim()} type="submit">Guardar cambios</button> <button className="discard-settings" disabled={!dirty} type="button" onClick={() => setDraft({ name: state.workspace.name, language: state.workspace.language || 'Español', comments: state.workspace.comments ?? true, downloads: state.workspace.downloads ?? false })}>Descartar cambios</button></div></footer></form>;
}

export function ReviewSummary({ onClose, versionId }) {
  const { state } = useRonda();
  const comments = Object.values(state.comments).filter(c => c.versionId === versionId);
  return <ReviewSummaryDialog comments={comments} members={state.members} onClose={onClose}/>;
}
