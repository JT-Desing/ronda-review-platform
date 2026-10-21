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

// Coordenadas en el espacio del fotograma (1000 x 625), sin el movimiento de cámara.
export function initialComments() {
  return [
    { id: 'c1', author: 'Laura Gómez', role: 'Cliente', initials: 'LG', tone: 'peach', time: 3.5, text: 'Este lila se ve más frío que el de la marca. Subirle un poco de calidez.', resolved: false, pin: [352, 548], path: 'M352 548C318 520 286 492 252 462M252 462L258 500M252 462L290 470' },
    { id: 'c2', author: 'Andrés Ruiz', role: 'Dirección', initials: 'AR', tone: 'mint', time: 6.5, text: 'El cruce del centro se ve plano. Más sombra para que se lea el volumen.', resolved: false, pin: [470, 205], path: 'M470 205C560 185 652 226 642 296C632 366 540 386 460 371C390 356 374 290 414 240C430 222 450 210 476 204' },
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

// Movimiento de cámara del "video". Se aplica a la imagen y al dibujo juntos para que la anotación no se despegue.
export function camera(time) {
  return { scale: 1.04 + time * 0.004, x: (time - 10) * -0.35, y: Math.sin(time / 3) * 0.6 };
}
