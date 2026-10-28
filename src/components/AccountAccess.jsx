import {BrandLoader} from './BrandLoader.jsx';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import './account-access.css';
import rondaLogo from '../ronda-logo-white-silver.svg';
import './account-brand.css';
import {WorkspaceOnboarding} from './WorkspaceOnboarding.jsx';
import {PasswordRecovery} from './PasswordRecovery.jsx';
import {hasPersonalWorkspaceChoice} from '../domain/onboarding.js';
import {completeSignup,isValidTeamName,showWorkspaceOnboarding} from '../domain/signup-flow.js';
import {initializeSignupCompletion} from '../domain/signup-completion.js';
import {isValidInvitationCode,readInvitationCode} from '../domain/invitation-link.js';
import {readLegacyFile, fileStore} from './DeliveryGrid.jsx';
import {importAccountState} from '../domain/account-import.js';
import { createSeedState, STORAGE_KEY } from '../data/seed.js';
import { RondaProvider } from '../state/RondaContext.jsx';
import {reauthenticateAccount} from '../state/sessionRecovery.js';
import {capturePasswordResetLink,clearPasswordResetLink,hasInvalidPasswordResetToken,passwordResetTokenFromUrl,readPasswordResetToken} from '../domain/password-reset-link.js';
import { api, accountStorage, initializeAccount, flushAccount, retryAccount, pendingAccountCopy, recoverCopy, dismissPendingCopy } from '../state/accountStorage.js';

const AccountActionsContext = createContext(null);
export function useAccountActions() {
  const value = useContext(AccountActionsContext);
  if (!value) throw new Error('Account actions are only available inside AccountAccess.');
  return value;
}

function freshState(user) {
  const state = createSeedState();
  state.currentUserId = user.id;
  state.workspace = { id: `account-${user.id}`, name: `Espacio de ${user.name}`, plan: 'free' };
  state.members = { [user.id]: { ...user, initials: user.name.slice(0, 2).toUpperCase(), role: 'admin', status: 'active' } };
  state.projects['project-amara'] = { ...state.projects['project-amara'], name: 'Mi primera revisión', client: '' };
  state.versions['version-amara-v3'] = { ...state.versions['version-amara-v3'], name: 'Primera revisión', reviewerIds: [user.id], decisions: {} };
  state.comments = {}; state.annotations = {}; state.assets = [];
  return state;
}
function SessionRecoveryDialog({user,onRecovered}){
  const dialog=useRef(null),passwordInput=useRef(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    const current=dialog.current;
    if(!current)return;
    current.showModal();
    const focusPassword=()=>passwordInput.current?.focus({preventScroll:true});
    focusPassword();
    const frame=requestAnimationFrame(focusPassword);
    return()=>{cancelAnimationFrame(frame);current.close();};
  },[]);
  return <dialog ref={dialog} className="account-card account-session-dialog" aria-labelledby="session-recovery-title" aria-describedby="session-recovery-description" onCancel={event=>event.preventDefault()}>
    <h1 id="session-recovery-title">Tu sesión terminó</h1>
    <p id="session-recovery-description">Vuelve a entrar con esta misma cuenta para continuar. Tu revisión y tu borrador siguen aquí; no recargues ni cierres esta pestaña.</p>
    <form onSubmit={async event=>{event.preventDefault();if(busy)return;const form=event.currentTarget;const password=new FormData(form).get('password');setBusy(true);setError('');try{await reauthenticateAccount(user,password,api);form.reset();onRecovered();}catch(failure){setError(failure.message);}finally{setBusy(false);}}}>
      <label>Correo<input value={user.email} type="email" autoComplete="username" readOnly tabIndex={-1}/></label>
      <label>Contraseña<input ref={passwordInput} name="password" type="password" autoComplete="current-password" required maxLength={128} autoFocus/></label>
      {error&&<p role="alert" className="account-error">{error}</p>}
      <button className="account-primary" disabled={busy}>{busy?<BrandLoader size="inline" label="Recuperando sesión…"/>:'Continuar con mi revisión'}</button>
    </form>
  </dialog>;
}
export default function AccountAccess({ children }) {
  const invitationCode=readInvitationCode(location.hash);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(()=>!new URLSearchParams(location.search).has('reset')&&!new URLSearchParams(location.hash.slice(1)).has('reset')&&!readPasswordResetToken());
  const [mode, setMode] = useState(()=>invitationCode?'register':'login');
  const [passwordVisible,setPasswordVisible]=useState(false);
  const [error, setError] = useState(new URLSearchParams(location.search).has('authError') ? 'No se pudo completar el acceso con Google. Si ya tienes cuenta con ese correo, usa tu contraseña.' : '');
  const [duplicateRegistration,setDuplicateRegistration]=useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ message: 'Guardado en el servidor', error: false });
  const [ready, setReady] = useState(false);
  const [importing, setImporting] = useState(false);
  const [mount, setMount] = useState(0);
  const [pending, setPending] = useState(null);
  const [onboarding,setOnboarding]=useState(false);
  const [signupWorkspace,setSignupWorkspace]=useState(()=>invitationCode?{choice:'join',name:'',code:invitationCode}:{choice:'personal',name:'',code:''});
  const [onboardingDraft,setOnboardingDraft]=useState(null);
  const [signupRecovery,setSignupRecovery]=useState(null);
  const [google, setGoogle] = useState(false);
  const [sessionExpired,setSessionExpired]=useState(false);
  const [resetToken,setResetToken]=useState(()=>passwordResetTokenFromUrl(location)||readPasswordResetToken());
  const [recoveryMode,setRecoveryMode]=useState(false);
  const [invalidResetLink,setInvalidResetLink]=useState(()=>hasInvalidPasswordResetToken(location));
  const [email,setEmail]=useState('');
  async function enter(account,{onboardingRecovery=false,signupChoice=''}={}) {
    const snapshot = await api('/api/data');
    await initializeSignupCompletion({initialize:initializeAccount,account,snapshot,choice:signupChoice,storage:accountStorage,flush:retryAccount});
    const {workspaces}=await api('/api/workspaces');
    const invitationOnboarding=Boolean(invitationCode&&!signupChoice);
    if(invitationOnboarding)setOnboardingDraft(current=>current||{choice:'join',name:'',code:invitationCode});
    setOnboarding(invitationOnboarding||showWorkspaceOnboarding(workspaces,hasPersonalWorkspaceChoice(accountStorage.getItem('ronda-onboarding:v1')),onboardingRecovery));
    const copy = pendingAccountCopy(); setPending(copy);
    if (!snapshot.data[STORAGE_KEY] && !copy) accountStorage.setItem(STORAGE_KEY, JSON.stringify(freshState(account)));
    setUser(account); setReady(true);
  }
  useEffect(() => {
    const captured=capturePasswordResetLink();
    if(captured){setResetToken(captured);setLoading(false);return;}
    api('/api/auth/session').then(async result => { if (result.user) { try { await enter(result.user); } catch (failure) { setSignupRecovery({account:result.user,onboardingRecovery:false,signupChoice:''}); setError(`Tu sesión sigue activa, pero no pudimos cargar tu espacio. ${failure.message}`); } } }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { if(resetToken)return;api('/api/health').then(result => setGoogle(result.google)).catch(() => {}); }, []);
  useEffect(() => { const listener = event => setStatus(event.detail); window.addEventListener('ronda-sync', listener); return () => window.removeEventListener('ronda-sync', listener); }, []);
  useEffect(()=>{const listener=()=>{if(user&&ready)setSessionExpired(true);};window.addEventListener('ronda-session-expired',listener);return()=>window.removeEventListener('ronda-session-expired',listener);},[user,ready]);
  const recovery=sessionExpired&&user&&<SessionRecoveryDialog user={user} onRecovered={()=>{setSessionExpired(false);window.dispatchEvent(new CustomEvent('ronda-session-restored'));retryAccount().catch(failure=>setError(failure.message));}}/>;
  async function submit(event) {
    event.preventDefault(); if(busy)return; setBusy(true); setError(''); setDuplicateRegistration(false);
    const form=event.currentTarget;
    const input = Object.fromEntries(new FormData(form));
    try {
      if(mode==='register'){
        const setup={choice:input.workspaceChoice||signupWorkspace.choice,name:input.teamName||signupWorkspace.name,code:input.invitationCode||signupWorkspace.code,requestId:crypto.randomUUID()};
        setOnboardingDraft(setup);
        const {workspaceChoice,teamName,invitationCode,...credentials}=input;
        const completion=await completeSignup({api,credentials,setup,enter:async(account,options)=>enter(account,options)});
        if(completion.workspaceId)location.hash=`#team/${completion.workspaceId}`;
        setOnboardingDraft(completion.onboardingDraft);
        if(completion.status==='retry'){
          setSignupRecovery({account:completion.account,...completion.recoveryOptions});
          setError(`Tu sesión sigue activa. No vuelvas a registrarte: no pudimos cargar tu espacio todavía. ${completion.error?.message||'Inténtalo de nuevo.'}`);
        }
    }else{
        const result=await api('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
        await enter(result.user);
      }
    }
    catch (e) {
      setOnboardingDraft(null);
      if(mode==='register'&&e.status===409){
        const password=form.elements.namedItem('password');
        if(password)password.value='';
        setDuplicateRegistration(true);
        setError(e.message||'No se pudo crear la cuenta. Intenta iniciar sesión.');
      }else setError(e.message);
    } finally { setBusy(false); }
  }
  async function retryCreatedSignup(){
    if(!signupRecovery||busy)return;
    setBusy(true);setError('');
    try{await enter(signupRecovery.account,signupRecovery);setSignupRecovery(null);}
    catch(failure){setError(`Tu cuenta y la información de registro siguen guardadas. Puedes volver a intentar cargar el espacio o iniciar sesión más tarde; no repetiremos el registro ni la incorporación automáticamente. ${failure.message}`);}
    finally{setBusy(false);}
  }
  async function logout() {
    setBusy(true); setError('');
    try { await flushAccount(); await api('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); setUser(null); setReady(false); }
    catch (e) { setError(`No se cerró la sesión para no perder cambios: ${e.message}`); } finally { setBusy(false); }
  }
  function useServerVersion() {
    try {
      dismissPendingCopy(pending);
      if (!accountStorage.getItem(STORAGE_KEY)) accountStorage.setItem(STORAGE_KEY, JSON.stringify(freshState(user)));
      setPending(null);
    } catch (e) { setError(`No se resolvió la copia pendiente y se conservó para recuperarla: ${e.message}`); }
  }
  async function importLocal() {
    setBusy(true); setError('');
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) throw new Error('No hay datos anteriores en este navegador.');
      const old = JSON.parse(raw);
      const imported = importAccountState(old,user);
      // Upload original IndexedDB media before importing references; old local data stays intact.
      const pauta = JSON.parse(localStorage.getItem('ronda-pauta:v1') || '{"groups":[],"campaigns":[]}');
      const ids = new Set([...(old.assets ?? []).map(a => a.id), ...(pauta.campaigns ?? []).flatMap(c => c.pieces ?? []).map(p => p.assetId).filter(Boolean)]);
      for (const id of ids) {
        const file = await readLegacyFile(id);
        if (!file) throw new Error('Falta un archivo de la copia local; no se importaron los datos.');
        await fileStore(id, file);
      }
      accountStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
      accountStorage.setItem('ronda-pauta:v1', JSON.stringify(pauta));
      await flushAccount(); setImporting(false); setMount(v => v + 1);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const accountActions = {
    user,
    status,
    busy,
    retrySave: () => retryAccount().catch(e => setError(e.message)),
    openImport: () => setImporting(true),
    logout,
  };
  if (loading) return <main className="account-access"><BrandLoader size="stage" label="Comprobando tu sesión…"/></main>;
  if(resetToken||recoveryMode||invalidResetLink)return <PasswordRecovery token={resetToken} invalidLink={invalidResetLink} initialEmail={email} onRequestNewLink={()=>{setInvalidResetLink(false);setRecoveryMode(true);}} onBack={()=>{clearPasswordResetLink();setRecoveryMode(false);setInvalidResetLink(false);setResetToken('');}}/>;
  if(user&&ready&&onboarding)return <>{recovery}<WorkspaceOnboarding user={user} initialChoice={onboardingDraft?.choice} initialName={onboardingDraft?.name} initialCode={onboardingDraft?.code} initialError={onboardingDraft?.error||''} initialRequestId={onboardingDraft?.requestId} onLogout={logout} onComplete={async workspaceId=>{if(workspaceId)location.hash=`#team/${workspaceId}`;else{accountStorage.setItem('ronda-onboarding:v1',JSON.stringify('personal'));await retryAccount();}setOnboardingDraft(null);setOnboarding(false);setMount(value=>value+1);}}/></>;
  if (!user || !ready) return <main className="account-access"><section className="account-card">
    <span className="account-brand"><img src={rondaLogo} alt=""/><span>Ronda</span></span>
    {signupRecovery&&<section className="account-recovery" aria-labelledby="account-recovery-title">
      <div className="account-recovery-status" role="status"><span className="account-recovery-status-icon" aria-hidden="true">✓</span><span>Tu acceso está conservado</span></div>
      <h1 id="account-recovery-title">Tu cuenta está activa</h1>
      <p className="account-recovery-copy">No pudimos cargar tu espacio en este intento. Tu sesión y la información del registro siguen guardadas; no necesitas crear otra cuenta ni volver a registrarte.</p>
      {error&&<div role="alert" className="account-recovery-error"><strong>No se pudo abrir el espacio</strong><p>{error}</p></div>}
      <button className="account-primary account-recovery-retry" type="button" disabled={busy} onClick={retryCreatedSignup}>{busy?<BrandLoader size="inline" label="Cargando tu espacio…"/>:'Reintentar cargar mi espacio'}</button>
      <button className="account-text-button" type="button" onClick={()=>{setSignupRecovery(null);setMode('login');setError('');}}>Ir a iniciar sesión</button>
    </section>}
    {!signupRecovery&&<>
    <h1>{mode === 'login' ? 'Tu próxima ronda empieza aquí.' : 'Crea tu espacio de revisión.'}</h1>
    <p>Proyectos, archivos y comentarios guardados en tu servidor.</p>
    <div className="account-tabs"><button aria-pressed={mode === 'login'} onClick={() => { setMode('login'); setPasswordVisible(false); setError(''); setDuplicateRegistration(false); }}>Iniciar sesión</button><button aria-pressed={mode === 'register'} onClick={() => { setMode('register'); setPasswordVisible(false); setError(''); setDuplicateRegistration(false); }}>Crear cuenta</button></div>
    {google && <button className="account-primary" onClick={() => location.assign('/api/auth/google')}>Continuar con Google</button>}
    <form onSubmit={submit}>
      {mode === 'register' && <label>Nombre<input name="name" autoComplete="name" required maxLength={100}/></label>}
      <label>Correo<input name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event=>setEmail(event.target.value)}/></label>
      <label className="account-password-label">Contraseña<span className="account-password-field"><input name="password" type={passwordVisible?'text':'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} aria-describedby={mode === 'register'?'signup-password-hint':undefined} required minLength={12} maxLength={128}/><button className="account-password-toggle" type="button" aria-label={passwordVisible?'Ocultar contraseña':'Mostrar contraseña'} aria-pressed={passwordVisible} onClick={()=>setPasswordVisible(value=>!value)}>{passwordVisible?'Ocultar':'Mostrar'}</button></span></label>
      {mode === 'register' && <>
        <small id="signup-password-hint">Usa al menos 12 caracteres. La recuperación de cuenta depende de que el correo esté configurado en el servidor.</small>
        <fieldset className="signup-workspace-choice">
          <legend>¿Cómo quieres empezar?</legend>
          <small>Tu espacio personal es privado. Si creas o aceptas una invitación, entraremos a ese equipo al terminar.</small>
          <label><input type="radio" name="workspaceChoice" value="personal" checked={signupWorkspace.choice==='personal'} onChange={()=>setSignupWorkspace(current=>({...current,choice:'personal'}))}/> Solo en mi espacio personal</label>
          <label><input type="radio" name="workspaceChoice" value="create" checked={signupWorkspace.choice==='create'} onChange={()=>setSignupWorkspace(current=>({...current,choice:'create'}))}/> Crear un equipo para mi empresa</label>
          <label><input type="radio" name="workspaceChoice" value="join" checked={signupWorkspace.choice==='join'} onChange={()=>setSignupWorkspace(current=>({...current,choice:'join'}))}/> Ya tengo un código de invitación</label>
          {signupWorkspace.choice==='create'&&<label>Nombre de la empresa o equipo<input name="teamName" autoComplete="organization" required maxLength={80} value={signupWorkspace.name} aria-invalid={signupWorkspace.name.length>0&&!isValidTeamName(signupWorkspace.name)} aria-describedby="signup-team-name-hint" onChange={event=>setSignupWorkspace(current=>({...current,name:event.target.value}))} placeholder="Ej. Estudio Aurora"/><small id="signup-team-name-hint">{signupWorkspace.name.length>0&&!isValidTeamName(signupWorkspace.name)?'Escribe al menos un carácter que no sea un espacio.':'El nombre se guardará sin espacios al inicio o al final.'}</small></label>}
          {signupWorkspace.choice==='join'&&<><label>Código de invitación<input name="invitationCode" autoComplete="off" spellCheck={false} required maxLength={43} value={signupWorkspace.code} aria-invalid={signupWorkspace.code.length>0&&!isValidInvitationCode(signupWorkspace.code)} aria-describedby="signup-invitation-code-hint" onChange={event=>setSignupWorkspace(current=>({...current,code:event.target.value.trim()}))} placeholder="Pega aquí el código del equipo"/></label><small id="signup-invitation-code-hint">{signupWorkspace.code.length>0&&!isValidInvitationCode(signupWorkspace.code)?'El código está incompleto o no tiene el formato esperado. Pega el código completo de la invitación.':'Pega el código completo de 43 caracteres recibido por correo; usa el mismo correo al que enviaron la invitación.'}</small></>}
        </fieldset>
      </>}
      {error && <p role="alert" className="account-error">{error}</p>}
      {duplicateRegistration&&<button className="account-text-button" type="button" onClick={()=>{setMode('login');setPasswordVisible(false);setDuplicateRegistration(false);setError('');}}>Ir a iniciar sesión con este correo</button>}
      <button className="account-primary" disabled={busy||(mode==='register'&&signupWorkspace.choice==='create'&&!isValidTeamName(signupWorkspace.name))||(mode==='register'&&signupWorkspace.choice==='join'&&!isValidInvitationCode(signupWorkspace.code))}>{busy ? <BrandLoader size="inline" label="Conectando…"/> : mode === 'login' ? 'Entrar a Ronda' : signupWorkspace.choice==='create'?'Crear cuenta y equipo':signupWorkspace.choice==='join'?'Crear cuenta y unirme':'Crear cuenta'}</button>
    </form>
    {mode==='login'&&<button className="account-text-button" type="button" onClick={()=>{setError('');setRecoveryMode(true);}}>¿Olvidaste tu contraseña?</button>}
    <p className="account-note">{!google && 'Google pendiente de configuración. '}Los datos viven en el PC que aloja Ronda; si está apagado, el servicio no estará disponible.</p>
    </>}
  </section></main>;
  return <>
    {recovery}
    {error && <div className="account-alert" role="alert">{error}</div>}
    {pending ? <div className="account-alert">Hay una copia local con cambios pendientes.
      <button disabled={busy} onClick={async () => { try { recoverCopy(pending); await flushAccount(); setMount(v => v + 1); setPending(null); } catch (e) { setError(e.message); } }}>Recuperar copia</button>
      <button onClick={useServerVersion}>Usar versión del servidor</button>
      <button onClick={() => { const url=URL.createObjectURL(new Blob([JSON.stringify(pending)],{type:'application/json'})); const link=document.createElement('a'); link.href=url;link.download='ronda-cambios-pendientes.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }}>Descargar copia pendiente</button>
    </div> : <>
      {importing && <section className="account-import"><h2>Importar datos de este navegador</h2><p>Reemplaza los datos de esta cuenta con la copia anterior, incluyendo Pauta y medios disponibles. No borra el original. Los nombres del equipo importado son referencias locales, no cuentas invitadas.</p><button disabled={busy} onClick={importLocal}>{busy ? 'Importando…' : 'Confirmar importación'}</button><button disabled={busy} onClick={() => setImporting(false)}>Cancelar</button></section>}
      <AccountActionsContext.Provider value={accountActions}>
        <RondaProvider key={`${user.id}:${mount}`} storage={accountStorage}>{children}</RondaProvider>
      </AccountActionsContext.Provider>
    </>}
  </>;
}
