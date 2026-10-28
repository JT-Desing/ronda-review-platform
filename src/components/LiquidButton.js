import React,{useEffect,useId,useRef,useState} from 'react';
import {liquidGeometry,stepLiquid} from './liquid-motion.js';
const h=React.createElement;
export function LiquidButton({children,color='#FFFFFF',hoverColor='#201C29',intensity=1,duration=650,blur=5,padding='14px 24px',className='',style,...props}){
 const id='liquid-'+useId().replaceAll(':',''),svg=useRef(null),spring=useRef({amount:0,velocity:0}),phase=useRef(0),hover=useRef(false);
 const [target,setTarget]=useState(0),[reduced,setReduced]=useState(true);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
 useEffect(()=>{
  let frame,last;const draw=amount=>{const shapes=svg.current?.querySelectorAll('.liquid-lobe');liquidGeometry(amount,phase.current,intensity).forEach((point,i)=>{for(const [key,value] of Object.entries(point))shapes?.[i]?.setAttribute(key,String(value));});};
  if(reduced||props.disabled){spring.current={amount:0,velocity:0};draw(0);return;}
  const tick=time=>{const dt=last===undefined?1/60:Math.min((time-last)/1000,.025);last=time;phase.current+=dt*2.2;spring.current=stepLiquid(spring.current,target,dt);draw(spring.current.amount);if(spring.current.amount!==target||spring.current.velocity!==0)frame=requestAnimationFrame(tick);};
  frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[target,reduced,props.disabled,intensity]);
 const pointer=(name,event)=>{
  if(!props.disabled){
   if(name==='onPointerEnter'&&event.pointerType!=='touch'){hover.current=true;setTarget(1);}
   if(name==='onPointerLeave'||name==='onPointerCancel'){hover.current=false;setTarget(0);}
   if(name==='onPointerDown')setTarget(1.12);
   if(name==='onPointerUp')setTarget(hover.current?1:0);
  }
  props[name]?.(event);
 };
 const events=Object.fromEntries(['onPointerEnter','onPointerLeave','onPointerCancel','onPointerDown','onPointerUp'].map(name=>[name,event=>pointer(name,event)]));
 return h('button',{type:'button',...props,...events,className:`liquid-button ${className}`,style:{'--liquid-color':color,'--liquid-hover':hoverColor,'--liquid-duration':`${Math.max(100,duration)}ms`,'--liquid-padding':padding,...style}},
 h('svg',{ref:svg,className:'liquid-button-surface',viewBox:'0 0 240 56',preserveAspectRatio:'none','aria-hidden':true,focusable:'false'},
 h('defs',null,h('clipPath',{id:id+'-clip'},h('rect',{x:3,y:4,width:234,height:48,rx:24})),h('filter',{id,x:'-30%',y:'-100%',width:'160%',height:'300%',colorInterpolationFilters:'sRGB'},h('feGaussianBlur',{in:'SourceGraphic',stdDeviation:Math.max(0,Math.min(7,blur)),result:'soft'}),h('feColorMatrix',{in:'soft',type:'matrix',values:'1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9',result:'goo'}))),
 h('rect',{x:3,y:4,width:234,height:48,rx:24,className:'liquid-button-base'}),h('g',{clipPath:`url(#${id}-clip)`},h('g',{filter:`url(#${id})`,className:'liquid-button-shapes'},...liquidGeometry(0,0).map((point,i)=>h('ellipse',{key:i,className:'liquid-lobe',...point}))))),h('span',{className:'liquid-button-label'},children));
}
