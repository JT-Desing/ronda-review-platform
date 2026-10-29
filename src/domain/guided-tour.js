// The tour is shown once per account, current or new, until it is finished or skipped.
// The flag lives in the account data, so it follows the person to any device.
export const TOUR_KEY = 'ronda-tour:v1';

export const TOUR_STEPS = [
  { target: null, title: 'Bienvenida a Ronda', body: 'Te mostramos en un minuto dónde está cada cosa. Puedes saltar la guía cuando quieras.' },
  { target: 'projects', title: 'Proyectos', body: 'Aquí están los proyectos del equipo. Abre uno para ver sus piezas: imágenes, videos, PDF o páginas web.' },
  { target: null, title: 'Comentar una pieza', body: 'Dentro de una pieza haz clic sobre el punto que quieres señalar y escribe el comentario. También puedes dibujar con lápiz, flecha o rectángulo. Al terminar, aprueba la pieza o pide cambios.' },
  { target: 'activity', title: 'Actividad', body: 'Lo último que pasó en tus proyectos: comentarios nuevos, versiones y aprobaciones.' },
  { target: 'planning', title: 'Planificación', body: 'Los comentarios que te asignaron y las fechas de entrega, en un solo lugar.' },
  { target: 'team', title: 'Equipo', body: 'Las personas del equipo y su rol. Si eres administrador, desde aquí invitas a alguien nuevo.' },
  { target: 'account', title: 'Tu cuenta', body: 'Tu perfil, tus datos y la salida de la sesión. Listo, ya puedes empezar.' },
];

// Account data values are JSON text; the flag is stored as the JSON string "done".
export const TOUR_DONE = JSON.stringify('done');
export const tourPending = value => value !== TOUR_DONE && value !== 'done';

// Keeps steps whose target is on screen (the team step only exists for some roles,
// and the menu changes between desktop and phone). Steps without a target always stay.
export function visibleSteps(steps, isVisible) {
  return steps.filter(step => !step.target || isVisible(step.target));
}

// Places the card to the right of the target (side menu), else below it, else above
// (bottom menu on phones), always inside the viewport.
export function cardPosition(rect, card, viewport, gap = 12) {
  const clamp = ({ left, top }) => ({
    left: Math.min(Math.max(gap, left), viewport.width - card.width - gap),
    top: Math.min(Math.max(gap, top), viewport.height - card.height - gap),
  });
  if (!rect) return clamp({ left: (viewport.width - card.width) / 2, top: (viewport.height - card.height) / 2 });
  if (rect.right + gap + card.width <= viewport.width - gap) return clamp({ left: rect.right + gap, top: rect.top });
  if (rect.bottom + gap + card.height <= viewport.height - gap) return clamp({ left: rect.left, top: rect.bottom + gap });
  return clamp({ left: rect.left + rect.width / 2 - card.width / 2, top: rect.top - gap - card.height });
}
