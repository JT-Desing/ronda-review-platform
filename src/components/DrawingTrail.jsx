import React, {useEffect,useRef} from 'react';

// Decorative feedback only during a captured annotation gesture.
export default function DrawingTrail({enabled,color}) {
  const ref=useRef(null);
  useEffect(()=>{
    if(!enabled)return;
    const canvas=ref.current,ctx=canvas.getContext('2d');
    const reduced=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(hover: hover) and (pointer: fine)');
    let pointer=null,points=[],frame=0,w=0,h=0;
    const clear=()=>ctx.clearRect(0,0,w,h);
    function stop(){cancelAnimationFrame(frame);frame=0;pointer=null;points=[];clear();}
    function resize(){stop();w=innerWidth;h=innerHeight;const dpr=Math.min(devicePixelRatio||1,3);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
    function draw(now){frame=0;clear();points=points.filter(p=>now-p.time<180);if(pointer===null||points.length<2)return;
      const head=points.at(-1),tail=points[0],left=[],right=[];
      points.forEach((p,i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b.x-a.x,dy=b.y-a.y,n=Math.hypot(dx,dy)||1;const age=Math.max(0,1-(now-p.time)/180),width=(.15+age*1.1);left.push({x:p.x-dy/n*width,y:p.y+dx/n*width});right.push({x:p.x+dy/n*width,y:p.y-dx/n*width});});
      function edge(list){ctx.lineTo(list[0].x,list[0].y);for(let i=1;i<list.length-1;i++)ctx.quadraticCurveTo(list[i].x,list[i].y,(list[i].x+list[i+1].x)/2,(list[i].y+list[i+1].y)/2);ctx.lineTo(list.at(-1).x,list.at(-1).y);}
      const gradient=ctx.createLinearGradient(tail.x,tail.y,head.x,head.y);gradient.addColorStop(0,'transparent');gradient.addColorStop(1,color||'#ff725e');ctx.fillStyle=gradient;ctx.globalAlpha=.75;ctx.beginPath();ctx.moveTo(left[0].x,left[0].y);edge(left);edge(right.reverse());ctx.closePath();ctx.fill();ctx.globalAlpha=1;frame=requestAnimationFrame(draw);
    }
    function move(e){if(pointer!==e.pointerId)return;if(!(e.buttons&1)){stop();return;}const previous=points.at(-1),time=performance.now();const next={x:e.clientX,y:e.clientY,time};if(previous&&Math.hypot(next.x-previous.x,next.y-previous.y)<.5)return;points.push(next);if(points.length>40)points.shift();if(!frame)frame=requestAnimationFrame(draw);}
    function start(e){if(e.button!==0||e.pointerType!=='mouse'||reduced.matches||!fine.matches||!e.target.matches?.('canvas.annotation-layer.drawing'))return;stop();pointer=e.pointerId;move(e);}
    function end(e){if(e.pointerId===pointer)stop();}
    resize();window.addEventListener('pointerdown',start,{passive:true});window.addEventListener('pointermove',move,{passive:true});window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);window.addEventListener('lostpointercapture',end);window.addEventListener('blur',stop);window.addEventListener('resize',resize);document.addEventListener('visibilitychange',stop);reduced.addEventListener('change',stop);fine.addEventListener('change',stop);
    return()=>{stop();window.removeEventListener('pointerdown',start);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',end);window.removeEventListener('lostpointercapture',end);window.removeEventListener('blur',stop);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',stop);reduced.removeEventListener('change',stop);fine.removeEventListener('change',stop);};
  },[enabled,color]);
  return enabled?<canvas ref={ref} aria-hidden="true" style={{position:'fixed',inset:0,width:'100vw',height:'100vh',pointerEvents:'none',zIndex:900}}/>:null;
}
