import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('brand carousel copy matches the Spanish interface language',()=>{
  const source=readFileSync(new URL('./BrandReferenceCarousel.jsx',import.meta.url),'utf8');
  assert.match(source,/Una identidad, nuevas perspectivas\./);
  assert.doesNotMatch(source,/Une identité, de nouvelles perspectives\./);
});
