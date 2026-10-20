import React,{useState,useEffect,useRef} from 'react';
import {AnnotationLayer} from './AnnotationLayer.jsx';
import Icon from './Icon.jsx';
import './external-artifacts.css';
export function ExternalWeb({url,name,activeTool='',setActiveTool=()=>{},activeColor='#b89be8',setActiveColor=()=>{},marks=[],setMarks=()=>{},selectedFigure,onFigure=()=>{},figureComments=[],readonly=false}){
  const [loaded,setLoaded]=useState(false);
  const holder=useRef(null);
  useEffect(()=>setLoaded(false),[url]);
  let safe;try{const parsed=new URL(url);safe=parsed.protocol==='https:'&&!parsed.username&&!parsed.password&&parsed.origin!==window.location.origin?parsed.href:null;}catch{}
  if(!safe)return <p role="alert">Enlace externo no válido.</p>;
  const colors=['#ff725e','#f2bd5c','#8ebd72','#67a9d4','#b89be8','#f1eee7'];
  return <div className="external-web" ref={holder}>
    <header><span>Artefacto web · contenido externo en vivo</span><button type="button" onClick={()=>holder.current?.requestFullscreen?.()?.catch(()=>{})}>Ampliar visor</button><a href={safe} target="_blank" rel="noopener noreferrer">Abrir original ↗</a></header>
    <div className="external-web-frame-notice" role="note">Anota sobre una superficie fija: los trazos quedan en las mismas coordenadas al cambiar el tamaño del visor o desplazarte por esta superficie.</div>
    {loaded?<div className="external-web-scroll"><div className="external-web-sheet"><iframe title={name||'Artefacto web en revisión'} src={safe} sandbox="allow-scripts" referrerPolicy="no-referrer" allow="fullscreen"/><AnnotationLayer activeTool={readonly?'':activeTool} activeColor={activeColor} marks={marks} setMarks={setMarks} selectedFigure={selectedFigure}/>{marks.filter(mark=>mark.points?.[0]).map((mark,index)=><button type="button" key={mark.id||index} className={`figure-pin ${selectedFigure===mark.id?'selected':''}`} style={{left:`${mark.points[0].x*100}%`,top:`${mark.points[0].y*100}%`}} aria-label={`Anotación ${index+1}, ${figureComments.filter(comment=>comment.annotationId===mark.id).length} comentarios`} onClick={()=>onFigure(mark)}>{index+1}</button>)}</div></div>:<div className="external-web-consent"><p>Carga la página para iniciar la revisión. Ronda mostrará una superficie estable para ubicar trazos y comentarios.</p><button onClick={()=>setLoaded(true)}>Cargar página para revisar</button></div>}
    {loaded&&<><div className="external-web-annotation-toolbar" aria-label="Herramientas de anotación web"><button type="button" aria-pressed={!activeTool} className={!activeTool?'active':''} onClick={()=>setActiveTool('')}>Navegar</button>{['pen','arrow','square','type'].map((tool,index)=><button type="button" key={tool} disabled={readonly} title={['Lápiz','Flecha','Rectángulo','Texto'][index]} aria-label={['Lápiz','Flecha','Rectángulo','Texto'][index]} aria-pressed={activeTool===tool} className={activeTool===tool?'active':''} onClick={()=>setActiveTool(tool)}><Icon name={tool} size={17}/></button>)}{colors.map((color,index)=><button type="button" key={color} disabled={readonly} className={`external-web-swatch ${activeColor===color?'active':''}`} style={{'--swatch':color}} aria-label={`Color ${index+1}`} aria-pressed={activeColor===color} onClick={()=>setActiveColor(color)}/>)}</div><small>Vista externa interactiva sobre lienzo fijo. La web puede cambiar su contenido; las anotaciones conservan sus coordenadas en este lienzo.</small></>}
  </div>;
}
