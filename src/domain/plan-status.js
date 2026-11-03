// Text for a team space whose plan does not allow changes (backend answers 402).
export function planStatusNotice(status, role) {
  if (!status || status === 'active') return null;
  const admin = role === 'admin';
  if (status === 'suspended') return {
    title: 'Plan suspendido',
    text: admin ? 'El equipo puede ver y descargar su trabajo, pero no subir, comentar ni crear proyectos. Renueva el pago para reactivarlo.' : 'Puedes ver y descargar el trabajo, pero no hacer cambios. Avísale a quien administra el equipo.',
  };
  return {
    title: 'Plan pendiente de activación',
    text: admin ? 'Podrás subir, comentar y crear proyectos cuando se confirme el pago. Escríbenos a ronda@repolite.link si ya pagaste.' : 'El equipo aún no está activo. Podrás trabajar cuando quien lo administra confirme el pago.',
  };
}
