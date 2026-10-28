import React,{useEffect,useRef} from 'react';
const h=React.createElement;
export function DeliveryPositionPicker({name,index,count,onChange}){
  const root=useRef(null);
  useEffect(()=>{
    const close=event=>{if(root.current&&!root.current.contains(event.target))root.current.open=false;};
    document.addEventListener('pointerdown',close);
    return()=>document.removeEventListener('pointerdown',close);
  },[]);
  const closeAndFocus=()=>{root.current.open=false;root.current.querySelector('summary').focus();};
  return h('details',{
    ref:root,className:'delivery-position-picker',
    onKeyDown:event=>{if(event.key==='Escape'){event.preventDefault();closeAndFocus();}},
    onBlur:event=>{if(!event.currentTarget.contains(event.relatedTarget))event.currentTarget.open=false;},
  },h('summary',{'aria-label':`Cambiar posición de ${name}. Posición actual ${index+1} de ${count}`},
    h('span',null,'Posición'),h('strong',null,String(index+1).padStart(2,'0')),
    h('svg',{width:12,height:12,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,'aria-hidden':true},h('path',{d:'m6 9 6 6 6-6'}))),
    h('div',{className:'delivery-position-panel',role:'group','aria-label':`Elegir posición de ${name}`},
      h('span',{className:'delivery-position-heading'},'Mover a posición'),
      h('div',{className:'delivery-position-options'},Array.from({length:count},(_,position)=>h('button',{
        key:position,type:'button','aria-label':`Mover a posición ${position+1}`,'aria-pressed':position===index,
        onClick:()=>{if(position!==index)onChange(position);closeAndFocus();},
      },String(position+1).padStart(2,'0'))))));
}
