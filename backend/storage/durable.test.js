import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {syncDirectories} from './durable.js';

test('syncDirectories flushes existing directories and fails on missing ones', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ronda-durable-'));
  try {
    await syncDirectories(root, tmpdir());
    await assert.rejects(syncDirectories(join(root, 'missing')), {code: 'ENOENT'});
  } finally { await rm(root, {recursive: true}); }
});
