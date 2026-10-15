// Rows that only expire, never get deleted by the request path, and would
// otherwise grow without bound.
export async function purgeExpired(pool) {
  const sessions = await pool.query('DELETE FROM sessions WHERE expires_at < now()');
  const oauthStates = await pool.query('DELETE FROM oauth_states WHERE expires_at < now()');
  // The longest rate-limit window is one hour; a day never drops a live counter.
  const authAttempts = await pool.query("DELETE FROM auth_attempts WHERE window_start < now() - interval '1 day'");
  return { sessions: sessions.rowCount, oauthStates: oauthStates.rowCount, authAttempts: authAttempts.rowCount };
}
