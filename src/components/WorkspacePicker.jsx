import React,{useEffect,useId,useRef,useState} from 'react';
import Icon from './Icon.jsx';

export default function WorkspacePicker({spaces,value,onChange,disabled}){
  const id=useId(),root=useRef(null),trigger=useRef(null),search=useRef({text:'',time:0});
  const [open,setOpen]=useState(false),[active,setActive]=useState(0);
  const selected=spaces.findIndex(space=>space.id===value),space=spaces[selected];
  const show=()=>{setActive(Math.max(0,selected));setOpen(true)};
  const choose=index=>{if(!spaces[index])return;onChange(spaces[index].id);setOpen(false);trigger.current?.focus()};
  useEffect(()=>{if(disabled)setOpen(false)},[disabled]);
  useEffect(()=>{if(!open)return;const close=e=>{if(!root.current?.contains(e.target))setOpen(false)};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close)},[open]);
  useEffect(()=>{if(open)root.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({block:'nearest'})},[open,active]);
  const keyDown=e=>{
    if(e.key==='Escape'){e.preventDefault();setOpen(false);return}
    if(e.key==='Tab'){setOpen(false);return}
    if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
      e.preventDefault();if(!open){show();return}
      setActive(n=>e.key==='Home'?0:e.key==='End'?spaces.length-1:Math.max(0,Math.min(spaces.length-1,n+(e.key==='ArrowDown'?1:-1))));return;
    }
    if(e.key==='Enter'||e.key===' '){e.preventDefault();open?choose(active):show();return}
    if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
      const now=Date.now();search.current={text:(now-search.current.time<700?search.current.text:'')+e.key.toLocaleLowerCase(),time:now};
      const index=spaces.findIndex(s=>s.name.toLocaleLowerCase().startsWith(search.current.text));
      if(index>=0){e.preventDefault();setActive(index);setOpen(true)}
    }
  };
  return <div className="workspace-picker" ref={root} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false)}}>
    <span id={`${id}-label`} className="team-field-label">Espacio de trabajo</span>
    <button ref={trigger} type="button" className="workspace-picker-trigger" role="combobox" aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open?`${id}-list`:undefined} aria-activedescendant={open?`${id}-option-${active}`:undefined} disabled={disabled} onKeyDown={keyDown} onClick={()=>open?setOpen(false):show()}>
      <span className="workspace-picker-mark"><Icon name="folder" size={18}/></span>
      <span id={`${id}-value`}>{space?.name||'Sin espacios disponibles'}</span><Icon name="chevron" size={16}/>
    </button>
    {open&&<div className="workspace-picker-popup"><div className="workspace-picker-caption">TUS ESPACIOS <span>{spaces.length}</span></div>
      <div role="listbox" aria-labelledby={`${id}-label`} id={`${id}-list`}>
        {spaces.map((option,index)=><div key={option.id} id={`${id}-option-${index}`} role="option" aria-selected={option.id===value} data-index={index} className={`workspace-picker-option ${active===index?'highlighted':''}`} onPointerMove={()=>setActive(index)} onPointerDown={e=>e.preventDefault()} onClick={()=>choose(index)}>
          <span className="workspace-picker-mark"><Icon name="folder" size={17}/></span><span><strong>{option.name}</strong><small>{option.id===value?'Espacio actual':'Cambiar a este espacio'}</small></span>{option.id===value&&<Icon name="check" size={16}/>}
        </div>)}
      </div>
      <p>Los permisos se aplican por espacio.</p>
    </div>}
  </div>;
}
