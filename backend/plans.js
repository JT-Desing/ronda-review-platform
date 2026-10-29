// Single source for plan limits. Keep in sync with landing/src/data/plans.js
// and the "Planes de Ronda: costos y almacenamiento" analysis.
export const GB = 1024 ** 3;
export const EXTRA_PACK_GB = 100;
export const PLAN_STATUSES = ['active', 'pending', 'suspended'];
const PLANS = Object.freeze({
  gratis: { members: 1, storageGb: 2, team: false },
  creador: { members: 1, storageGb: 50, team: false },
  estudio: { members: 5, storageGb: 200, team: true },
  agencia: { members: 15, storageGb: 500, team: true },
  // Defaults for a contract that has not set its own limits ("uso razonable").
  'a-medida': { members: 300, storageGb: 2048, team: true },
});
export const PLAN_IDS = Object.keys(PLANS);
export const TEAM_PLANS = PLAN_IDS.filter(id => PLANS[id].team);
const planError = message => Object.assign(new Error(message), { status: 400 });

// Until the platform owner activates a paid plan, the space keeps the free limits.
export function planLimits({ plan, status, extraPacks = 0, customMembers = null, customStorageGb = null }) {
  if (status !== 'active' || !PLANS[plan]) return { members: PLANS.gratis.members, storageBytes: PLANS.gratis.storageGb * GB };
  const base = PLANS[plan];
  const custom = plan === 'a-medida';
  const members = custom && customMembers ? customMembers : base.members;
  const storageGb = (custom && customStorageGb ? customStorageGb : base.storageGb) + extraPacks * EXTRA_PACK_GB;
  return { members, storageBytes: storageGb * GB };
}

export function validatePlanChange({ plan, status, extraPacks = 0, customMembers = null, customStorageGb = null }, { team }) {
  if (!PLANS[plan]) throw planError('Plan inválido.');
  if (team && !PLANS[plan].team) throw planError('Un espacio de equipo necesita Estudio, Agencia o A medida.');
  if (!team && PLANS[plan].team) throw planError('Una cuenta personal solo puede tener Gratis o Creador.');
  if (!PLAN_STATUSES.includes(status)) throw planError('Estado de plan inválido.');
  if (!Number.isInteger(extraPacks) || extraPacks < 0 || extraPacks > 100) throw planError('Cantidad de paquetes inválida.');
  if (customMembers !== null && (!Number.isInteger(customMembers) || customMembers < 1 || customMembers > 10000)) throw planError('Cantidad de personas inválida.');
  if (customStorageGb !== null && (!Number.isInteger(customStorageGb) || customStorageGb < 1 || customStorageGb > 1024 * 1024)) throw planError('Espacio inválido.');
}
