// Reads pending rows of event_outbox and hands them to a consumer.
// At-least-once delivery: a handler can see the same event twice (crash after it
// ran but before the commit), so consumers must dedupe by eventId.
// SKIP LOCKED lets several API processes publish at the same time without
// delivering the same row twice concurrently.

export const OUTBOX_BATCH_SIZE = 50;
export const OUTBOX_MAX_BACKOFF_SECONDS = 3600;
const MAX_ERROR_LENGTH = 500;

export function retryDelaySeconds(attempts) {
  return Math.min(2 ** Math.max(0, attempts), OUTBOX_MAX_BACKOFF_SECONDS);
}

export function toOutboxEvent(row) {
  return Object.freeze({
    seq: Number(row.seq),
    eventId: row.event_id,
    type: row.event_type,
    version: row.event_version,
    aggregate: Object.freeze({ type: row.aggregate_type, id: row.aggregate_id }),
    workspaceId: row.workspace_id,
    actorId: row.actor_id,
    payload: row.payload,
    occurredAt: row.occurred_at,
  });
}

const errorText = error => String(error?.message || error || 'unknown').slice(0, MAX_ERROR_LENGTH);

// Delivers one batch. Returns how many events were published and how many failed.
export async function publishOutboxBatch(pool, handler, { limit = OUTBOX_BATCH_SIZE } = {}) {
  if (typeof handler !== 'function') throw new TypeError('publishOutboxBatch needs a handler function');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const rows = (await client.query(
      `SELECT * FROM event_outbox WHERE published_at IS NULL AND available_at <= now()
       ORDER BY seq LIMIT $1 FOR UPDATE SKIP LOCKED`, [limit])).rows;
    let published = 0, failed = 0;
    for (const row of rows) {
      try {
        await handler(toOutboxEvent(row));
        await client.query('UPDATE event_outbox SET published_at=now(), last_error=NULL WHERE seq=$1', [row.seq]);
        published++;
      } catch (error) {
        const attempts = row.attempts + 1;
        await client.query(
          "UPDATE event_outbox SET attempts=$2, last_error=$3, available_at=now() + make_interval(secs => $4) WHERE seq=$1",
          [row.seq, attempts, errorText(error), retryDelaySeconds(attempts)]);
        failed++;
      }
    }
    await client.query('COMMIT');
    return { published, failed };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { client.release(); }
}

// Pending events, oldest first. For health checks and the future consumer.
export async function outboxBacklog(pool) {
  const row = (await pool.query(
    'SELECT count(*)::int AS pending, min(occurred_at) AS oldest FROM event_outbox WHERE published_at IS NULL')).rows[0];
  return { pending: row.pending, oldest: row.oldest };
}
