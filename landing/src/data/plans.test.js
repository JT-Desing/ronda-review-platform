import test from 'node:test';
import assert from 'node:assert/strict';
import { plans, monthlyPrice, annualTotal, planForTeam, perSeatComparison, formatPrice } from './plans.js';

const estudio = plans.find((plan) => plan.id === 'estudio');

test('el pago anual cobra 10 de 12 meses', () => {
  assert.equal(annualTotal(estudio, 'USD'), 290);
  assert.equal(monthlyPrice(estudio, { currency: 'USD', billing: 'annual' }), 24.17);
  assert.equal(monthlyPrice(estudio, { currency: 'COP', billing: 'annual' }), 99200);
});

test('el plan gratis sigue en cero con pago anual', () => {
  assert.equal(monthlyPrice(plans[0], { billing: 'annual' }), 0);
});

test('elige el plan pago más barato que cubre al equipo', () => {
  assert.equal(planForTeam(1).id, 'creador');
  assert.equal(planForTeam(2).id, 'estudio');
  assert.equal(planForTeam(5).id, 'estudio');
  assert.equal(planForTeam(6).id, 'agencia');
  assert.equal(planForTeam(40).id, 'agencia');
});

test('compara contra el precio por persona y acota el rango', () => {
  assert.deepEqual(
    (({ members, perSeat, ronda, saving }) => ({ members, perSeat, ronda, saving }))(perSeatComparison(5)),
    { members: 5, perSeat: 75, ronda: 29, saving: 46 },
  );
  assert.equal(perSeatComparison(0).members, 1);
  assert.equal(perSeatComparison(99).members, 15);
});

test('formatea pesos sin decimales y el cero como Gratis', () => {
  assert.equal(formatPrice(0), 'Gratis');
  assert.match(formatPrice(119000, 'COP'), /119\.000/);
  assert.equal(formatPrice(29, 'USD'), '$29');
});
