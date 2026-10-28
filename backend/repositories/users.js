export function userRepository(pool) {
  return {
    async findByEmail(email) {
      return (await pool.query('SELECT id,email,name,password_hash FROM users WHERE email=$1', [email])).rows[0];
    },
    async createWithWorkspace({ email, name, passwordHash }) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const user = (await client.query('INSERT INTO users(email,name,password_hash) VALUES($1,$2,$3) RETURNING id,email,name', [email, name, passwordHash])).rows[0];
        const space = (await client.query('INSERT INTO workspaces(name) VALUES($1) RETURNING id', [`Espacio de ${name}`])).rows[0];
        await client.query("INSERT INTO workspace_members(workspace_id,user_id,role) VALUES($1,$2,'admin')", [space.id, user.id]);
        await client.query('COMMIT');
        return user;
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    },
  };
}
