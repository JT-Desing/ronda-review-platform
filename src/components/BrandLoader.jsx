import React from 'react';
import logo from '../ronda-logo-white-silver.svg';
import './brand-loader.css';
export function BrandLoader({label='Cargando…',size='block',className=''}){
 return <span className={`brand-loader brand-loader--${size} ${className}`} role="status" aria-live="polite" aria-busy="true"><span className="brand-loader-emblem" aria-hidden="true"><img src={logo} alt=""/></span>{size==='stage'&&<span className="brand-loader-wordmark" aria-hidden="true">Ronda</span>}<span className="brand-loader-label">{label}</span></span>;
}
