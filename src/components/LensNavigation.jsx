import React, { useLayoutEffect, useRef, useState } from 'react';

// The frame is decorative: navigation and active-page semantics remain native buttons.
export default function LensNavigation({children,className='',label='Espacio',currentView,collapsed}) {
  const nav=useRef(null),[frame,setFrame]=useState(null),[target,setTarget]=useState(null);
  function aim(button){
    if(!button){setFrame(null);setTarget(null);return;}
    const root=nav.current.getBoundingClientRect(),box=button.getBoundingClientRect();
    setFrame({left:box.left-root.left,top:box.top-root.top,width:box.width,height:box.height});
    setTarget(button.dataset.lensId);
  }
  function restore(){const focused=nav.current.querySelector('button:focus-visible');aim(focused||nav.current.querySelector('button.active'));}
  useLayoutEffect(()=>{
    restore();
    const observer=new ResizeObserver(restore);observer.observe(nav.current);
    return()=>observer.disconnect();
  },[currentView,collapsed]);
  return <nav ref={nav} className={`${className} lens-nav ${target!==null?'lens-engaged':''}`} aria-label={label}
    onPointerOver={event=>{if(event.pointerType!=='mouse'||!matchMedia('(hover:hover) and (pointer:fine)').matches)return;const button=event.target.closest('button');if(button&&nav.current.contains(button))aim(button)}}
    onPointerLeave={restore} onFocus={event=>{if(event.target.tagName==='BUTTON')aim(event.target)}} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))restore()}}>
    {React.Children.map(children,(child,index)=>{
      if(!React.isValidElement(child))return child;
      const title=React.Children.toArray(child.props.children).find(item=>React.isValidElement(item)&&item.type==='span')?.props.children;
      return React.cloneElement(child,{'data-lens-id':String(index),'data-lens-focused':target===String(index)?'true':'false','aria-current':child.props.className==='active'?'page':undefined,'aria-label':typeof title==='string'?title:child.props['aria-label']});
    })}
    {frame&&<span className="lens-frame" aria-hidden="true" style={{width:frame.width,height:frame.height,transform:`translate(${frame.left}px,${frame.top}px)`}}><i/><i/><i/><i/></span>}
  </nav>;
}
