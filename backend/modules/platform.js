import { reply, body } from '../http.js';
import { withPlatformRole } from '../platform-access.js';
import { validatePlanChange, planLimits, TEAM_PLANS } from '../plans.js';
import { workspaceError } from '../workspace-policy.js';
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const planColumns = 'plan,plan_status AS status,extra_storage_packs AS "extraPacks"';
const teamColumns = `${planColumns},custom_members AS "customMembers",custom_storage_gb AS "customStorageGb"`;

async function objectBody(req) {
  const value = await body(req);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw workspaceError(400, 'El cuerpo debe ser un objeto JSON.');
  return value;
}
const withLimits = row => ({ ...row, limits: planLimits(row) });
const planInput = (input, current) => ({
  plan: input.plan ?? current.plan,
  status: input.status ?? current.status,
  extraPacks: input.extraPacks ?? current.extraPacks,
  customMembers: input.customMembers === undefined ? current.customMembers ?? null : input.customMembers,
  customStorageGb: input.customStorageGb === undefined ? current.customStorageGb ?? null : input.customStorageGb,
});

async function listWorkspaces(pool) {
  const rows = (await pool.query(`SELECT w.id,w.name,w.created_at,${teamColumns.replace(/(^|,)/g, '$1w.')},
      (SELECT count(*) FROM workspace_members m WHERE m.workspace_id=w.id)::int AS members,
      (SELECT count(*) FROM workspace_invitations i WHERE i.workspace_id=w.id AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>now())::int AS invitations,
      (SELECT COALESCE(sum(size),0) FROM shared_media_files f WHERE f.workspace_id=w.id AND (f.state='ready' OR f.object_key IS NOT NULL))::bigint AS "storageBytes",
      (SELECT array_agg(u.email ORDER BY u.email) FROM workspace_members m JOIN users u ON u.id=m.user_id WHERE m.workspace_id=w.id AND m.role='admin') AS admins
    FROM workspaces w WHERE w.kind='team' ORDER BY w.created_at,w.id`)).rows;
  return rows.map(row => ({ ...withLimits(row), storageBytes: Number(row.storageBytes) }));
}

async function createWorkspace(pool, actorId, input) {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name || name.length > 80) throw workspaceError(400, 'Escribe un nombre de empresa de 1 a 80 caracteres.');
  const email = typeof input.adminEmail === 'string' ? input.adminEmail.trim().toLowerCase() : '';
  const change = planInput(input, { status: 'active', extraPacks: 0 });
  validatePlanChange(change, { team: true });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const admin = (await client.query('SELECT id FROM users WHERE email=$1', [email])).rows[0];
    if (!admin) throw workspaceError(404, 'La persona administradora debe registrarse primero en Ronda.');
    const workspace = (await client.query("INSERT INTO workspaces(name,kind,created_by,plan,plan_status,extra_storage_packs,custom_members,custom_storage_gb) VALUES($1,'team',$2,$3,$4,$5,$6,$7) RETURNING id", [name, admin.id, change.plan, change.status, change.extraPacks, change.customMembers, change.customStorageGb])).rows[0];
    await client.query("INSERT INTO workspace_members(workspace_id,user_id,role) VALUES($1,$2,'admin')", [workspace.id, admin.id]);
    await client.query("INSERT INTO workspace_events(workspace_id,actor_id,action,details) VALUES($1,$2,'workspace.created',$3)", [workspace.id, actorId, { name, plan: change.plan, by: 'platform' }]);
    await client.query('COMMIT');
    return { workspace: { id: workspace.id, name, ...withLimits(change) } };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

async function updateWorkspacePlan(pool, actorId, workspaceId, input) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = (await client.query(`SELECT ${teamColumns} FROM workspaces WHERE id=$1 AND kind='team' FOR UPDATE`, [workspaceId])).rows[0];
    if (!current) throw workspaceError(404, 'Espacio de equipo no disponible.');
    const change = planInput(input, current);
    validatePlanChange(change, { team: true });
    if (change.plan !== 'a-medida') Object.assign(change, { customMembers: null, customStorageGb: null });
    await client.query('UPDATE workspaces SET plan=$2,plan_status=$3,extra_storage_packs=$4,custom_members=$5,custom_storage_gb=$6 WHERE id=$1', [workspaceId, change.plan, change.status, change.extraPacks, change.customMembers, change.customStorageGb]);
    await client.query("INSERT INTO workspace_events(workspace_id,actor_id,action,details) VALUES($1,$2,'workspace.plan_changed',$3)", [workspaceId, actorId, { from: current, to: change }]);
    await client.query('COMMIT');
    return { workspace: { id: workspaceId, ...withLimits(change) } };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

async function findAccount(pool, email) {
  const row = (await pool.query(`SELECT id,name,email,${planColumns},(SELECT COALESCE(sum(size),0) FROM files f WHERE f.user_id=users.id)::bigint AS "storageBytes" FROM users WHERE email=$1`, [email.trim().toLowerCase()])).rows[0];
  if (!row) throw workspaceError(404, 'No hay una cuenta con ese correo.');
  return { account: { ...withLimits(row), storageBytes: Number(row.storageBytes) } };
}

async function updateAccountPlan(pool, accountId, input) {
  const current = (await pool.query(`SELECT ${planColumns} FROM users WHERE id=$1`, [accountId])).rows[0];
  if (!current) throw workspaceError(404, 'Cuenta no disponible.');
  const change = planInput(input, current);
  validatePlanChange({ ...change, customMembers: null, customStorageGb: null }, { team: false });
  await pool.query('UPDATE users SET plan=$2,plan_status=$3,extra_storage_packs=$4 WHERE id=$1', [accountId, change.plan, change.status, change.extraPacks]);
  return { account: { id: accountId, ...withLimits(change) } };
}

export const isPlatformPath = path => path === '/api/platform' || path?.startsWith('/api/platform/');

// Platform owner console: every route requires the configured superadmin.
export async function handlePlatform({ req, res, path, account, pool }) {
  if (!account) return reply(res, 401, { error: 'Inicia sesión.' });
  if (withPlatformRole(account).platformRole !== 'superadmin') return reply(res, 403, { error: 'Solo el superadministrador de Ronda puede gestionar planes.' });
  if (path === '/api/platform/workspaces' && req.method === 'GET') return reply(res, 200, { workspaces: await listWorkspaces(pool), teamPlans: TEAM_PLANS });
  if (path === '/api/platform/workspaces' && req.method === 'POST') return reply(res, 201, await createWorkspace(pool, account.id, await objectBody(req)));
  const workspace = path.match(new RegExp(`^/api/platform/workspaces/(${uuid})$`));
  if (workspace && req.method === 'PATCH') return reply(res, 200, await updateWorkspacePlan(pool, account.id, workspace[1], await objectBody(req)));
  if (path === '/api/platform/accounts' && req.method === 'GET') {
    const email = new URL(req.url, 'http://ronda.invalid').searchParams.get('email') || '';
    if (!email) throw workspaceError(400, 'Indica el correo de la cuenta.');
    return reply(res, 200, await findAccount(pool, email));
  }
  const accountMatch = path.match(new RegExp(`^/api/platform/accounts/(${uuid})$`));
  if (accountMatch && req.method === 'PATCH') return reply(res, 200, await updateAccountPlan(pool, accountMatch[1], await objectBody(req)));
  return reply(res, 404, { error: 'Ruta no disponible.' });
}
