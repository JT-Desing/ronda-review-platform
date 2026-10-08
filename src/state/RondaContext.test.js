import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeedState } from '../data/seed.js';
import { migrateLegacyComments, normalizeRondaState } from './migration.js';

const memoryStorage = values => ({
  values: { ...values },
  getItem(key) { return this.values[key] ?? null; },
  setItem(key, value) { this.values[key] = String(value); },
});

test('migra timecode, autor y respuestas de comentarios antiguos', () => {
  const storage = memoryStorage({ 'ronda-comments': JSON.stringify([{ id: 7, author: 'Julian T.', text: 'Cambio histórico', time: '00:00:12', frame: 288, replies: [{ id: 'r1', text: 'Listo' }] }]) });
  const state = migrateLegacyComments(createSeedState(), storage);
  assert.equal(state.comments['legacy-7'].timeSeconds, 12);
  assert.equal(state.comments['legacy-7'].authorId, 'member-julian');
  assert.equal(state.comments['legacy-7'].replies.length, 1);
  assert.equal(storage.getItem('ronda-comments-migrated'), null);
});

test('evita duplicar un comentario antiguo que ya existe en el estado', () => {
  const storage = memoryStorage({ 'ronda-comments': JSON.stringify([{ id: 8, text: 'Este encuadre funciona.', frame: 338 }]) });
  const state = migrateLegacyComments(createSeedState(), storage);
  assert.equal(Object.keys(state.comments).length, 2);
  assert.equal(state.comments['legacy-8'], undefined);
});

test('normaliza estados guardados y repara segundos desde el fotograma', () => {
  const seed = createSeedState();
  seed.comments['legacy-copy'] = { ...seed.comments['comment-2'], id: 'legacy-copy', timeSeconds: 0 };
  seed.comments['legacy-unique'] = { id: 'legacy-unique', text: 'Único', frame: 240, timeSeconds: 0 };
  const state = normalizeRondaState(seed);
  assert.equal(state.comments['legacy-copy'], undefined);
  assert.equal(state.comments['legacy-unique'].timeSeconds, 10);
});

test('repetir la migración produce las mismas claves sin depender de un marcador lateral', () => {
  const storage = memoryStorage({ 'ronda-comments': JSON.stringify([{ id: 9, text: 'Persistente', frame: 48 }]) });
  const first = migrateLegacyComments(createSeedState(), storage);
  const second = migrateLegacyComments(createSeedState(), storage);
  assert.deepEqual(Object.keys(second.comments), Object.keys(first.comments));
  assert.equal(second.comments['legacy-9'].timeSeconds, 2);
});

test('un JSON antiguo corrupto no impide recuperar el estado inicial', () => {
  const storage = memoryStorage({ 'ronda-comments': '{malformado' });
  const state = migrateLegacyComments(createSeedState(), storage);
  assert.deepEqual(Object.keys(state.comments), ['comment-1', 'comment-2']);
});
