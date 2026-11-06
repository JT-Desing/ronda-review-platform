import test from 'node:test';
import assert from 'node:assert/strict';
import { retryDelaySeconds, toOutboxEvent, publishOutboxBatch, OUTBOX_MAX_BACKOFF_SECONDS } from './event-outbox.js';

test('retry delay doubles per attempt and stops at the ceiling', () => {
  assert.deepEqual([0, 1, 2, 5].map(retryDelaySeconds), [1, 2, 4, 32]);
  assert.equal(retryDelaySeconds(40), OUTBOX_MAX_BACKOFF_SECONDS);
});

test('outbox rows become frozen events with a stable shape', () => {
  const event = toOutboxEvent({ seq: '7', event_id: 'e', event_type: 'project.created', event_version: 1, aggregate_type: 'project',
    aggregate_id: 'p', workspace_id: 'w', actor_id: null, payload: { name: 'x' }, occurred_at: 'now', attempts: 0 });
  assert.deepEqual(event, { seq: 7, eventId: 'e', type: 'project.created', version: 1, aggregate: { type: 'project', id: 'p' },
    workspaceId: 'w', actorId: null, payload: { name: 'x' }, occurredAt: 'now' });
  assert.ok(Object.isFrozen(event) && Object.isFrozen(event.aggregate));
});

test('publishing without a handler fails before touching the database', async () => {
  await assert.rejects(publishOutboxBatch({ connect: () => assert.fail('connected') }, null), /handler function/);
});
