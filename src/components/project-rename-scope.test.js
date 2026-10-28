import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const tile=readFileSync(new URL('./StudioWorkspace.jsx',import.meta.url),'utf8');
const shared=readFileSync(new URL('./SharedProjects.jsx',import.meta.url),'utf8');

test('project rename helper defaults to a private-library explanation',()=>{
  assert.match(tile,/renameHelpText='El cambio solo afecta tu biblioteca privada\.'/);
  assert.match(tile,/<small>\{renameHelpText\}<\/small>/);
});

test('shared project rename explains that the whole team sees the new name',()=>{
  assert.match(shared,/renameHelpText="El nuevo nombre se comparte con todo el equipo\."/);
  assert.match(shared,/Nombre actualizado para todo el equipo/);
});
