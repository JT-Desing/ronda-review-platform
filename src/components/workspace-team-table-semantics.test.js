import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source = readFileSync(new URL('./WorkspaceTeam.jsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./workspace-team.css', import.meta.url), 'utf8') +
  readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

test('active member and pending invitation tables expose row and column semantics', () => {
  assert.match(source, /className="member-table" role="table" aria-label="Miembros del espacio"/);
  assert.match(source, /className="member-table" role="table" aria-label="Invitaciones pendientes"/);
  assert.equal((source.match(/role="columnheader"/g) ?? []).length, 8);
  assert.equal((source.match(/className="member-row" role="row"/g) ?? []).length, 2);
  assert.equal((source.match(/className="member-role-cell" role="cell"/g) ?? []).length, 2);
  assert.equal((source.match(/className="member-action-cell" role="cell"/g) ?? []).length, 2);
});

test('team role and action cells preserve the desktop/mobile grid layout', () => {
  assert.match(styles, /\.team-page \.member-role-cell select\{width:100%\}/);
  assert.match(styles, /\.team-page \.member-action-cell\{display:flex;justify-content:flex-end\}/);
  assert.match(styles, /\.team-page \.member-role-cell\{grid-column:1;grid-row:2\}/);
  assert.match(styles, /\.team-page \.member-action-cell\{grid-column:2;grid-row:2\/4/);
});
