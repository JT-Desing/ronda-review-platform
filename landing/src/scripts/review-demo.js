// Estado y formato de la sala de revisión de demostración. Sin DOM, para poder probarlo.
export const DURATION = 20;
export const FPS = 24;
// Una anotación se ve cerca del instante en que se dibujó, como en el visor de la app.
export const ANNOTATION_WINDOW = 1.5;

export function timecode(seconds) {
  const clamped = Math.max(0, Math.min(DURATION, seconds));
  const whole = Math.floor(clamped);
  const frames = Math.min(FPS - 1, Math.floor((clamped - whole) * FPS));
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(Math.floor(whole / 60))}:${pad(whole % 60)}:${pad(frames)}`;
}

export function initialComments() {
  return [
    { id: 'c1', author: 'Laura Gómez', role: 'Cliente', initials: 'LG', tone: 'peach', time: 3.5, text: 'El logo entra muy rápido. Que se quede medio segundo más.', resolved: false, path: null },
    { id: 'c2', author: 'Andrés Ruiz', role: 'Dirección', initials: 'AR', tone: 'mint', time: 6.5, text: 'Bajar el brillo en esta zona, compite con el producto.', resolved: false, path: 'M430 214C520 160 664 186 684 282C704 372 592 424 488 408C388 392 356 302 418 244C442 222 474 212 506 210' },
  ];
}

export function openCount(comments) {
  return comments.filter((comment) => !comment.resolved).length;
}

export function canApprove(comments) {
  return openCount(comments) === 0;
}

export function visibleAnnotations(comments, time) {
  return comments.filter((comment) => comment.path && Math.abs(comment.time - time) <= ANNOTATION_WINDOW);
}

export function pointsToPath(points) {
  if (!points.length) return '';
  const [first, ...rest] = points;
  return `M${first[0].toFixed(0)} ${first[1].toFixed(0)}` + rest.map(([x, y]) => `L${x.toFixed(0)} ${y.toFixed(0)}`).join('');
}

// Un trazo cuenta como anotación si recorre al menos unos píxeles.
export function strokeLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return total;
}
