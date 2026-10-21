import test from 'node:test';
import assert from 'node:assert/strict';
import { plans, customPlan, extraStorage, monthlyPrice, annualTotal, planForTeam, perSeatComparison, formatPrice, MAX_TEAM } from './plans.js';

const estudio = plans.find((plan) => plan.id === 'estudio');

test('el pago anual cobra 10 de 12 meses', () => {
  assert.equal(annualTotal(estudio, 'USD'), 290);
  assert.equal(monthlyPrice(estudio, { currency: 'USD', billing: 'annual' }), 24.17);
  assert.equal(monthlyPrice(estudio, { currency: 'COP', billing: 'annual' }), 99200);
});

test('el plan gratis sigue en cero con pago anual', () => {
  assert.equal(monthlyPrice(plans[0], { billing: 'annual' }), 0);
});

test('las cuotas siguen el análisis de costos', () => {
  assert.deepEqual(plans.map((p) => p.storage), ['2 GB', '50 GB', '200 GB', '500 GB']);
  assert.equal(extraStorage.price.COP, 15000);
  assert.equal(customPlan.price.COP, 990000);
  assert.equal(customPlan.storage, '2 TB');
});

test('elige el plan pago más barato que cubre al equipo', () => {
  assert.equal(planForTeam(1).id, 'creador');
  assert.equal(planForTeam(2).id, 'estudio');
  assert.equal(planForTeam(5).id, 'estudio');
  assert.equal(planForTeam(6).id, 'agencia');
  assert.equal(planForTeam(15).id, 'agencia');
  assert.equal(planForTeam(16).id, 'a-medida');
});

test('compara contra el precio por persona y acota el rango', () => {
  const five = perSeatComparison(5);
  assert.deepEqual([five.members, five.perSeat, five.ronda, five.saving], [5, 75, 29, 46]);
  const forty = perSeatComparison(40);
  assert.deepEqual([forty.plan.id, forty.perSeat, forty.ronda], ['a-medida', 600, 248]);
  assert.equal(perSeatComparison(0).members, 1);
  assert.equal(perSeatComparison(999).members, MAX_TEAM);
});

test('pesos con signo y dólares con sigla, sin mezclarlos', () => {
  assert.equal(formatPrice(0), 'Gratis');
  assert.equal(formatPrice(119000, 'COP'), '$ 119.000');
  assert.equal(formatPrice(29, 'USD'), 'USD 29');
  assert.equal(formatPrice(24.17, 'USD'), 'USD 24,17');
});
