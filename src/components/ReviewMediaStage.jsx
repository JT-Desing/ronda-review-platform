import React,{useRef,useEffect,useState} from 'react';
import Icon from './Icon.jsx';
import {AnnotationLayer} from './AnnotationLayer.jsx';
import {annotationVisibleAt} from '../domain/annotations.js';
export function ReviewMediaStage({media,currentTime,onTime,marks,onMarks,tool,onTool,color,onColor,readonly,onSelect,selected}){
  const video=useRef(null),[ratio,setRatio]=useState(16/9);
  useEffect(()=>{if(video.current&&Math.abs(video.current.currentTime-currentTime)>.1)video.current.currentTime=currentTime;},[currentTime]);
  const drawing=!readonly&&tool;
  const visible=marks.filter(mark=>mark.draft||annotationVisibleAt(mark,currentTime,media.kind==='image'));
  return <section className="shared-review-media" aria-label="Pieza en revisión">
    <div className="shared-review-surface" style={{aspectRatio:ratio}}>
      {media.kind==='image'?<img src={media.url} alt={media.name} onLoad={e=>setRatio(e.currentTarget.naturalWidth/e.currentTarget.naturalHeight||1)}/>:<video ref={video} src={media.url} controls={!drawing} preload="metadata" onLoadedMetadata={e=>setRatio(e.currentTarget.videoWidth/e.currentTarget.videoHeight||16/9)} onTimeUpdate={e=>onTime(e.currentTarget.currentTime)}/>}
      <AnnotationLayer activeTool={drawing?tool:''} activeColor={color} marks={visible} selectedFigure={selected} setMarks={next=>{video.current?.pause();onMarks(typeof next==='function'?next(visible):next);}}/>
      {visible.filter(m=>!m.draft).map((mark,i)=><button className={`figure-pin ${selected===mark.id?'selected':''}`} key={mark.id} style={{left:`${mark.points[0].x*100}%`,top:`${mark.points[0].y*100}%`}} onClick={()=>onSelect(mark.id)} aria-label={`Abrir comentario de figura ${i+1}`}>{i+1}</button>)}
    </div>
    {!readonly&&<div className="shared-review-tools" aria-label="Herramientas de anotación">
      <button aria-pressed={!tool} onClick={()=>onTool('')}>Navegar</button>
      {['pen','arrow','square','type'].map((t,i)=><button key={t} aria-label={['Lápiz','Flecha','Rectángulo','Texto'][i]} aria-pressed={tool===t} onClick={()=>{video.current?.pause();onTool(t);}}><Icon name={t}/></button>)}
      <span className="shared-review-color-label">Color</span>{['#ff725e','#f2bd5c','#8ebd72','#67a9d4','#b89be8','#ffffff'].map(c=><button key={c} className="shared-review-swatch" aria-label={`Color ${c}`} aria-pressed={color===c} onClick={()=>onColor(c)}><span style={{background:c}}/></button>)}
    </div>}
    <small>{readonly?'Versión aprobada · solo lectura':tool?'Dibuja sobre la pieza y publica tu comentario para guardar la anotación.':'Elige una herramienta para señalar un cambio.'}</small>
  </section>;
}
