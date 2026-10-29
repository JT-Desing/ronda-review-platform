import test from 'node:test';
import assert from 'node:assert/strict';
import { mentionedMemberIds } from './mentions.js';

const members = [{ id: 'a', name: 'Ana' }, { id: 'am', name: 'Ana María' }, { id: 'j', name: 'Johana Ruiz' }];

test('finds tagged members by full name, case-insensitive', () => {
  assert.deepEqual(mentionedMemberIds('@johana ruiz revisa esto', members), ['j']);
  assert.deepEqual(mentionedMemberIds('Hola @Ana María y @Ana', members).sort(), ['a', 'am']);
});

test('a longer name does not also tag the shorter one, and partial words do not count', () => {
  assert.deepEqual(mentionedMemberIds('@Ana María mira', members), ['am']);
  assert.deepEqual(mentionedMemberIds('@Anabel', members), []);
  assert.deepEqual(mentionedMemberIds('sin menciones', members), []);
});
