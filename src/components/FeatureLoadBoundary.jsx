import React, {useMemo,useState} from 'react';
import {BrandLoader} from './BrandLoader.jsx';
import {rememberFeatureRetry} from '../domain/feature-retry.js';
import './feature-load-boundary.css';

export class FeatureLoadBoundary extends React.Component {
  state={failed:false};

  static getDerivedStateFromError(){return {failed:true};}

  render(){
    if(!this.state.failed)return this.props.children;
    return <div className="feature-load-error" role="alert">
      <span>{this.props.message||'No se pudo cargar esta herramienta. Comprueba tu conexión e inténtalo de nuevo.'}</span>
      <button type="button" onClick={this.props.onRetry}>Reintentar carga</button>
    </div>;
  }
}

export function RetryableFeature({load,message,loadingLabel,loadingFallback,retryView,retryMedia,retryMode,children,...props}){
  const [attempt,setAttempt]=useState(0);
  const Feature=useMemo(()=>React.lazy(load),[load,attempt]);
  const fallback=loadingFallback||<BrandLoader label={loadingLabel||'Cargando herramienta…'}/>;
  const retry=()=>{let storage=null;try{storage=window.sessionStorage}catch{}const saved=rememberFeatureRetry(storage,{view:retryView,mediaId:retryMedia?.id,versionId:retryMedia?.versionId,mode:retryMode});if(saved)window.location.reload();else setAttempt(value=>value+1)};
  return <FeatureLoadBoundary key={attempt} message={message} onRetry={retry}>
    <React.Suspense fallback={fallback}><Feature {...props}>{children}</Feature></React.Suspense>
  </FeatureLoadBoundary>;
}
