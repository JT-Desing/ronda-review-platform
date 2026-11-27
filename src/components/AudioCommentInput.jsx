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
  return <div className="audio-comment-input" aria-label="Acciones del mensaje">
    <label className="audio-attach-button" title="Adjuntar audio"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m8.5 12.5 6.2-6.2a3.4 3.4 0 0 1 4.8 4.8l-8.7 8.7a5.2 5.2 0 0 1-7.4-7.4l8.2-8.2"/><path d="m7.2 15.7 8.5-8.5"/></svg><span className="visually-hidden">Adjuntar MP3 u otro audio</span><input disabled={disabled||pending||recording} aria-label="Adjuntar MP3 u otro audio" type="file" accept="audio/*,.mp3" onChange={e=>{onAttach(e.target.files);e.target.value=''}}/></label>
    <button className={`audio-record-button ${recording?'is-recording':''}`} type="button" disabled={pending||disabled} aria-pressed={recording} aria-label={recording?'Detener y adjuntar grabación':pending?'Solicitando micrófono…':'Grabar nota de voz'} title={recording?'Detener y adjuntar grabación':pending?'Solicitando micrófono…':'Grabar nota de voz'} onClick={()=>recording?recorder.current?.stop():start()}>{pending?<BrandLoader size="inline" label="Solicitando micrófono…"/>:recording?<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>:<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3m-4 0h8"/></svg>}</button>
    {recording&&<small role="status">Grabando · máximo 60 segundos. Detén para revisar antes de enviar.</small>}
  </div>;
}
