// Guion del recorrido del hero, calcado del flujo real de la sala de revisión compartida:
// Agregar archivos -> Revisar -> Reproducir/Pausar -> Lápiz -> dibujo -> "Deja un comentario" -> Publicar
// -> Resolver -> Aprobar versión. Sin DOM, para poder probarlo.
export const LOOP = 22;
export const DURATION = 20;
export const FPS = 24;
export const COMMENT_TEXT = 'El cruce del centro se ve plano. Más sombra para que se lea el volumen.';

// "show" es el instante que se muestra quieto con movimiento reducido o al saltar a un paso en pausa.
export const STEPS = [
  { id: 'subir', label: 'Sube la pieza', start: 0, show: 3.4 },
  { id: 'anotar', label: 'Anota sobre el video', start: 4.3, show: 10.82 },
  { id: 'comentar', label: 'Comenta en el segundo exacto', start: 10.9, show: 13.6 },
  { id: 'aprobar', label: 'Aprueba la versión', start: 15.2, show: 16.4 },
];

// Recorrido del cursor: [segundo, destino]. Los destinos son elementos marcados con data-target,
// "rest" (reposo), o "stroke:p" (punto p del trazo, de 0 a 1).
export const CURSOR = [
  [0, 'rest'], [0.4, 'rest'], [1.4, 'upload'], [3.3, 'upload'], [4.2, 'review-tab'], [4.7, 'review-tab'],
  [5.2, 'play'], [5.6, 'play'], [6.4, 'rest-stage'], [7.9, 'rest-stage'], [8.3, 'play'], [8.4, 'play'],
  [9.0, 'pen'], [9.1, 'pen'], [9.5, 'stroke:0'], [10.7, 'stroke:1'], [12.7, 'stroke:1'], [13.1, 'publish'],
  [14.0, 'publish'], [14.7, 'resolve'], [15.2, 'resolve'], [16.0, 'approve'], [19.5, 'approve'], [21, 'rest'], [LOOP, 'rest'],
];
export const CLICKS = [1.5, 4.3, 5.25, 8.35, 9.05, 13.15, 14.75, 16.05];
const TOASTS = [[3.0, 4.6, 'Pieza compartida guardada'], [13.2, 14.6, 'Comentario publicado'], [14.8, 15.9, 'Comentario actualizado'], [16.1, 18.4, 'Decisión registrada']];

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

export function cursorAt(t) {
  const time = ((t % LOOP) + LOOP) % LOOP;
  for (let i = 0; i < CURSOR.length - 1; i++) {
    const [t0, from] = CURSOR[i], [t1, to] = CURSOR[i + 1];
    if (time >= t0 && time < t1) {
      const raw = (time - t0) / (t1 - t0);
      // Mientras dibuja, el cursor sigue el trazo a velocidad constante.
      const drawing = from.startsWith('stroke:') && to.startsWith('stroke:');
      return { from, to, k: drawing ? raw : easeInOut(raw) };
    }
  }
  return { from: 'rest', to: 'rest', k: 0 };
}

export function stateAt(t) {
  const time = ((t % LOOP) + LOOP) % LOOP;
  const playing = time >= 5.3 && time < 8.35;
  const video = time < 5.3 ? 0 : playing ? ((time - 5.3) / (8.35 - 5.3)) * 6.5 : 6.5;
  const comment = time >= 14.75 ? 'resolved' : time >= 13.15 ? 'open' : 'none';
  let step = 0;
  STEPS.forEach((s, i) => { if (time >= s.start) step = i; });
  const toast = TOASTS.find(([a, b]) => time >= a && time < b);
  return {
    time,
    scene: time < 4.45 ? 'grid' : 'review',
    upload: time < 1.5 ? 0 : clamp((time - 1.5) / 1.5),
    uploaded: time >= 3,
    reviewTab: time >= 4.3,
    playing,
    video,
    pen: time >= 9.05,
    stroke: clamp((time - 9.5) / 1.2),
    pin: time >= 13.15 ? 'published' : time >= 10.75 ? 'draft' : 'none',
    popover: time >= 10.75 && time < 13.15,
    typed: Math.floor(clamp((time - 10.9) / 1.7) * COMMENT_TEXT.length),
    comment,
    pending: comment === 'open' ? 1 : 0,
    approved: time >= 16.05,
    toast: toast ? toast[2] : '',
    step,
    stepProgress: clamp((time - STEPS[step].start) / ((STEPS[step + 1]?.start ?? LOOP) - STEPS[step].start)),
    click: CLICKS.some((c) => time >= c && time < c + 0.32),
    fade: time > 21.4 ? clamp((time - 21.4) / 0.6) : 0,
  };
}

// Formato del visor de la app: 00:mm:ss y número de fotograma.
export function stamp(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const pad = (n) => String(n).padStart(2, '0');
  return { time: `00:${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}`, frame: Math.floor(s * FPS) };
}

// Movimiento de cámara del video de ejemplo; se aplica a la imagen y al dibujo juntos.
export function camera(video) {
  return { scale: 1.04 + video * 0.006, x: (video - 3) * -0.45, y: Math.sin(video / 2) * 0.5 };
}

// Trazo a mano alzada alrededor del cruce central, en el espacio del fotograma (1000 x 562).
export const STROKE = { cx: 512, cy: 262, rx: 128, ry: 82, turns: 1.06 };
export function strokePoint(p, s = STROKE) {
  const a = p * s.turns * Math.PI * 2;
  const wobble = 1 + Math.sin(a * 3) * 0.025;
  return [s.cx + Math.cos(a) * s.rx * wobble, s.cy + Math.sin(a) * s.ry * wobble];
}
export function strokePath(steps = 64) {
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const [x, y] = strokePoint(i / steps);
    d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}
