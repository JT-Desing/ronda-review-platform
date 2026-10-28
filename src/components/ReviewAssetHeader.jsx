import React from 'react';
import Icon from './Icon.jsx';
import {fileLabel} from '../domain/file-label.js';
import './asset-review-header.css';

export function ReviewAssetHeader({media,onUpload,children}) {
  const name=media?.name || 'AMARA_SPOT_MASTER';
  return <div className="asset-review-header-container"><div className="asset-bar asset-review-header" aria-label="Archivo y versiones">
    <div className="asset-meta"><span className="asset-file-mark"><Icon name={media?.externalUrl?'link':media?.type==='video'?'play':'image'} size={22}/></span><div className="asset-identity"><strong title={name}>{name}</strong><span className="asset-file-details"><span className="asset-format">{fileLabel(media)}</span><span className="asset-detail-separator" aria-hidden="true">·</span>{media?.externalUrl?'Enlace externo · contenido en vivo':media?'Revisión personal':'1920 × 1080 · H.264 · 48.2 MB'}</span></div></div>
    <div className="asset-actions"><button className="upload-button asset-upload-file" type="button" onClick={onUpload}><Icon name="plus" size={16}/> Cargar archivo</button>{children}</div>
  </div></div>;
}
