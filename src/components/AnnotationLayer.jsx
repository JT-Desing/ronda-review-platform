import React, {useRef,useState,useEffect} from 'react';
import {toNormalizedPoint,finalizeAnnotation} from '../domain/annotations.js';
export function AnnotationLayer({ activeTool, activeColor, marks, setMarks, selectedFigure }) {
  const canvas = useRef(null);
  const draft = useRef(null);
  const activePointer = useRef(null);
  const keyboardPoints = useRef([]);
  const [keyboardPoint,setKeyboardPoint]=useState({x:.5,y:.5});
  const [keyboardFocused,setKeyboardFocused]=useState(false);
  const [textEditor,setTextEditor]=useState(null);
  const [textValue,setTextValue]=useState('');
  const draw = () => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    const ratio = window.devicePixelRatio || 1;
    const box = el.getBoundingClientRect();
    const width=Math.round(box.width*ratio); const height=Math.round(box.height*ratio);
    if (el.width !== width || el.height !== height) { el.width=width;el.height=height; }
    ctx.setTransform(ratio,0,0,ratio,0,0);
    ctx.clearRect(0, 0, box.width, box.height);
    [...marks, ...(draft.current?.points.length ? [draft.current] : [])].forEach(mark => {
      ctx.shadowColor=mark.id===selectedFigure?'#f2bd5c':'transparent';ctx.shadowBlur=mark.id===selectedFigure?10:0;
      const pixels=mark.points.map(point=>({x:point.x*box.width,y:point.y*box.height}));
      if (mark.tool === 'pen') {
        ctx.strokeStyle = mark.color; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
        pixels.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
      }
      if (mark.tool === 'square' && mark.points.length > 1) {
        const [start,end]=[pixels[0],pixels.at(-1)]; ctx.strokeStyle=mark.color;ctx.lineWidth=4;ctx.strokeRect(start.x,start.y,end.x-start.x,end.y-start.y);
      }
      if (mark.tool === 'arrow' && mark.points.length > 1) {
        const [start,end]=[pixels[0],pixels.at(-1)]; const angle=Math.atan2(end.y-start.y,end.x-start.x);ctx.strokeStyle=mark.color;ctx.lineWidth=4;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(end.x,end.y);ctx.lineTo(end.x-14*Math.cos(angle-Math.PI/6),end.y-14*Math.sin(angle-Math.PI/6));ctx.moveTo(end.x,end.y);ctx.lineTo(end.x-14*Math.cos(angle+Math.PI/6),end.y-14*Math.sin(angle+Math.PI/6));ctx.stroke();
      }
      if (mark.tool === 'type') { ctx.fillStyle=mark.color;ctx.font='600 18px system-ui';ctx.fillText(mark.text,pixels[0].x,pixels[0].y); }
    });
    if(keyboardFocused){
      const x=keyboardPoint.x*box.width,y=keyboardPoint.y*box.height;
      ctx.save();ctx.strokeStyle=activeColor;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x-10,y);ctx.lineTo(x+10,y);ctx.moveTo(x,y-10);ctx.lineTo(x,y+10);ctx.stroke();ctx.restore();
    }
  };
  useEffect(draw, [marks,selectedFigure,keyboardPoint,keyboardFocused,activeColor]);
  useEffect(() => { const observer=new ResizeObserver(draw);if(canvas.current)observer.observe(canvas.current);return()=>observer.disconnect(); },[marks,selectedFigure,keyboardPoint,keyboardFocused,activeColor]);
  const point = e => toNormalizedPoint(e,canvas.current.getBoundingClientRect());
  const cancel=e=>{if(e&&activePointer.current!==e.pointerId)return;draft.current=null;activePointer.current=null;draw()};
  const finish=e=>{if(!draft.current||activePointer.current!==e.pointerId)return;draft.current.points.push(point(e));const mark=finalizeAnnotation(draft.current.tool,draft.current.color,draft.current.points);draft.current=null;activePointer.current=null;if(mark)setMarks(current=>[...current,mark]);else draw()};
  const closeText=commit=>{if(commit&&textEditor){const mark=finalizeAnnotation('type',textEditor.color,[textEditor.point],textValue);if(mark)setMarks(current=>[...current,mark]);}setTextEditor(null);setTextValue('')};
  return <><canvas ref={canvas} tabIndex={activeTool?0:-1} aria-label={activeTool?`Área de anotación con ${activeTool}. Usa flechas para mover el cursor, Shift más flecha para pasos amplios, Enter para iniciar y confirmar; Escape cancela.`:'Selecciona una herramienta de anotación para activar el área.'} className={`annotation-layer ${activeTool ? 'drawing' : ''}`}
    onFocus={()=>setKeyboardFocused(true)} onBlur={()=>setKeyboardFocused(false)}
    onKeyDown={e=>{
      if(!activeTool)return;
      if(e.key==='Escape'&&keyboardPoints.current.length){e.preventDefault();keyboardPoints.current=[];draft.current=null;draw();return;}
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){
        e.preventDefault();const step=e.shiftKey?.05:.01;
        const next={x:Math.max(0,Math.min(1,keyboardPoint.x+(e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0))),y:Math.max(0,Math.min(1,keyboardPoint.y+(e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0)))};
        setKeyboardPoint(next);
        if(keyboardPoints.current.length){
          keyboardPoints.current=activeTool==='pen'?[...keyboardPoints.current,next]:[keyboardPoints.current[0],next];
          draft.current={tool:activeTool,color:activeColor,points:keyboardPoints.current};draw();
        }
        return;
      }
      if(e.key==='Enter'){
        e.preventDefault();
        if(activeTool==='type'){setTextEditor({point:keyboardPoint,color:activeColor});setTextValue('');return;}
        if(!keyboardPoints.current.length){keyboardPoints.current=[keyboardPoint];draft.current={tool:activeTool,color:activeColor,points:keyboardPoints.current};draw();return;}
        if(activeTool==='pen'&&keyboardPoints.current.length===1&&keyboardPoints.current[0].x===keyboardPoint.x&&keyboardPoints.current[0].y===keyboardPoint.y){
          const next={x:Math.min(1,keyboardPoint.x+.01),y:keyboardPoint.y};keyboardPoints.current=[keyboardPoint,next];draft.current={tool:activeTool,color:activeColor,points:keyboardPoints.current};
        }
        const mark=finalizeAnnotation(activeTool,activeColor,keyboardPoints.current);
        if(mark)setMarks(current=>[...current,mark]);
        keyboardPoints.current=[];draft.current=null;draw();
      }
    }}
    onPointerDown={e => { if(!activeTool||activePointer.current!==null||e.isPrimary===false||(e.pointerType==='mouse'&&e.button!==0)) return; keyboardPoints.current=[];const start=point(e); if(activeTool==='type'){setTextEditor({point:start,color:activeColor});setTextValue('');return;} activePointer.current=e.pointerId;e.currentTarget.setPointerCapture?.(e.pointerId);draft.current={tool:activeTool,color:activeColor,points:[start]};draw(); }}
    onPointerMove={e => { if(!draft.current||activePointer.current!==e.pointerId) return;const next=point(e);if(draft.current.tool==='pen')draft.current.points.push(next);else draft.current.points=[draft.current.points[0],next];draw(); }}
    onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={e=>{if(draft.current)finish(e)}} />
    {textEditor&&<input className="annotation-text-input" autoFocus aria-label="Texto de la anotación" value={textValue} onChange={e=>setTextValue(e.target.value)} onKeyDown={e=>{e.stopPropagation();if(e.key==='Enter')closeText(true);if(e.key==='Escape')closeText(false)}} placeholder="Escribe y pulsa Enter · Esc cancela" style={{left:`${textEditor.point.x*100}%`,top:`${textEditor.point.y*100}%`,color:textEditor.color}}/>}</>;
}
