import React,{useRef,useState} from 'react';
import Icon from './Icon.jsx';

export default function AudioMessagePlayer({file,avatar,avatarColor,author}){
  const audio=useRef(null);
  const [duration,setDuration]=useState(0),[currentTime,setCurrentTime]=useState(0),[playing,setPlaying]=useState(false);
  const heights=[6,10,15,8,18,12,7,20,11,16,9,14,19,8,12,17,6,13,20,9,15,11,18,7,14,10,19,8,13,17,6,12];
  const seed=[...(file.id||file.name||'')].reduce((sum,char)=>sum+char.charCodeAt(0),0)%heights.length;
  const bars=Array.from({length:32},(_,index)=>heights[(index+seed)%heights.length]);
  const format=value=>{if(!Number.isFinite(value))return '0:00';const minutes=Math.floor(value/60);const seconds=Math.floor(value%60).toString().padStart(2,'0');return `${minutes}:${seconds}`};
  const toggle=async()=>{if(!audio.current)return;if(audio.current.paused){try{await audio.current.play();setPlaying(true)}catch{setPlaying(false)}}else{audio.current.pause();setPlaying(false)}};
  const seek=e=>{const value=Number(e.target.value);setCurrentTime(value);if(audio.current)audio.current.currentTime=value};
  const progress=duration?currentTime/duration:0;
  return <div className="audio-message-player" role="group" aria-label={`Nota de voz${author?` de ${author}`:''}`}>
    <audio ref={audio} src={file.src||file.dataUrl} preload="metadata" onLoadedMetadata={e=>setDuration(e.currentTarget.duration||0)} onTimeUpdate={e=>setCurrentTime(e.currentTarget.currentTime)} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)}/>
    <button className="audio-message-play" type="button" aria-label={playing?'Pausar nota de voz':'Reproducir nota de voz'} onClick={toggle}><Icon name={playing?'pause':'play'} size={16}/></button>
    <div className="audio-message-track"><div className="audio-message-waveform" aria-hidden="true">{bars.map((height,index)=><i key={index} style={{height:`${height}px`,background:index/bars.length<progress?'var(--accent)':'#81798d'}}/>)}<input type="range" min="0" max={duration||1} step="0.1" value={Math.min(currentTime,duration||0)} onChange={seek} aria-label={`Posición en nota de voz ${file.name}`}/></div><span className="audio-message-duration" aria-live="off">{format(playing?currentTime:duration)}</span></div>
    {avatar&&<span className="audio-message-avatar" aria-hidden="true" style={{'--audio-avatar-color':avatarColor||'#b89be8'}}>{avatar}<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3m-4 0h8"/></svg></span>}
  </div>;
}
