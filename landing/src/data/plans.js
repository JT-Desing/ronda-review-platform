// Planes y precios. Las cifras salen del análisis "Planes de Ronda: costos y almacenamiento".
// El pago anual cobra 10 meses por 12.
export const ANNUAL_MONTHS_CHARGED = 10;

// Referencia del mercado: herramientas que cobran por persona (USD/mes).
export const PER_SEAT_REFERENCE_USD = 15;

export const plans = [
  {
    id: 'gratis',
    name: 'Gratis',
    summary: 'Para probar Ronda con una pieza real.',
    members: 1,
    storage: '2 GB',
    price: { COP: 0, USD: 0 },
    features: ['1 persona', '3 proyectos', '2 GB de espacio', 'Video, imagen y PDF', 'Comentarios por fotograma y dibujo'],
    cta: 'Crear cuenta',
  },
  {
    id: 'creador',
    name: 'Creador',
    summary: 'Para quien edita o diseña y revisa con sus clientes.',
    members: 1,
    storage: '50 GB',
    price: { COP: 29000, USD: 7 },
    features: ['1 persona', 'Proyectos ilimitados', '50 GB de espacio', 'Versiones', 'Comentarios de voz', 'Revisión de sitios web en vivo'],
    cta: 'Elegir Creador',
  },
  {
    id: 'estudio',
    name: 'Estudio',
    summary: 'Para equipos pequeños que entregan todas las semanas.',
    members: 5,
    storage: '200 GB',
    price: { COP: 119000, USD: 29 },
    features: ['Hasta 5 personas', '200 GB de espacio', 'Roles e invitaciones por correo', 'Proyectos compartidos', 'Pauta y preview social', 'Presencia en vivo'],
    cta: 'Elegir Estudio',
    featured: true,
  },
  {
    id: 'agencia',
    name: 'Agencia',
    summary: 'Para agencias con varias cuentas y clientes.',
    members: 15,
    storage: '500 GB',
    price: { COP: 279000, USD: 69 },
    features: ['Hasta 15 personas', '500 GB de espacio', 'Varios espacios', 'Marca propia en el espacio', 'Soporte prioritario'],
    cta: 'Elegir Agencia',
  },
];

// Más espacio sin cambiar de plan; se cobra en la misma factura.
export const extraStorage = { storage: '100 GB', price: { COP: 15000, USD: 4 } };

// Para equipos de más de 15 personas o con varios TB. El precio parte de esta base.
export const customPlan = {
  id: 'a-medida',
  name: 'A medida',
  summary: 'Para agencias grandes y redes de agencias que necesitan mucho espacio y no quieren contar personas.',
  members: Infinity,
  storage: '2 TB',
  price: { COP: 990000, USD: 248 },
  extraTb: { COP: 190000, USD: 48 },
  features: ['Personas ilimitadas, con uso razonable', '2 TB de espacio incluidos', 'Cada TB extra por $ 190.000 al mes', '4 horas de soporte al mes', 'Factura electrónica y pago por transferencia'],
  cta: 'Hablar con ventas',
};

export function monthlyPrice(plan, { currency = 'COP', billing = 'monthly' } = {}) {
  const base = plan.price[currency];
  if (billing !== 'annual') return base;
  const perMonth = (base * ANNUAL_MONTHS_CHARGED) / 12;
  return currency === 'COP' ? Math.round(perMonth / 100) * 100 : Math.round(perMonth * 100) / 100;
}

export function annualTotal(plan, currency = 'COP') {
  return plan.price[currency] * ANNUAL_MONTHS_CHARGED;
}

// Plan pago más barato que cubre a ese número de personas; pasando de 15 es el plan a medida.
export function planForTeam(members) {
  const paid = plans.filter((plan) => plan.price.USD > 0);
  return paid.find((plan) => plan.members >= members) ?? customPlan;
}

export const MAX_TEAM = 50;

export function perSeatComparison(members) {
  const count = Math.max(1, Math.min(MAX_TEAM, Math.round(members)));
  const plan = planForTeam(count);
  const perSeat = count * PER_SEAT_REFERENCE_USD;
  return { members: count, plan, perSeat, ronda: plan.price.USD, saving: perSeat - plan.price.USD };
}

// Pesos con signo ("$ 29.000"); dólares siempre con la sigla ("USD 29") para no confundirlos.
export function formatPrice(value, currency = 'COP') {
  if (value === 0) return 'Gratis';
  if (currency === 'USD') {
    const amount = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2, minimumFractionDigits: Number.isInteger(value) ? 0 : 2 }).format(value);
    return `USD ${amount}`;
  }
  return `$ ${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(value)}`;
}
