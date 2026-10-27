import test from 'node:test';
import assert from 'node:assert/strict';
import { transactionalEmail } from './email-template.js';

test('transactional email escapes copy and links while preserving a mobile-friendly branded action', () => {
  const html = transactionalEmail({
    preheader: 'Vista previa <safe>', eyebrow: 'Acceso', title: 'Unirse & colaborar',
    paragraphs: ['Hola <script>alert(1)</script>'], actionLabel: 'Abrir Ronda',
    actionUrl: 'https://ronda.example/#invite/token?a=1&b=2', details: ['Caduca pronto.'],
  });
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /name="viewport"/);
  assert.match(html, /src="cid:ronda-mark@ronda"/);
  assert.match(html, /Hola &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/i);
  assert.match(html, /href="https:\/\/ronda\.example\/#invite\/token\?a=1&amp;b=2"/);
  assert.match(html, /Abrir Ronda/);
  assert.match(html, /Ronda · Revisión y colaboración creativa/);
});
