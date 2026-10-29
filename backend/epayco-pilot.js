// Local operator command only: never exposed as an HTTP route.
import { pool } from './database.js';
const workspaceId = 'e9a7c001-67bd-4be9-968d-13e465cd1210';
const email = process.argv[2]?.trim().toLowerCase();
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(741214)');
  await client.query("INSERT INTO workspaces(id,name,kind,plan,plan_status) VALUES($1,$2,'team','agencia','active') ON CONFLICT(id) DO UPDATE SET kind='team',plan=COALESCE(workspaces.plan,'agencia')", [workspaceId, 'ePayco MKT']);
  if (email) {
    const user = (await client.query('SELECT id FROM users WHERE email=$1', [email])).rows[0];
    if (!user) throw new Error('La persona debe registrarse primero en Ronda.');
    const admins = await client.query("SELECT user_id FROM workspace_members WHERE workspace_id=$1 AND role='admin'", [workspaceId]);
    if (admins.rows.some(row => row.user_id !== user.id)) throw new Error('El espacio ya tiene administrador; usa las invitaciones de Equipo.');
    await client.query("INSERT INTO workspace_members(workspace_id,user_id,role) VALUES($1,$2,'admin') ON CONFLICT(workspace_id,user_id) DO NOTHING", [workspaceId, user.id]);
  }
  await client.query('COMMIT');
  console.log(email ? 'epayco_pilot_admin_ready' : 'epayco_pilot_private_workspace_ready_pending_admin');
} catch (error) {
  await client.query('ROLLBACK');
  console.error(error.code ? 'epayco_pilot_setup_failed' : error.message);
  process.exitCode = 1;
} finally { client.release(); await pool.end(); }
