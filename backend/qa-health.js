export async function qaHealth(pool, persona) {
  try {
    await pool.query('SELECT 1');
    return {
      status: 200,
      body: { qa: true, api: true, persona, storage: 'isolated', mail: 'capture-only' },
    };
  } catch {
    return {
      status: 503,
      body: { qa: true, api: false, persona, storage: 'isolated', mail: 'capture-only' },
    };
  }
}
