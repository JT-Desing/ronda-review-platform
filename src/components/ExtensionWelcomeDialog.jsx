import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';
import './extension-welcome.css';
import promoVisual from '../assets/extension-promo-visual.png';

const STORE_URL = 'https://chromewebstore.google.com/detail/ronda-%C2%B7-anotaciones-web/gedhmliiecpfcpfiighhlecdfmknnjnk?hl=es-419';

export default function ExtensionWelcomeDialog({ userId }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef(null);
  const [extensionDetected, setExtensionDetected] = useState(null);
  const dismissed = useRef(false);

  useEffect(() => {
    if (!userId) return;
    let fallbackTimer;
    let detected = false;
    const check = () => {
      window.clearTimeout(fallbackTimer);
      setExtensionDetected(null);
      window.postMessage({ type: 'ronda:web-review:check-extension' }, window.location.origin);
      fallbackTimer = window.setTimeout(() => {
        if (detected) return;
        setExtensionDetected(false);
        if (!dismissed.current) setOpen(true);
      }, 800);
    };
    const onMessage = event => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      if (event.data?.type !== 'ronda:web-review:extension-installed') return;
      detected = true;
      window.clearTimeout(fallbackTimer);
      setExtensionDetected(true);
      setOpen(false);
    };
    window.addEventListener('message', onMessage);
    window.addEventListener('focus', check);
    check();
    return () => {
      window.clearTimeout(fallbackTimer);
      window.removeEventListener('message', onMessage);
      window.removeEventListener('focus', check);
    };
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    const panel = dialog.current;
    panel?.querySelector('a, button')?.focus();
    const onKeyDown = event => {
      if (event.key === 'Escape') { event.preventDefault(); dismiss(); return; }
      if (event.key !== 'Tab' || !panel) return;
      const controls = [...panel.querySelectorAll('a[href], button:not(:disabled)')];
      if (!controls.length) return;
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus?.();
    };
  }, [open]);

  function dismiss() {
    dismissed.current = true;
    setOpen(false);
  }

  if (!open || extensionDetected === true) return null;
  return createPortal(<div className="extension-promo-layer">
    <button className="extension-promo-backdrop" aria-label="Cerrar aviso de la extensión" onClick={dismiss}/>
    <section ref={dialog} className="extension-promo" role="dialog" aria-modal="true" aria-labelledby="extension-promo-title" aria-describedby="extension-promo-description" tabIndex={-1}>
      <button className="extension-promo-close" aria-label="Cerrar" onClick={dismiss}><Icon name="x" size={18}/></button>
      <div className="extension-promo-visual" aria-hidden="true">
        <img src={promoVisual} alt="" />
        <span className="extension-promo-visual-caption"><span/><span>ANOTACIONES EN CONTEXTO</span></span>
      </div>
      <div className="extension-promo-copy">
        <span className="extension-promo-eyebrow"><span/> EXTENSIÓN OFICIAL DE RONDA</span>
        <h2 id="extension-promo-title">Comenta sobre la web real</h2>
        <p id="extension-promo-description">Revisa páginas en vivo desde tu proyecto y deja cada comentario justo donde hace falta.</p>
        <ul className="extension-promo-benefits">
          <li><span><Icon name="pen" size={16}/></span><div><strong>Selecciona texto o marca la página</strong><small>Anota con texto, lápiz, flechas y formas.</small></div></li>
          <li><span><Icon name="arrow" size={16}/></span><div><strong>Las marcas siguen el desplazamiento</strong><small>Vuelve al mismo detalle aunque la página cambie de posición.</small></div></li>
          <li><span><Icon name="check" size={16}/></span><div><strong>Permiso solo para el sitio que conectas</strong><small>Revócalo cuando quieras desde Chrome.</small></div></li>
        </ul>
        <div className="extension-promo-footer">
          <a className="extension-promo-install" href={STORE_URL} target="_blank" rel="noopener noreferrer" onClick={dismiss}>Ver en Chrome Web Store <span aria-hidden="true">↗</span></a>
          <button className="extension-promo-later" onClick={dismiss}>Ahora no</button>
        </div>
        <p className="extension-promo-note-text">Es opcional: puedes seguir comentando y revisando capturas en Ronda sin instalarla.</p>
      </div>
    </section>
  </div>, document.body);
}
