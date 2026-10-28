import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const picker=readFileSync(new URL('./WorkspacePicker.jsx',import.meta.url),'utf8');
const team=readFileSync(new URL('./WorkspaceTeam.jsx',import.meta.url),'utf8');
const app=readFileSync(new URL('../main.jsx',import.meta.url),'utf8');

test('workspace picker announces loading instead of briefly claiming there are no spaces',()=>{
  assert.match(picker,/loading\s*\?\s*'Cargando espacios…'/);
  assert.match(picker,/aria-busy=\{loading\|\|undefined\}/);
  assert.match(team,/<WorkspacePicker[^>]*loading=\{loading\}/);
});

test('team route topbar does not reuse the private workspace label',()=>{
  assert.match(app,/currentView==='team'\?'Espacio de trabajo'/);
});
