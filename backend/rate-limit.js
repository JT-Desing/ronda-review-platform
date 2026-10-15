// nginx overwrites this header on every proxied request with Cloudflare's
// CF-Connecting-IP (see nginx.conf); the API port is not published outside
// the Docker network, so clients cannot set it themselves.
const CLIENT_IP_HEADER = 'x-ronda-client-ip';

export function clientAddress(req) {
  const forwarded = req.headers[CLIENT_IP_HEADER];
  return (typeof forwarded === 'string' && forwarded.trim()) || req.socket?.remoteAddress || 'unknown';
}

// Fixed-window counter stored in PostgreSQL so every API replica shares it.
export function rateLimiter(pool) {
  return async function allow(key, max, windowSeconds) {
    const result = await pool.query(`INSERT INTO auth_attempts(key,attempts) VALUES($1,1)
      ON CONFLICT(key) DO UPDATE SET
        attempts=CASE WHEN auth_attempts.window_start<now()-make_interval(secs=>$2) THEN 1 ELSE auth_attempts.attempts+1 END,
        window_start=CASE WHEN auth_attempts.window_start<now()-make_interval(secs=>$2) THEN now() ELSE auth_attempts.window_start END
      RETURNING attempts`, [key, windowSeconds]);
    return result.rows[0].attempts <= max;
  };
}
