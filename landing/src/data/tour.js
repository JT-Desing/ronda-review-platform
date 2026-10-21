// Video del recorrido completo. Mientras sea null, la sección muestra la portada y los capítulos sin reproducir.
// Para activarlo: copiar el archivo a public/video/ y poner aquí su ruta, por ejemplo '/video/recorrido-ronda.mp4'.
export const TOUR_VIDEO = null;
// Subtítulos opcionales en formato WebVTT, por ejemplo '/video/recorrido-ronda.vtt'.
export const TOUR_CAPTIONS = null;

// Capítulos en segundos. Ajustar los tiempos al montaje final del video.
export const chapters = [
  { time: 0, title: 'Crear el proyecto y subir las piezas', text: 'La parrilla de entrega ordena cada pieza con su versión y su estado.' },
  { time: 12, title: 'Revisar un video', text: 'Reproduce, pausa y ubica el fotograma exacto con su timecode.' },
  { time: 24, title: 'Anotar y comentar', text: 'Lápiz, flecha, rectángulo o texto; el comentario queda en ese segundo.' },
  { time: 38, title: 'Voz y prioridad', text: 'Notas de voz de hasta 60 segundos y comentarios urgentes o bloqueantes.' },
  { time: 50, title: 'Subir una nueva versión', text: 'La V2 llega sin borrar la V1 ni sus comentarios.' },
  { time: 62, title: 'Preview social', text: 'El carrusel como se vería en el feed, en 1:1, 4:5 o 16:9.' },
  { time: 72, title: 'Pauta', text: 'Campañas, grupos de anuncios y un semáforo por pieza.' },
  { time: 82, title: 'Equipo y aprobación', text: 'Invitaciones por correo, roles y la versión aprobada con nombre y fecha.' },
];

export function chapterAt(seconds, list = chapters) {
  let index = 0;
  list.forEach((chapter, i) => { if (seconds >= chapter.time) index = i; });
  return index;
}

export function clock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
