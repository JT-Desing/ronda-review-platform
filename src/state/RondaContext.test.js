import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeedState } from '../data/seed.js';
import { loadSessionDraft, migrateLegacyComments, normalizeRondaState, persistRondaState, readDraftForContext, saveSessionDraft } from './migration.js';

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

test('informa cuando el navegador rechaza la persistencia sin lanzar', () => {
  const storage={setItem(){const error=new Error('full');error.name='QuotaExceededError';throw error}};
  assert.deepEqual(persistRondaState(storage,'ronda-state:v1',createSeedState()),{ok:false,reason:'quota'});
});

test('guarda, recupera y elimina el borrador de la sesión', () => {
  const storage=memoryStorage({}); storage.removeItem=function(key){delete this.values[key]};
  assert.equal(saveSessionDraft(storage,'draft','Ajustar contraste'),true);
  assert.equal(loadSessionDraft(storage,'draft'),'Ajustar contraste');
  assert.equal(saveSessionDraft(storage,'draft',''),true);
  assert.equal(loadSessionDraft(storage,'draft'),'');
});

test('aísla borradores al cambiar de usuario o versión', () => {
  const storage=memoryStorage({'draft-A':'Texto de A','draft-B':'Texto de B'});
  const cache={'draft-A':'Edición local de A'};
  assert.equal(readDraftForContext(cache,storage,'draft-A'),'Edición local de A');
  assert.equal(readDraftForContext(cache,storage,'draft-B'),'Texto de B');
  assert.equal(storage.getItem('draft-B'),'Texto de B');
});
