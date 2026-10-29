import test from 'node:test';
import assert from 'node:assert/strict';
import {PLAN_IDS,TEAM_PLANS,planLimits,validatePlanChange,GB} from './plans.js';

test('plan catalog matches the published plans', () => {
  assert.deepEqual(PLAN_IDS, ['gratis', 'creador', 'estudio', 'agencia', 'a-medida']);
  assert.deepEqual(TEAM_PLANS, ['estudio', 'agencia', 'a-medida']);
  assert.deepEqual(planLimits({plan:'gratis',status:'active'}), {members:1,storageBytes:2*GB});
  assert.deepEqual(planLimits({plan:'creador',status:'active'}), {members:1,storageBytes:50*GB});
  assert.deepEqual(planLimits({plan:'estudio',status:'active'}), {members:5,storageBytes:200*GB});
  assert.deepEqual(planLimits({plan:'agencia',status:'active'}), {members:15,storageBytes:500*GB});
});

test('extra storage packs add 100 GB each', () => {
  assert.equal(planLimits({plan:'estudio',status:'active',extraPacks:2}).storageBytes, 400*GB);
});

test('a pending or suspended plan falls back to the free limits', () => {
  assert.deepEqual(planLimits({plan:'agencia',status:'pending',extraPacks:3}), {members:1,storageBytes:2*GB});
  assert.deepEqual(planLimits({plan:'creador',status:'suspended'}), {members:1,storageBytes:2*GB});
});

test('a custom plan uses the limits agreed in its contract', () => {
  assert.deepEqual(planLimits({plan:'a-medida',status:'active',customMembers:100,customStorageGb:5120}), {members:100,storageBytes:5120*GB});
  assert.deepEqual(planLimits({plan:'a-medida',status:'active'}), {members:300,storageBytes:2048*GB});
});

test('plan changes are validated before reaching the database', () => {
  assert.doesNotThrow(()=>validatePlanChange({plan:'estudio',status:'active',extraPacks:0},{team:true}));
  assert.throws(()=>validatePlanChange({plan:'creador',status:'active'},{team:true}), /equipo/);
  assert.throws(()=>validatePlanChange({plan:'agencia',status:'active'},{team:false}), /personal/);
  assert.throws(()=>validatePlanChange({plan:'oro',status:'active'},{team:true}), /Plan/);
  assert.throws(()=>validatePlanChange({plan:'estudio',status:'gratis'},{team:true}), /Estado/);
  assert.throws(()=>validatePlanChange({plan:'estudio',status:'active',extraPacks:-1},{team:true}), /paquetes/);
  assert.throws(()=>validatePlanChange({plan:'a-medida',status:'active',customMembers:0},{team:true}), /personas/);
});
