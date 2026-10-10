import React,{useEffect,useState} from 'react';

export default function PreviewLikeCount({active}){
  const [count,setCount]=useState(0);
  useEffect(()=>{
    if(!active){setCount(0);return;}
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){setCount(325);return;}
    let frame,start;
    const tick=time=>{start??=time;const progress=Math.min(1,(time-start)/1400);setCount(Math.round(325*(1-Math.pow(1-progress,3))));if(progress<1)frame=requestAnimationFrame(tick)};
    setCount(0);frame=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(frame);
  },[active]);
  return <span title="325 me gusta simulados · referencia visual" aria-label="325 me gusta de demostración, no métricas reales"><span aria-hidden="true">{count}</span></span>;
}
