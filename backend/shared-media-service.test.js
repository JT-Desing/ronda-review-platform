import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {sharedMediaService} from './shared-media-service.js';

// Records whether a write transaction (workspace row locked FOR UPDATE) is open.
function fakeRepository() {
  const state = {writeOpen: false};
  const db = {async query(sql) {
    if (sql.startsWith('SELECT * FROM shared_assets')) return {rows: []};
    if (sql.startsWith('INSERT INTO shared_assets')) return {rows: [{id: randomUUID(), project_id: 'p', name: 'Web', kind: 'web', revision: 0}]};
    if (sql.startsWith('INSERT INTO shared_versions')) return {rows: [{id: randomUUID()}]};
    return {rows: []};
  }};
  return {state, async project() {}, async access(space, actor, operation, write = false) {
    if (write) state.writeOpen = true;
    try { return await operation(db, 'admin'); } finally { if (write) state.writeOpen = false; }
  }};
}

test('addLink inspects the external URL without holding the workspace write lock', async () => {
  const repository = fakeRepository();
  const lockedDuringInspect = [];
  const inspect = async url => { lockedDuringInspect.push(repository.state.writeOpen); return {url, type: 'web', mime: 'text/html'}; };
  const service = sharedMediaService(repository, null, inspect);
  await service.addLink(randomUUID(), randomUUID(), {projectId: randomUUID(), name: 'Web', url: 'https://example.com/', requestId: randomUUID()});
  assert.deepEqual(lockedDuringInspect, [false]);
});
