import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { page, inline } from '../../scripts/build-legal.mjs';

for (const [source, target] of [['politica-tratamiento-datos.md', 'tratamiento-de-datos.html'], ['politica-privacidad.md', 'privacidad.html']]) {
  test(`public/legal/${target} matches docs/legal/${source}; run node scripts/build-legal.mjs after editing`, async () => {
    const markdown = await readFile(new URL(`../../docs/legal/${source}`, import.meta.url), 'utf8');
    assert.equal(await readFile(new URL(`../../public/legal/${target}`, import.meta.url), 'utf8'), page(markdown));
  });
}

test('policy text is escaped and links point to the published pages', () => {
  assert.equal(inline('<b>'), '&lt;b&gt;');
  assert.match(inline('[política](politica-tratamiento-datos.md)'), /href="tratamiento-de-datos.html"/);
  assert.match(inline('escribe a ronda@repolite.link'), /href="mailto:ronda@repolite.link"/);
});
