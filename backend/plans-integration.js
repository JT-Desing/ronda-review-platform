import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import http from 'node:http';
import { Pool } from 'pg';
import { migrate } from './migration-runner.js';
import { createApp } from './app.js';
const GB = 1024 ** 3, MB = 1024 ** 2;
const admin = new Pool({ connectionString: process.env.DATABASE_URL });
const name = `ronda_plans_qa_${randomUUID().replaceAll('-', '')}`;
const url = new URL(process.env.DATABASE_URL); url.pathname = '/' + name;
const origin = 'https://plans-qa.invalid';
let pool, server;
try {
  await admin.query(`CREATE DATABASE "${name}"`);
  pool = new Pool({ connectionString: url.href }); await migrate(pool);
  server = http.createServer(createApp({ pool, origin }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (path, method = 'GET', input, account) => fetch(base + path, { method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(account ? { Cookie: account.cookie } : {}) }, ...(input === undefined ? {} : { body: JSON.stringify(input) }) });
  const json = async response => ({ status: response.status, body: await response.json() });
  const users = [];
  for (let i = 0; i < 9; i++) {
    const response = await call('/api/auth/register', 'POST', { email: `plans-${i}@example.invalid`, name: `QA ${i}`, password: randomUUID() + randomUUID() });
    assert.equal(response.status, 200);
    users.push({ ...(await response.json()).user, cookie: response.headers.get('set-cookie').split(';')[0] });
  }
  const [platform, companyAdmin, secondAdmin, ...people] = users;
  process.env.RONDA_SUPERADMIN_IDS = platform.id;

  // Personal accounts start on Gratis and only accept personal plans.
  assert.deepEqual((await json(await call('/api/account/plan', 'GET', undefined, companyAdmin))).body.limits, { members: 1, storageBytes: 2 * GB });
  assert.equal((await call(`/api/platform/accounts/${companyAdmin.id}`, 'PATCH', { plan: 'estudio' }, platform)).status, 400);
  assert.equal((await call(`/api/platform/accounts/${companyAdmin.id}`, 'PATCH', { plan: 'creador', status: 'active' }, platform)).status, 200);
  assert.equal((await json(await call('/api/account/plan', 'GET', undefined, companyAdmin))).body.limits.storageBytes, 50 * GB);
  assert.equal((await json(await call(`/api/platform/accounts?email=${encodeURIComponent(companyAdmin.email)}`, 'GET', undefined, platform))).body.account.plan, 'creador');

  // A team needs a team plan and waits on pending (free limits) until activated.
  assert.equal((await call('/api/workspaces', 'POST', { name: 'Empresa Uno', requestId: randomUUID() }, companyAdmin)).status, 400);
  assert.equal((await call('/api/workspaces', 'POST', { name: 'Empresa Uno', requestId: randomUUID(), plan: 'creador' }, companyAdmin)).status, 400);
  const created = await json(await call('/api/workspaces', 'POST', { name: 'Empresa Uno', requestId: randomUUID(), plan: 'estudio' }, companyAdmin));
  assert.equal(created.status, 201);
  const team = created.body.workspace.id;
  const invite = (email, actor = companyAdmin, space = team) => call(`/api/workspaces/${space}/invitations`, 'POST', { email, role: 'reviewer' }, actor);
  assert.equal((await invite(people[0].email)).status, 409);

  // Only the platform owner sees and manages plans.
  assert.equal((await call('/api/platform/workspaces', 'GET', undefined, companyAdmin)).status, 403);
  assert.equal((await call(`/api/platform/workspaces/${team}`, 'PATCH', { status: 'active' }, companyAdmin)).status, 403);
  const listed = (await json(await call('/api/platform/workspaces', 'GET', undefined, platform))).body.workspaces.find(space => space.id === team);
  assert.equal(listed.plan, 'estudio'); assert.equal(listed.status, 'pending'); assert.deepEqual(listed.admins, [companyAdmin.email]);

  // Estudio active: 5 people counting the admin and pending invitations.
  assert.equal((await call(`/api/platform/workspaces/${team}`, 'PATCH', { status: 'active' }, platform)).status, 200);
  for (const person of people.slice(0, 4)) assert.equal((await invite(person.email)).status, 201);
  const full = await json(await invite(people[4].email));
  assert.equal(full.status, 409); assert.match(full.body.error, /5 personas/);
  assert.equal((await call(`/api/platform/workspaces/${team}`, 'PATCH', { plan: 'creador' }, platform)).status, 400);
  const packs = await json(await call(`/api/platform/workspaces/${team}`, 'PATCH', { extraPacks: 1 }, platform));
  assert.equal(packs.body.workspace.limits.storageBytes, 300 * GB);
  assert.equal((await call(`/api/platform/workspaces/${team}`, 'PATCH', { plan: 'agencia' }, platform)).status, 200);
  assert.equal((await invite(people[4].email)).status, 201);

  // The platform owner creates a second company for an existing account.
  assert.equal((await call('/api/platform/workspaces', 'POST', { name: 'Empresa Dos', adminEmail: 'nadie@example.invalid', plan: 'agencia' }, platform)).status, 404);
  const second = await json(await call('/api/platform/workspaces', 'POST', { name: 'Empresa Dos', adminEmail: secondAdmin.email, plan: 'a-medida', customStorageGb: 1 }, platform));
  assert.equal(second.status, 201);
  const secondTeam = second.body.workspace.id;
  assert.ok((await json(await call('/api/workspaces', 'GET', undefined, secondAdmin))).body.workspaces.some(space => space.id === secondTeam && space.role === 'admin'));

  // Storage quota comes from the plan: 1 GB custom contract.
  const project = (await json(await call(`/api/workspaces/${secondTeam}/projects`, 'POST', { name: 'Cuota', client: 'QA', requestId: randomUUID() }, secondAdmin))).body.project.id;
  for (let i = 0; i < 10; i++) await pool.query("INSERT INTO shared_media_files(workspace_id,project_id,created_by,request_id,name,mime,size,kind,state) VALUES($1,$2,$3,$4,'v.mp4','video/mp4',$5,'video','ready')", [secondTeam, project, secondAdmin.id, randomUUID(), 100 * MB]);
  const reserve = size => call(`/api/workspaces/${secondTeam}/projects/${project}/uploads`, 'POST', { name: 'v.mp4', mime: 'video/mp4', size, projectId: project, requestId: randomUUID() }, secondAdmin);
  const over = await json(await reserve(100 * MB));
  assert.equal(over.status, 413); assert.match(over.body.error, /plan del equipo/);
  assert.equal((await reserve(20 * MB)).status, 201);
  const usage = (await json(await call('/api/platform/workspaces', 'GET', undefined, platform))).body.workspaces.find(space => space.id === secondTeam);
  assert.equal(usage.storageBytes, 1000 * MB); assert.equal(usage.limits.storageBytes, GB);
  console.log('PASS plans: personal plans, pending team, activation, seat caps, packs, platform-created company, storage quota.');
} finally {
  delete process.env.RONDA_SUPERADMIN_IDS;
  await new Promise(resolve => server ? server.close(resolve) : resolve());
  await pool?.end();
  await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await admin.end();
}
