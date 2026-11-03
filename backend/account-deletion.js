import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { token, hashPassword } from './security.js';
import { workspaceError } from './workspace-policy.js';

// Team content (pieces, comments, decisions) belongs to the team, so the account is
// anonymized instead of deleted: personal data goes away, the team keeps its history.
export async function deleteAccount({ pool, account, input, fileRoot = '/data/files' }) {
  const typed = typeof input?.confirmEmail === 'string' ? input.confirmEmail.trim().toLowerCase() : '';
  if (!typed || typed !== account.email.toLowerCase()) throw workspaceError(400, 'Escribe tu correo exacto para confirmar.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [account.id]);
    const blocking = (await client.query(`SELECT w.name FROM workspace_members m JOIN workspaces w ON w.id=m.workspace_id
      WHERE m.user_id=$1 AND m.role='admin' AND w.kind='team'
      AND NOT EXISTS(SELECT 1 FROM workspace_members o WHERE o.workspace_id=m.workspace_id AND o.user_id<>m.user_id AND o.role='admin')`, [account.id])).rows;
    if (blocking.length) throw workspaceError(409, `Antes de borrar tu cuenta, nombra otro administrador en: ${blocking.map(row => row.name).join(', ')}. Si eres la única persona del equipo, escríbenos a ronda@repolite.link para borrarlo.`);
    const personal = (await client.query("SELECT w.id FROM workspaces w JOIN workspace_members m ON m.workspace_id=w.id WHERE m.user_id=$1 AND w.kind<>'team'", [account.id])).rows.map(row => row.id);
    await client.query('DELETE FROM workspace_members WHERE user_id=$1', [account.id]);
    if (personal.length) await client.query("DELETE FROM workspaces WHERE id=ANY($1::uuid[]) AND kind<>'team'", [personal]);
    await client.query("UPDATE shared_review_decisions SET active=false WHERE user_id=$1", [account.id]);
    await client.query('DELETE FROM files WHERE user_id=$1', [account.id]);
    await client.query('DELETE FROM account_data WHERE user_id=$1', [account.id]);
    await client.query('DELETE FROM user_notifications WHERE user_id=$1', [account.id]);
    await client.query('DELETE FROM sessions WHERE user_id=$1', [account.id]);
    await client.query('DELETE FROM password_reset_tokens WHERE user_id=$1', [account.id]);
    await client.query(`UPDATE users SET email=$2,name='Cuenta eliminada',password_hash=$3,google_sub=NULL,plan='gratis',plan_status='active',extra_storage_packs=0 WHERE id=$1`,
      [account.id, `eliminada-${account.id}@ronda.invalid`, await hashPassword(token())]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
  finally { client.release(); }
  await rm(join(fileRoot, account.id), { recursive: true, force: true }).catch(() => console.error('account_files_cleanup_failed'));
  return { deleted: true };
}
