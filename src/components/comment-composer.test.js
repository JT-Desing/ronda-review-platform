import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const component = name => readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');

test('personal and shared review composers keep audio, text and send actions in one message bar', () => {
  const personal = component('../main.jsx');
  const shared = component('SharedReviewRoom.jsx');
  assert.match(personal, /<div className="composer-message-bar"><AudioCommentInput/);
  assert.match(personal, /composer-message-bar[\s\S]*?aria-label="Escribir comentario"[\s\S]*?aria-label="Publicar comentario"/);
  assert.match(shared, /<div className="composer-message-bar"><AudioCommentInput/);
  assert.match(shared, /composer-message-bar[\s\S]*?aria-label="Publicar comentario"/);
  assert.match(shared, /className="composer-bottom"><label className="comment-priority"/);
});

test('WhatsApp-style icon controls remain accessible and retain recording status', () => {
  const audio = component('AudioCommentInput.jsx');
  assert.match(audio, /aria-label="Adjuntar MP3 u otro audio"/);
  assert.match(audio, /aria-pressed=\{recording\}/);
  assert.match(audio, /title=\{recording\?/);
  assert.match(audio, /role="status">Grabando/);
  assert.match(audio, /aria-hidden="true" viewBox="0 0 24 24"/);
});

test('composer bar maintains keyboard focus and 44px touch controls', () => {
  const css = component('comment-composer.css');
  assert.match(css, /composer-message-bar:focus-within/);
  assert.match(css, /:focus-visible\{outline:2px solid var\(--accent\)/);
  assert.match(css, /@media\(pointer:coarse\)[\s\S]*?height:44px;min-height:44px/);
  assert.doesNotMatch(css, /transition:\s*all/);
});
