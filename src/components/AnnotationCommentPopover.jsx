import React,{useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import MentionInput from './MentionInput.jsx';
import {movePopover,placePopover} from '../domain/popover-position.js';
import './annotation-comment-popover.css';

export function AnnotationCommentPopover({mark,onPublish,onClose,onUndo,disabled=false,people}){
  const [text,setText]=useState('');
  const [host,setHost]=useState(null);
  const [place,setPlace]=useState(null);
  const anchor=useRef(null),form=useRef(null),dragged=useRef(false);
  const point=mark?.points?.[0];
  // Rendered outside the media viewport, which clips and scrolls its content.
  useLayoutEffect(()=>{
    const pick=()=>setHost(document.fullscreenElement||anchor.current?.closest('.app-shell')||document.body);
    pick();
    document.addEventListener('fullscreenchange',pick);
    return ()=>document.removeEventListener('fullscreenchange',pick);
  },[]);
  useLayoutEffect(()=>{
    if(!host||!anchor.current||!form.current)return undefined;
    dragged.current=false;
    const update=()=>{
      if(!anchor.current||!form.current)return;
      const {left,top}=anchor.current.getBoundingClientRect(),{width,height}=form.current.getBoundingClientRect();
      const viewport={width:window.innerWidth,height:window.innerHeight};
      setPlace(current=>dragged.current?movePopover(current,{x:0,y:0},{width,height},viewport):placePopover({x:left,y:top},{width,height},viewport));
    };
    update();
    window.addEventListener('resize',update);
    window.addEventListener('scroll',update,true);
    return ()=>{window.removeEventListener('resize',update);window.removeEventListener('scroll',update,true);};
  },[host,point?.x,point?.y]);
  if(!point)return null;
  const publish=async event=>{
    event.preventDefault();
    if(disabled||!text.trim())return;
    const result=await onPublish?.(mark,text.trim());
    if(result!==false)setText('');
  };
  const startDrag=event=>{
    if(event.button!==0||event.target.closest('button')||!place)return;
    event.preventDefault();event.stopPropagation();
    const header=event.currentTarget,start={x:event.clientX,y:event.clientY},from=place,{width,height}=form.current.getBoundingClientRect();
    const move=next=>{dragged.current=true;setPlace(movePopover(from,{x:next.clientX-start.x,y:next.clientY-start.y},{width,height},{width:window.innerWidth,height:window.innerHeight}));};
    const stop=()=>{header.removeEventListener('pointermove',move);header.removeEventListener('pointerup',stop);header.removeEventListener('pointercancel',stop);};
    header.setPointerCapture(event.pointerId);
    header.addEventListener('pointermove',move);
    header.addEventListener('pointerup',stop);
    header.addEventListener('pointercancel',stop);
  };
  return <>
    <span ref={anchor} aria-hidden="true" style={{position:'absolute',left:`${point.x*100}%`,top:`${point.y*100}%`,pointerEvents:'none'}}/>
    {host&&createPortal(<form ref={form} className="annotation-comment-popover" data-placement={place?.placement} role="dialog" aria-label="Comentar esta anotación" style={{left:place?.left??0,top:place?.top??0,opacity:place?1:0}} onSubmit={publish} onKeyDown={event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();event.stopPropagation();onUndo?.();return;}if(event.key==='Escape'){event.preventDefault();onClose?.()}if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();event.currentTarget.requestSubmit()}}}>
      <header onPointerDown={startDrag} title="Arrastra para mover"><span className="annotation-comment-avatar">R</span><strong>Deja un comentario</strong><button type="button" aria-label="Cerrar comentario" onClick={onClose}>×</button></header>
      <MentionInput autoFocus maxLength={2000} aria-label="Escribe un comentario para esta anotación" placeholder="Añade contexto sobre este punto… usa @ para etiquetar" people={people} note={people?'Le llega un aviso en Ronda y por correo':undefined} value={text} onChange={event=>setText(event.target.value)}/>
      <footer><span>Ctrl/⌘ + Enter para publicar · Esc para cerrar</span><button type="submit" disabled={disabled||!text.trim()}>Publicar</button></footer>
    </form>,host)}
  </>;
}
