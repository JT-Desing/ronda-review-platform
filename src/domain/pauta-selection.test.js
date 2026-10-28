import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readPautaSelection,writePautaSelection,readPautaDestination,writePautaDestination} from './pauta-selection.js';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    values,
  };
}

test('restores the selected campaign only when it still exists in the account data', () => {
  const storage = memoryStorage({'ronda-pauta:selected:v1':'campaign-a'});
  assert.equal(readPautaSelection([{id:'campaign-a'}], () => storage), 'campaign-a');
  assert.equal(readPautaSelection([{id:'campaign-b'}], () => storage), null);
  assert.equal(storage.getItem('ronda-pauta:selected:v1'), null, 'stale campaign selection is removed');
});

test('selection storage can be blocked without preventing Pauta from opening', () => {
  assert.equal(readPautaSelection([{id:'campaign-a'}], () => { throw new Error('SecurityError'); }), null);
  assert.equal(writePautaSelection('campaign-a', () => { throw new Error('SecurityError'); }), false);
});

test('writes and clears selection in the current session only', () => {
  const storage = memoryStorage();
  assert.equal(writePautaSelection('campaign-a', () => storage), true);
  assert.equal(readPautaSelection([{id:'campaign-a'}], () => storage), 'campaign-a');
  assert.equal(writePautaSelection(null, () => storage), true);
  assert.equal(readPautaSelection([{id:'campaign-a'}], () => storage), null);
});

test('restores a campaign destination only while its ad group still exists', () => {
  const storage = memoryStorage();
  const campaign = {id:'campaign-a',adGroups:[{id:'group-a'}]};
  assert.equal(writePautaDestination(campaign.id,'group-a',() => storage),true);
  assert.equal(readPautaDestination(campaign,() => storage),'group-a');
  assert.equal(readPautaDestination({...campaign,adGroups:[]},() => storage),'legacy');
  assert.equal(storage.getItem('ronda-pauta:destination:v1:campaign-a'),null);
});

test('keeps destinations isolated by campaign and tolerates blocked storage', () => {
  const storage = memoryStorage();
  writePautaDestination('campaign-a','group-a',() => storage);
  assert.equal(readPautaDestination({id:'campaign-b',adGroups:[{id:'group-a'}]},() => storage),'legacy');
  assert.equal(readPautaDestination({id:'campaign-a',adGroups:[{id:'group-a'}]},() => { throw new Error('SecurityError'); }),'legacy');
  assert.equal(writePautaDestination('campaign-a','group-a',() => { throw new Error('SecurityError'); }),false);
});
