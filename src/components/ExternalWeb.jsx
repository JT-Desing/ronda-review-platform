import React,{useState,useEffect,useRef} from 'react';
import './external-artifacts.css';
export function ExternalWeb({url,name}){
  const [loaded,setLoaded]=useState(false);
  const holder=useRef(null);
  useEffect(()=>setLoaded(false),[url]);
  let safe;try{const parsed=new URL(url);safe=parsed.protocol==='https:'&&!parsed.username&&!parsed.password&&parsed.origin!==window.location.origin?parsed.href:null;}catch{}
  if(!safe)return <p role="alert">Enlace externo no válido.</p>;
  return <div className="external-web" ref={holder}>
    <header><span>Artefacto web · contenido externo en vivo</span><button type="button" onClick={()=>holder.current?.requestFullscreen?.()?.catch(()=>{})}>Ampliar visor</button><a href={safe} target="_blank" rel="noopener noreferrer">Abrir original ↗</a></header>
    {loaded?<iframe title={name||'Artefacto web en revisión'} src={safe} sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer" allow="fullscreen"/>:<div className="external-web-consent"><p>La página conserva sus controles. Sus animaciones no se sincronizan con la línea de tiempo de Ronda.</p><button onClick={()=>setLoaded(true)}>Cargar página para revisar</button></div>}
    <small>Origen externo público; los comentarios de Ronda siguen privados. El contenido puede cambiar incluso después de aprobarlo. Si queda en blanco, usa Abrir original. Las anotaciones se refieren a esta vista, no a una captura congelada.</small>
  </div>;
}
