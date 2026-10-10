import { digest } from '../security.js';
export function sessionRepository(pool) {
  return {
    async findAccount(value) {
      if (!value) return null;
      const result = await pool.query('SELECT u.id,u.email,u.name FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()', [digest(value)]);
      return result.rows[0] ?? null;
    },
  };
}
