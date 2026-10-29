import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PLAN_CATALOG, TEAM_PLAN_IDS, PERSONAL_PLAN_IDS, planSummary, formatBytes, usageLevel } from './plans.js';

test('frontend catalog matches the plans the backend enforces', async () => {
  const backend = await readFile(new URL('../../backend/plans.js', import.meta.url), 'utf8');
  for (const [id, plan] of Object.entries(PLAN_CATALOG)) {
    assert.match(backend, new RegExp(`'?${id}'?: \\{ members: ${plan.members}, storageGb: ${plan.storageGb}, team: ${plan.team} \\}`), id);
  }
  assert.deepEqual(TEAM_PLAN_IDS, ['estudio', 'agencia', 'a-medida']);
  assert.deepEqual(PERSONAL_PLAN_IDS, ['gratis', 'creador']);
});

test('plan labels and usage are readable', () => {
  assert.equal(planSummary('estudio'), 'Hasta 5 personas · 200 GB');
  assert.equal(planSummary('creador'), '1 persona · 50 GB');
  assert.equal(formatBytes(1.5 * 1024 ** 3), '1,5 GB');
  assert.equal(formatBytes(300 * 1024 ** 2), '300 MB');
  assert.deepEqual(usageLevel(81, 100), { percent: 81, warning: true });
  assert.deepEqual(usageLevel(5, 0), { percent: 0, warning: false });
});
