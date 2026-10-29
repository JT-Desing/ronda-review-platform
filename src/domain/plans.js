// Mirrors backend/plans.js, which enforces the limits. This copy only labels them.
export const PLAN_CATALOG = Object.freeze({
  gratis: { name: 'Gratis', members: 1, storageGb: 2, team: false },
  creador: { name: 'Creador', members: 1, storageGb: 50, team: false },
  estudio: { name: 'Estudio', members: 5, storageGb: 200, team: true },
  agencia: { name: 'Agencia', members: 15, storageGb: 500, team: true },
  'a-medida': { name: 'A medida', members: 300, storageGb: 2048, team: true },
});
export const TEAM_PLAN_IDS = Object.keys(PLAN_CATALOG).filter(id => PLAN_CATALOG[id].team);
export const PERSONAL_PLAN_IDS = Object.keys(PLAN_CATALOG).filter(id => !PLAN_CATALOG[id].team);
export const PLAN_STATUS_LABELS = Object.freeze({ active: 'Activo', pending: 'Pendiente de activación', suspended: 'Suspendido' });

export function planSummary(id) {
  const plan = PLAN_CATALOG[id];
  if (!plan) return '';
  if (id === 'a-medida') return 'Personas y espacio según contrato';
  return `${plan.members === 1 ? '1 persona' : `Hasta ${plan.members} personas`} · ${plan.storageGb} GB`;
}

export function formatBytes(bytes) {
  const gb = bytes / 1024 ** 3;
  if (gb >= 1024) return `${(gb / 1024).toLocaleString('es-CO', { maximumFractionDigits: 1 })} TB`;
  if (gb >= 1) return `${gb.toLocaleString('es-CO', { maximumFractionDigits: 1 })} GB`;
  return `${Math.round(bytes / 1024 ** 2).toLocaleString('es-CO')} MB`;
}

// Share of the quota in use, capped at 100. Warn from 80 %, as the plans analysis asks.
export function usageLevel(used, limit) {
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return { percent, warning: percent >= 80 };
}
