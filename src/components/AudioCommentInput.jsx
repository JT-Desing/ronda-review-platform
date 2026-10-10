import React, { useEffect, useRef, useState } from 'react';

export function AudioCommentInput({ onAttach, onError }) {
  const recorder=useRef(null);const stream=useRef(null);const timer=useRef(null);const mounted=useRef(true);
  const [recording,setRecording]=useState(false);const [pending,setPending]=useState(false);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;clearTimeout(timer.current);if(recorder.current?.state==='recording')recorder.current.stop();stream.current?.getTracks().forEach(track=>track.stop())}},[]);
  const start=async()=>{
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)return onError('Este navegador no permite grabar. Puedes adjuntar un MP3.');
    setPending(true);
    try {
      const source=await navigator.mediaDevices.getUserMedia({audio:true});
      if(!mounted.current){source.getTracks().forEach(t=>t.stop());return}
      stream.current=source;const chunks=[];const instance=new MediaRecorder(source);recorder.current=instance;
      instance.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
      instance.onerror=()=>{onError('La grabación falló. Inténtalo de nuevo.');instance.stop()};
      instance.onstop=()=>{clearTimeout(timer.current);source.getTracks().forEach(t=>t.stop());if(!mounted.current)return;setRecording(false);const blob=new Blob(chunks,{type:instance.mimeType||'audio/webm'});if(blob.size)onAttach([new File([blob],`Nota de voz.${blob.type.includes('mp4')?'m4a':'webm'}`,{type:blob.type})])};
      instance.start();setRecording(true);timer.current=setTimeout(()=>{if(instance.state==='recording')instance.stop()},60000);
    } catch {onError('No se pudo acceder al micrófono. Revisa el permiso o adjunta un MP3.')} finally {if(mounted.current)setPending(false)}
  };
  return <div className="audio-comment-input"><label>Adjuntar audio<input aria-label="Adjuntar MP3 u otro audio" type="file" accept="audio/*,.mp3" onChange={e=>{onAttach(e.target.files);e.target.value=''}}/></label><button type="button" disabled={pending} onClick={()=>recording?recorder.current?.stop():start()}>{recording?'Detener y adjuntar':pending?'Solicitando micrófono…':'Grabar voz'}</button>{recording&&<small role="status">Grabando · máximo 60 segundos. Detén para revisar antes de enviar.</small>}</div>;
}
