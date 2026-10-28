import React,{useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {useRonda} from '../state/RondaContext.jsx';
import Icon from './Icon.jsx';
import LensNavigation from './LensNavigation.jsx';
import rondaLogo from '../ronda-logo-white-silver.svg';
import './workspace-card.css';
import {useAccountActions} from './AccountAccess.jsx';
import {canAccessStudioView} from '../domain/platform-access.js';

export default function Sidebar({ collapsed, setCollapsed, currentView, onNavigate, onDemo }) {
  const {state}=useRonda();
  const {user}=useAccountActions();
  const projectCount=Object.keys(state.projects||{}).length;
  const pieceCount=(state.assets||[]).length;
  const accountName=state.members[state.currentUserId]?.name||'Mi cuenta';
  const [accountMenu,setAccountMenu]=useState(false);
  const accountMenuTriggerRef=useRef(null);
  const accountPopoverRef=useRef(null);
  const [accountPopoverPosition,setAccountPopoverPosition]=useState(null);
  const updateAccountPopoverPosition=useCallback(()=>{
    const trigger=accountMenuTriggerRef.current;
    if(!trigger)return;
    const rect=trigger.getBoundingClientRect();
    const width=Math.min(312,Math.max(0,window.innerWidth-24));
    const left=Math.max(12,Math.min(rect.right-width,window.innerWidth-width-12));
    const height=Math.min(accountPopoverRef.current?.scrollHeight||300,window.innerHeight-24);
    const top=rect.top-height-12>=12?rect.top-height-12:Math.min(rect.bottom+12,window.innerHeight-height-12);
    setAccountPopoverPosition({top,left,width,maxHeight:window.innerHeight-24});
  },[]);
  useEffect(()=>{
    if(!accountMenu)return;
    const closeOnOutside=event=>{if(!accountMenuTriggerRef.current?.contains(event.target)&&!accountPopoverRef.current?.contains(event.target))setAccountMenu(false)};
    const closeOnEscape=event=>{if(event.key==='Escape')setAccountMenu(false)};
    document.addEventListener('pointerdown',closeOnOutside);
    document.addEventListener('keydown',closeOnEscape);
    window.addEventListener('resize',updateAccountPopoverPosition);
    window.addEventListener('scroll',updateAccountPopoverPosition,true);
    return()=>{document.removeEventListener('pointerdown',closeOnOutside);document.removeEventListener('keydown',closeOnEscape);window.removeEventListener('resize',updateAccountPopoverPosition);window.removeEventListener('scroll',updateAccountPopoverPosition,true)};
  },[accountMenu,updateAccountPopoverPosition]);
  useLayoutEffect(()=>{if(accountMenu)updateAccountPopoverPosition();else setAccountPopoverPosition(null)},[accountMenu,updateAccountPopoverPosition]);
  const accountPopoverReady=Boolean(accountPopoverPosition);
  useLayoutEffect(()=>{if(accountMenu&&accountPopoverReady)updateAccountPopoverPosition()},[accountMenu,accountPopoverReady,updateAccountPopoverPosition]);
  const closeAccountMenu=action=>{setAccountMenu(false);action?.()};
  return <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
    <button className="brand" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed?'Expandir navegación':'Contraer navegación'}>
      <span className="brand-mark" aria-hidden="true">{state.workspace.branding?.logo?<img src={state.workspace.branding.logo} alt=""/>:<img src={rondaLogo} alt=""/>}</span><span className="brand-name">{state.workspace.branding?.name||'Ronda'}</span><span className="sidebar-collapse-indicator" aria-hidden="true"><Icon name="chevron" size={15}/></span>
    </button>
    <LensNavigation className="side-nav" label="Principal" currentView={currentView} collapsed={collapsed}>
      <button className={currentView==='home'?'active':''} onClick={()=>onNavigate('home')}><Icon name="home"/><span>Inicio</span></button>
      <button className={currentView==='pauta'?'active':''} onClick={()=>onNavigate('pauta')}><Icon name="campaign"/><span>Pauta</span></button>
      <button className={currentView==='projects'?'active':''} onClick={()=>onNavigate('projects')}><Icon name="grid"/><span>Proyectos</span></button>
      <button className={currentView==='activity'?'active':''} onClick={()=>onNavigate('activity')}><Icon name="clock"/><span>Actividad</span></button>
      <button className={currentView==='planning'?'active':''} onClick={()=>onNavigate('planning')}><Icon name="calendar"/><span>Planificación</span></button>
{canAccessStudioView(user,'team')&&<button className={currentView==='team'?'active':''} onClick={()=>onNavigate('team')}><Icon name="users"/><span>Equipo</span></button>}
    </LensNavigation>
    <div className="side-label">ESPACIO</div>
    <LensNavigation className="side-nav lower" label="Espacio" currentView={currentView} collapsed={collapsed}>
      <button className={currentView==='personal'||currentView==='review'?'active':''} onClick={()=>onNavigate('personal')}><Icon name="personal"/><span>{state.workspace.name}</span></button>
{canAccessStudioView(user,'settings')&&<button className={currentView==='settings'?'active':''} onClick={()=>onNavigate('settings')}><Icon name="settings"/><span>Configuración</span></button>}
{canAccessStudioView(user,'branding')&&<button className={currentView==='branding'?'active':''} onClick={()=>onNavigate('branding')}><Icon name="image"/><span>Personalización</span></button>}
    </LensNavigation>
    <div className="account">
      <span className="avatar small sidebar-account-avatar">{state.members[state.currentUserId]?.initials}</span>
      <span className="account-copy"><strong>{state.members[state.currentUserId]?.name}</strong><small>Mi cuenta</small></span>
      <div className="account-menu-wrap"><button ref={accountMenuTriggerRef} className="account-menu-trigger" type="button" aria-label="Opciones de espacio y cuenta" aria-expanded={accountMenu} aria-controls="account-workspace-popover" onClick={()=>setAccountMenu(value=>!value)}>{collapsed?<span className="avatar small sidebar-account-menu-avatar" aria-hidden="true">{state.members[state.currentUserId]?.initials}</span>:<Icon name="more"/>}</button>{accountMenu&&accountPopoverPosition&&createPortal(<section ref={accountPopoverRef} className="account-popover account-workspace-card" id="account-workspace-popover" style={accountPopoverPosition} aria-label="Opciones del espacio de trabajo">
        <header className="account-popover-heading"><span className="account-popover-mark"><Icon name="personal" size={21}/></span><span><small className="account-popover-eyebrow">ESPACIO PERSONAL</small><strong title={accountName}>{accountName}</strong><small>Tu espacio de trabajo</small></span></header>
        <nav className="account-popover-links" aria-label="Accesos del espacio">
          <button className="account-popover-projects" type="button" aria-current={currentView==='personal'||currentView==='review'?'page':undefined} onClick={()=>closeAccountMenu(()=>onNavigate('personal'))}><Icon name="folder"/><span><strong>Mis proyectos</strong><small>{projectCount} {projectCount===1?'proyecto':'proyectos'}{' · '}{pieceCount} {pieceCount===1?'pieza':'piezas'}</small></span><Icon className="account-popover-link-tail" name="chevron" size={14}/></button>
          {canAccessStudioView(user,'settings')&&<small className="account-popover-section-label">PREFERENCIAS</small>}
{canAccessStudioView(user,'branding')&&<button type="button" onClick={()=>closeAccountMenu(()=>onNavigate('branding'))}><Icon name="image"/><span><strong>Personalización</strong><small>Marca y apariencia</small></span><Icon className="account-popover-link-tail" name="chevron" size={14}/></button>}
{canAccessStudioView(user,'settings')&&<button type="button" onClick={()=>closeAccountMenu(()=>onNavigate('settings'))}><Icon name="settings"/><span><strong>Configuración</strong><small>Preferencias del espacio</small></span><Icon className="account-popover-link-tail" name="chevron" size={14}/></button>}
        </nav>
        <p className="account-workspace-private">Los proyectos de este espacio son privados.</p>
        {onDemo&&<div className="account-popover-demo"><small className="account-popover-section-label">EXPLORAR</small><button type="button" onClick={()=>closeAccountMenu(onDemo)}><span className="account-popover-demo-icon"><Icon name="grid"/></span><span><strong>Empresa demo</strong><small>Datos ficticios · aislados de tu cuenta</small></span><Icon name="arrow"/></button></div>}
      </section>,document.body)}</div>
    </div>
  </aside>;
}
