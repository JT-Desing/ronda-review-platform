import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('mobile settings provides a keyboard-accessible route to brand personalization', () => {
  const actions = read('./WorkspaceActions.jsx');
  const main = read('../main.jsx');
  const styles = read('../styles.css');

  assert.match(actions, /SettingsActions\(\{ onNotify, onNavigate \}\)/);
  assert.match(actions, /<button type="button" className="mobile-settings-brand-link" onClick=\{\(\) => onNavigate\('branding'\)\}>[\s\S]*?Personalización[\s\S]*?Nombre comercial, logo y dominio/);
  assert.match(main, /<SettingsActions onNotify=\{setToast\} onNavigate=\{setCurrentView\}\/>/);
  assert.match(main, /currentView==='branding'&&view==='settings'/);
  assert.match(styles, /\.mobile-settings-brand-link\{[^}]*display:none/);
  assert.match(styles, /@media\(max-width:780px\)\{\.app-shell \.mobile-settings-brand-link\{[^}]*min-height:52px[^}]*display:flex/);
});
