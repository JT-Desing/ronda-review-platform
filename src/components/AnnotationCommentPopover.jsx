import React,{useState} from 'react';
import './annotation-comment-popover.css';

export function AnnotationCommentPopover({mark,onPublish,onClose,onUndo,disabled=false}){
  const [text,setText]=useState('');
  const point=mark?.points?.[0];
  if(!point)return null;
  const publish=async event=>{
    event.preventDefault();
    if(disabled||!text.trim())return;
    const result=await onPublish?.(mark,text.trim());
    if(result!==false)setText('');
  };
  return <form className="annotation-comment-popover" role="dialog" aria-label="Comentar esta anotación" style={{'--anchor-x':`${point.x*100}%`,'--anchor-y':`${point.y*100}%`}} onSubmit={publish} onKeyDown={event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();event.stopPropagation();onUndo?.();return;}if(event.key==='Escape'){event.preventDefault();onClose?.()}if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();event.currentTarget.requestSubmit()}}}>
    <header><span className="annotation-comment-avatar">R</span><strong>Deja un comentario</strong><button type="button" aria-label="Cerrar comentario" onClick={onClose}>×</button></header>
    <textarea autoFocus maxLength={2000} aria-label="Escribe un comentario para esta anotación" placeholder="Añade contexto sobre este punto…" value={text} onChange={event=>setText(event.target.value)}/>
    <footer><span>Ctrl/⌘ + Enter para publicar · Esc para cerrar</span><button type="submit" disabled={disabled||!text.trim()}>Publicar</button></footer>
  </form>;
}
