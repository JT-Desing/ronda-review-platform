// Propuesta de precios. Cambiar aquí actualiza la tabla y la calculadora.
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
    price: { COP: 0, USD: 0 },
    features: ['1 persona', '3 proyectos', '2 GB', 'Video, imagen y PDF', 'Comentarios por fotograma y dibujo'],
    cta: 'Crear cuenta',
  },
  {
    id: 'creador',
    name: 'Creador',
    summary: 'Para quien edita o diseña y revisa con sus clientes.',
    members: 1,
    price: { COP: 29000, USD: 7 },
    features: ['1 persona', 'Proyectos ilimitados', '50 GB', 'Versiones', 'Comentarios de voz', 'Revisión de sitios web en vivo'],
    cta: 'Elegir Creador',
  },
  {
    id: 'estudio',
    name: 'Estudio',
    summary: 'Para equipos pequeños que entregan todas las semanas.',
    members: 5,
    price: { COP: 119000, USD: 29 },
    features: ['Hasta 5 personas', '200 GB', 'Roles e invitaciones por correo', 'Proyectos compartidos', 'Pauta y preview social', 'Presencia en vivo'],
    cta: 'Elegir Estudio',
    featured: true,
  },
  {
    id: 'agencia',
    name: 'Agencia',
    summary: 'Para agencias con varias cuentas y clientes.',
    members: 15,
    price: { COP: 279000, USD: 69 },
    features: ['Hasta 15 personas', '1 TB', 'Varios espacios', 'Marca propia en el espacio', 'Soporte prioritario'],
    cta: 'Hablar con ventas',
  },
];

export function monthlyPrice(plan, { currency = 'COP', billing = 'monthly' } = {}) {
  const base = plan.price[currency];
  if (billing !== 'annual') return base;
  const perMonth = (base * ANNUAL_MONTHS_CHARGED) / 12;
  return currency === 'COP' ? Math.round(perMonth / 100) * 100 : Math.round(perMonth * 100) / 100;
}

export function annualTotal(plan, currency = 'COP') {
  return plan.price[currency] * ANNUAL_MONTHS_CHARGED;
}

// Plan pago más barato que cubre a ese número de personas.
export function planForTeam(members) {
  const paid = plans.filter((plan) => plan.price.USD > 0);
  return paid.find((plan) => plan.members >= members) ?? paid[paid.length - 1];
}

export function perSeatComparison(members) {
  const count = Math.max(1, Math.min(15, Math.round(members)));
  const plan = planForTeam(count);
  const perSeat = count * PER_SEAT_REFERENCE_USD;
  return { members: count, plan, perSeat, ronda: plan.price.USD, saving: perSeat - plan.price.USD };
}

export function formatPrice(value, currency = 'COP') {
  if (value === 0) return 'Gratis';
  return new Intl.NumberFormat(currency === 'COP' ? 'es-CO' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'COP' ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(value);
}
