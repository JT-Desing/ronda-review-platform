import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('mobile navigation keeps all destinations in one reachable row with accessible icon-only labels', () => {
  const main = read('../main.jsx');
  const styles = read('../styles.css');
  const planning = read('../planning.css');
  const studio = read('../studio-theme.css');

  assert.match(main, /<nav className="mobile-nav" aria-label="Navegación móvil">\{items\.filter\(\(\[view\]\)=>canAccessStudioView\(user,view\)\)\.map\(\(\[view,icon,label\]\)=>\s*<button[^>]*aria-label=\{label\}[^>]*title=\{label\}/);
  assert.match(styles, /\.mobile-nav\{[^}]*grid-template-columns:repeat\(8,minmax\(0,1fr\)\)/);
  assert.match(styles, /@media\(max-width:560px\)\{\.mobile-nav button span\{display:none\}/);
  assert.doesNotMatch(planning, /\.mobile-nav\{grid-template-columns:/);
  assert.doesNotMatch(studio, /\.mobile-nav\{grid-template-columns:/);
});
