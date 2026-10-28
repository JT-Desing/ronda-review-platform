import React,{useEffect,useLayoutEffect,useRef,useState,useId} from 'react';
import {createPortal} from 'react-dom';
import {parseCommentCommand,priorityCommands,matchingPriorityCommands} from '../domain/comment-commands.js';
export function PriorityCommands({value,onChange}){
 const parsed=parseCommentCommand(value);
 const anchor=useRef(null),menu=useRef(null),id=useId();
 const [active,setActive]=useState(0),[dismissed,setDismissed]=useState(null),[position,setPosition]=useState(null);
 const options=matchingPriorityCommands(value),open=options.length>0&&dismissed!==value;
 const choose=item=>{onChange(`${item.command} `);anchor.current?.closest('.composer')?.querySelector('textarea')?.focus();};
 useEffect(()=>setActive(0),[value]);
 useLayoutEffect(()=>{
  if(!open)return;
  const field=anchor.current?.closest('.composer')?.querySelector('textarea');
  const measure=()=>{const bar=field?.closest('.composer-message-bar');if(!bar)return;const r=bar.getBoundingClientRect();const width=Math.min(340,r.width,window.innerWidth-24);setPosition({position:'fixed',left:Math.max(12,Math.min(r.left,window.innerWidth-width-12)),bottom:window.innerHeight-r.top+8,width,maxHeight:Math.max(80,Math.min(240,r.top-20))});};
  measure();window.addEventListener('resize',measure);window.addEventListener('scroll',measure,true);
  const key=event=>{if(event.target!==field)return;if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setDismissed(value);}else if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();event.stopPropagation();setActive(n=>(n+(event.key==='ArrowDown'?1:-1)+options.length)%options.length);}else if(event.key==='Enter'&&!event.ctrlKey&&!event.metaKey){event.preventDefault();event.stopPropagation();choose(options[Math.min(active,options.length-1)]);}};
  const outside=event=>{if(!menu.current?.contains(event.target)&&event.target!==field)setDismissed(value);};
  field?.setAttribute('aria-controls',id);field?.setAttribute('aria-expanded','true');
  field?.addEventListener('keydown',key,true);document.addEventListener('pointerdown',outside);
  return()=>{window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure,true);field?.removeEventListener('keydown',key,true);document.removeEventListener('pointerdown',outside);field?.removeAttribute('aria-controls');field?.setAttribute('aria-expanded','false');};
 },[open,value,active]);
 return <><span ref={anchor} className="sr-only"/>{open&&position&&createPortal(<div ref={menu} id={id} className="priority-command-menu" style={position} role="group" aria-label="Comandos de prioridad"><small>PRIORIDAD DEL COMENTARIO</small>{options.map((item,index)=><button key={item.command} className={active===index?'active':''} type="button" onMouseDown={e=>e.preventDefault()} onMouseEnter={()=>setActive(index)} onClick={()=>choose(item)}><span className={`command-dot command-dot-${item.priority}`} aria-hidden="true"/><strong>{item.command}</strong><span>{item.priority==='blocking'?'Impide aprobar mientras siga abierto':item.priority==='high'?'Destaca este comentario':'Sin prioridad especial'}</span></button>)}<footer>↑ ↓ Elegir · Enter Aplicar · Esc Cerrar</footer></div>,document.body)}{parsed.command&&<span className="sr-only" role="status">Prioridad: {priorityCommands.find(item=>item.command===parsed.command).label}</span>}</>;
}
