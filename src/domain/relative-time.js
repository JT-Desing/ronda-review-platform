// Short Spanish label for how long ago something happened ("hace 5 min").
export function relativeTime(value, now = Date.now()) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '';
  const minutes = Math.max(0, Math.round((now - time) / 60000));
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return days === 1 ? 'ayer' : `hace ${days} días`;
  return new Date(time).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}
