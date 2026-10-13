import React,{useEffect,useId,useState} from 'react';
const h=React.createElement;
const profiles={home:[1,1,0,0],projects:[.87,1.08,64,-25],pauta:[1.06,.78,-68,38],planning:[.76,1.15,90,26],activity:[1.12,.9,38,-64],team:[.9,.88,-90,48],branding:[1.04,1.05,54,65],settings:[.84,1.1,-42,-54]};
// Warp every shared control point identically, preserving joins between the ribbon's faces.
function contour(path,section){const [sx,sy,bend,rise]=profiles[section]||profiles.home;return path.replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g,(_,a,b)=>{const x=Number(a),y=Number(b);return `${(320+(x-320)*sx+bend*Math.sin(y/640*Math.PI)).toFixed(2)} ${(320+(y-320)*sy+rise*Math.sin(x/640*Math.PI)).toFixed(2)}`;});}
export function AbstractRibbon({section='home'}){
 const id=useId().replaceAll(':',''),[motion,setMotion]=useState(false);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setMotion(!media.matches&&!document.hidden);update();media.addEventListener('change',update);document.addEventListener('visibilitychange',update);return()=>{media.removeEventListener('change',update);document.removeEventListener('visibilitychange',update);};},[]);
 const gradient=(name,colors,x1,y1,x2,y2)=>h('linearGradient',{id:id+name,gradientUnits:'userSpaceOnUse',x1,y1,x2,y2},colors.map((color,i)=>h('stop',{key:i,offset:`${i/(colors.length-1)*100}%`,stopColor:color,className:`ribbon-color-${i}`})));
 const face=(d,name)=>h('path',{d:contour(d,section),className:`ribbon-face ribbon-face-${name}`,fill:`url(#${id+name})`});
 return h('svg',{className:`abstract-ribbon${motion?' is-animated':''}`,viewBox:'0 0 640 640','aria-hidden':true,focusable:'false'},
 h('defs',null,
 gradient('back',['#7960b6','#b490dc','#efb4d3'],180,130,420,430),
 gradient('front',['#c8b1f5','#f4c5dc','#ffe2ab'],100,170,560,460),
 gradient('turn',['#ffe2ab','#eeb3d5','#a58ad7'],150,320,310,540),
 gradient('crown',['#bc9be9','#edbcdb','#ffd6b2'],225,80,480,280),
 h('linearGradient',{id:id+'crease',x1:0,y1:0,x2:1,y2:1},h('stop',{stopColor:'#35214f',stopOpacity:.3}),h('stop',{offset:1,stopColor:'#35214f',stopOpacity:0}))),
 h('g',{className:'ribbon-sculpture'},
 face('M240 90 C365 10 495 80 470 225 C440 350 245 395 190 480 L130 430 C195 310 377 288 398 196 C420 115 335 95 288 142 Z','back'),
 face('M110 348 C90 450 210 500 320 420 C440 330 530 350 545 440 C555 514 484 540 440 515 L451 569 C570 615 642 472 593 389 C532 277 395 308 290 380 C207 438 157 409 162 353 Z','turn'),
 face('M240 90 C275 52 341 53 395 83 C449 114 450 172 398 196 C379 133 322 126 288 142 C220 178 237 248 338 283 C430 313 550 288 640 240 L640 327 C514 384 387 384 277 333 C169 283 158 149 240 90 Z','crown'),
 face('M0 331 C76 283 130 272 186 294 C260 323 258 404 318 416 C408 438 551 350 640 305 L640 396 C499 473 407 510 314 494 C211 476 215 392 159 372 C119 358 61 388 0 432 Z','front'),
 h('path',{d:contour('M186 294 C218 310 245 343 260 378 C232 346 204 332 173 338 C138 342 116 362 110 391 C109 350 131 303 186 294 Z',section),fill:`url(#${id}crease)`})));
}
