import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = file => readFileSync(new URL(file, import.meta.url), 'utf8');

test('account actions are exposed to the signed-in profile menu, not a separate strip', () => {
  const access = source('./AccountAccess.jsx');
  const app = source('../main.jsx') + source('./Sidebar.jsx');
  const menu = source('./AccountProfileMenu.jsx');
  const sharedReview = source('./SharedReviewRoom.jsx');
  assert.match(access, /AccountActionsContext\.Provider/);
  assert.doesNotMatch(access, /className="account-bar"/);
  assert.match(app, /AccountProfileMenu initials=/);
  assert.match(menu, /aria-expanded=\{open\}/);
  assert.match(menu, /aria-live="polite"/);
  assert.match(menu, /createPortal\(/);
  assert.match(menu, /getBoundingClientRect\(\)/);
  assert.match(menu, /Importar copia local/);
  assert.match(menu, /Cerrar sesión/);
  assert.match(menu, /SINCRONIZACIÓN/);
  assert.match(menu, /Archivos y revisiones privadas/);
  assert.match(menu, /Icon name="folder"/);
  assert.match(sharedReview, /<AccountProfileMenu initials=/);
});

test('profile menu closes on Escape/outside click and preserves accessible touch targets', () => {
  const app = source('../main.jsx') + source('./Sidebar.jsx');
  const css = source('./account-access.css');
  const studio = source('../studio-theme.css');
  const menu = source('./AccountProfileMenu.jsx');
  assert.match(menu, /closeOnOutside/);
  assert.match(menu, /closeOnEscape/);
  assert.match(css, /\.account-profile-trigger\{[^}]*min-height:44px/);
  assert.match(css, /\.account-profile-action,\.account-profile-links button\{[^}]*min-height:44px/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /\.account-profile-popover\{position:fixed;z-index:1000;/);
  assert.match(css, /overscroll-behavior:contain/);
  assert.match(css, /@keyframes account-popover-enter\{from\{transform:translateY\(-5px\) scale\(\.99\)\}to\{transform:translateY\(0\) scale\(1\)\}\}/);
  assert.match(studio, /\.studio-topbar\{position:relative;z-index:50;/);
});

test('workspace account menu is viewport-safe, keyboard dismissible and separates demo entry from account links', () => {
  const app = source('../main.jsx') + source('./Sidebar.jsx');
  const css = source('../company-demo.css');
  assert.match(app, /createPortal\(/);
  assert.match(app, /closeOnOutside/);
  assert.match(app, /closeOnEscape/);
  assert.match(app, /aria-controls="account-workspace-popover"/);
  assert.match(app, /Empresa demo/);
  assert.match(app, /Datos ficticios · aislados de tu cuenta/);
  assert.match(app, /ESPACIO PERSONAL/);
  assert.match(app, /Marca y apariencia/);
  assert.match(css, /\.account-popover\{position:fixed;z-index:1000;/);
  assert.match(css, /\.account-popover-links button\{[^}]*min-height:44px/);
  assert.match(css, /\.account-popover-links button\{display:grid;grid-template-columns:32px minmax\(0,1fr\) 15px/);
  const profileCss = source('./account-access.css');
  assert.match(profileCss, /\.account-profile-links button\{display:grid;grid-template-columns:32px minmax\(0,1fr\) 16px/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
