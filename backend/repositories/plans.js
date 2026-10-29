import { planLimits } from '../plans.js';
const columns = 'plan,plan_status AS status,extra_storage_packs AS "extraPacks",custom_members AS "customMembers",custom_storage_gb AS "customStorageGb"';

export async function workspacePlan(db, workspaceId) {
  const row = (await db.query(`SELECT ${columns} FROM workspaces WHERE id=$1`, [workspaceId])).rows[0];
  return row ? { ...row, limits: planLimits(row) } : null;
}

export async function accountPlan(db, userId) {
  const row = (await db.query('SELECT plan,plan_status AS status,extra_storage_packs AS "extraPacks" FROM users WHERE id=$1', [userId])).rows[0];
  return row ? { ...row, limits: planLimits(row) } : null;
}

// Same rule the upload reservation uses: ready files plus uploads still in flight.
export async function workspaceStorageUsed(db, workspaceId) {
  return Number((await db.query("SELECT COALESCE(sum(size),0) AS size FROM shared_media_files WHERE workspace_id=$1 AND (state='ready' OR object_key IS NOT NULL OR (state IN ('staging','received') AND expires_at>now()))", [workspaceId])).rows[0].size);
}

export async function accountStorageUsed(db, userId) {
  return Number((await db.query('SELECT COALESCE(sum(size),0) AS size FROM files WHERE user_id=$1', [userId])).rows[0].size);
}

export async function workspaceSeatsUsed(db, workspaceId) {
  return Number((await db.query('SELECT (SELECT count(*) FROM workspace_members WHERE workspace_id=$1)+(SELECT count(*) FROM workspace_invitations WHERE workspace_id=$1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now()) AS count', [workspaceId])).rows[0].count);
}
