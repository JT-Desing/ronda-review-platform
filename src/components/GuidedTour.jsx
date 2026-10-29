import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { accountStorage } from '../state/accountStorage.js';
import { TOUR_KEY, TOUR_STEPS, tourPending, visibleSteps, cardPosition } from '../domain/guided-tour.js';
import './guided-tour.css';

const PADDING = 6;
const targetElement = id => [...document.querySelectorAll(`[data-tour="${id}"]`)].find(element => element.getClientRects().length > 0);

export function GuidedTour() {
  const [open, setOpen] = useState(() => tourPending(accountStorage.getItem(TOUR_KEY)));
  const [steps, setSteps] = useState([]);
  const [index, setIndex] = useState(0);
  const [layout, setLayout] = useState(null);
  const card = useRef(null);
  const step = steps[index];

  const finish = () => { accountStorage.setItem(TOUR_KEY, 'done'); setOpen(false); };

  // The menu is in the DOM only after the first commit, so the steps are picked here.
  useLayoutEffect(() => { if (open) setSteps(visibleSteps(TOUR_STEPS, id => Boolean(targetElement(id)))); }, [open]);

  useLayoutEffect(() => {
    if (!open || !step) return undefined;
    const measure = () => {
      const element = step.target ? targetElement(step.target) : null;
      const box = element?.getBoundingClientRect();
      const rect = box && { left: box.left - PADDING, top: box.top - PADDING, right: box.right + PADDING, bottom: box.bottom + PADDING, width: box.width + PADDING * 2, height: box.height + PADDING * 2 };
      const size = card.current?.getBoundingClientRect() || { width: 320, height: 180 };
      setLayout({ rect, position: cardPosition(rect, size, { width: innerWidth, height: innerHeight }) });
    };
    measure();
    addEventListener('resize', measure);
    return () => removeEventListener('resize', measure);
  }, [open, step]);

  useEffect(() => { if (open) card.current?.focus(); }, [open, index]);

  if (!open || !step) return null;
  const last = index === steps.length - 1;
  const rect = layout?.rect;
  return <div className="guided-tour" role="presentation" onKeyDown={event => { if (event.key === 'Escape') finish(); }}>
    {rect ? <div className="guided-tour-spotlight" style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}/> : <div className="guided-tour-scrim"/>}
    <section ref={card} className="guided-tour-card" role="dialog" aria-modal="true" aria-labelledby="guided-tour-title" aria-describedby="guided-tour-body" tabIndex={-1} style={layout ? { left: layout.position.left, top: layout.position.top } : { visibility: 'hidden' }}>
      <span className="guided-tour-count">{index + 1} de {steps.length}</span>
      <h2 id="guided-tour-title">{step.title}</h2>
      <p id="guided-tour-body">{step.body}</p>
      <footer>
        <button type="button" className="guided-tour-skip" onClick={finish}>{last ? 'Cerrar' : 'Saltar guía'}</button>
        <span>
          {index > 0 && <button type="button" onClick={() => setIndex(index - 1)}>Atrás</button>}
          <button type="button" className="guided-tour-next" onClick={() => last ? finish() : setIndex(index + 1)}>{last ? 'Empezar' : 'Siguiente'}</button>
        </span>
      </footer>
    </section>
  </div>;
}
