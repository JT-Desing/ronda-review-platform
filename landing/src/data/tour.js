// Video del recorrido completo, grabado sobre la app real con datos de ejemplo.
// Si TOUR_VIDEO es null, la sección muestra la portada y los capítulos sin reproducir.
export const TOUR_VIDEO = '/video/recorrido-ronda.mp4';
export const TOUR_POSTER = '/video/recorrido-portada.jpg';
// Subtítulos opcionales en formato WebVTT, por ejemplo '/video/recorrido-ronda.vtt'.
export const TOUR_CAPTIONS = null;

// Capítulos en segundos, medidos sobre el montaje final (3:20).
export const chapters = [
  { time: 0, title: 'Inicio y proyectos', text: 'Tu espacio y un proyecto compartido nuevo para el cliente y el equipo.' },
  { time: 17, title: 'Subir piezas y enlaces', text: 'Video, imágenes, PDF y sitios web en la parrilla de entrega, en el orden que quieras.' },
  { time: 37, title: 'Revisar y anotar el video', text: 'Pausa en el fotograma, dibuja con lápiz o flecha y cada trazo abre su comentario.' },
  { time: 60, title: 'Prioridad, voz y respuestas', text: 'Comentarios bloqueantes con /bloqueo, notas de voz, respuestas y resueltos.' },
  { time: 77, title: 'Nueva versión', text: 'La V2 llega sin borrar la V1 ni sus comentarios, y puedes ir y volver.' },
  { time: 93, title: 'Imagen, PDF y sitio web', text: 'Zoom y rectángulos sobre imágenes, PDF por páginas y la web en vivo.' },
  { time: 115, title: 'Resumen y compartir', text: 'Pendientes y bloqueantes en un resumen, y el enlace por correo o WhatsApp.' },
  { time: 125, title: 'Aprobar la versión', text: 'Revisores asignados y la versión aprobada queda en solo lectura.' },
  { time: 133, title: 'Preview social', text: 'El carrusel con la cuenta y el texto, como se vería en el feed.' },
  { time: 149, title: 'Pauta', text: 'Campañas, grupos de anuncios y solicitudes de cambio por campo.' },
  { time: 173, title: 'Planificación y actividad', text: 'Las conversaciones en un calendario y el historial de cada proyecto.' },
  { time: 185, title: 'Equipo y accesos', text: 'Invitaciones por correo con rol y quién entra a cada proyecto.' },
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
