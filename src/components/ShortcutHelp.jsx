import React,{useEffect} from 'react';
import Icon from './Icon.jsx';
export function ShortcutHelp({onClose}) {
  useEffect(()=>{const previous=document.activeElement;const close=document.querySelector('[aria-label="Cerrar atajos"]');close?.focus();const handler=e=>{if(e.key==='Escape'){e.stopPropagation();onClose();}};window.addEventListener('keydown',handler);return()=>{window.removeEventListener('keydown',handler);previous?.focus();};},[onClose]);
  const shortcuts=[['Ctrl/⌘ + Z','Deshacer última anotación'],['Ctrl/⌘ + Shift + Z','Rehacer anotación'],['Espacio','Reproducir / pausar'],['J / L','Retroceder / avanzar 5 s'],['← / →','Mover un fotograma'],['1–4','Lápiz, flecha, rectángulo y texto'],['D','Activar u ocultar dibujo'],['M','Silenciar'],['F','Pantalla completa'],['C','Escribir comentario'],['Ctrl/⌘ + Enter','Publicar comentario'],['Esc','Cerrar paneles']];
  return <div className="modal-layer"><button className="modal-scrim" aria-label="Cerrar atajos" onClick={onClose}/><section className="modal shortcut-modal" role="dialog" aria-modal="true" aria-labelledby="shortcut-title"><div className="modal-title"><div><span className="eyebrow">COMANDOS RÁPIDOS</span><h2 id="shortcut-title">Atajos de revisión</h2></div><button aria-label="Cerrar" onClick={onClose}><Icon name="x"/></button></div><div className="shortcut-grid">{shortcuts.map(([keys,label])=><div key={keys}><kbd>{keys}</kbd><span>{label}</span></div>)}</div></section></div>;
}

