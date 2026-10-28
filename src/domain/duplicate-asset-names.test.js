import { test } from 'node:test';
import assert from 'node:assert/strict';
import { duplicateAssetNamePositions } from './duplicate-asset-names.js';

test('marks repeated names with a unique current position and total', () => {
  const assets = [
    { id: 'a', name: 'Campaña.png' },
    { id: 'b', name: 'Logo.svg' },
    { id: 'c', name: 'Campaña.png' },
  ];

  assert.deepEqual([...duplicateAssetNamePositions(assets)], [
    ['a', { index: 1, count: 2 }],
    ['c', { index: 2, count: 2 }],
  ]);
});

test('groups filename variants case-insensitively and ignores blank names', () => {
  const assets = [
    { id: 'a', name: '  Logo.PNG ' },
    { id: 'b', name: 'logo.png' },
    { id: 'c', name: '' },
    { id: 'd', name: 'Unique.png' },
  ];

  assert.deepEqual([...duplicateAssetNamePositions(assets)], [
    ['a', { index: 1, count: 2 }],
    ['b', { index: 2, count: 2 }],
  ]);
});

test('does not expose internal identifiers for unique media names', () => {
  assert.equal(duplicateAssetNamePositions([{ id: 'private-id', name: 'Unique.png' }]).size, 0);
});
