import {BrandLoader} from './BrandLoader.jsx';
import React, { useEffect, useRef, useState } from 'react';

export function AudioCommentInput({ onAttach, onError, onRecordingChange, disabled=false }) {
  const recorder=useRef(null);const stream=useRef(null);const timer=useRef(null);const mounted=useRef(true);
  const [recording,setRecording]=useState(false);const [pending,setPending]=useState(false);
  useEffect(()=>{onRecordingChange?.(recording||pending);},[recording,pending,onRecordingChange]);
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
  return <div className="audio-comment-input" aria-label="Opciones de audio">
    <label title="Adjuntar audio"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 12.5V6.8a4 4 0 0 1 8 0v10a6 6 0 0 1-12 0V7.5"/><path d="M12 7v9a2 2 0 0 0 4 0V7"/></svg><span className="visually-hidden">Adjuntar audio</span><input disabled={disabled||pending||recording} aria-label="Adjuntar MP3 u otro audio" type="file" accept="audio/*,.mp3" onChange={e=>{onAttach(e.target.files);e.target.value=''}}/></label>
    <button type="button" disabled={pending||disabled} aria-pressed={recording} title={recording?'Detener y adjuntar grabación':pending?'Solicitando micrófono…':'Grabar voz'} onClick={()=>recording?recorder.current?.stop():start()}>{pending?<BrandLoader size="inline" label="Solicitando micrófono…"/>:<><svg aria-hidden="true" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3m-4 0h8"/></svg><span className="visually-hidden">{recording?'Detener y adjuntar grabación':'Grabar voz'}</span></>}</button>
    {recording&&<small role="status">Grabando · máximo 60 segundos. Detén para revisar antes de enviar.</small>}
  </div>;
}
