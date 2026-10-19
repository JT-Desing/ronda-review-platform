import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = file => readFileSync(new URL(file, import.meta.url), 'utf8');

test('account actions are exposed to the signed-in profile menu, not a separate strip', () => {
  const access = source('./AccountAccess.jsx');
  const app = source('../main.jsx');
  const menu = source('./AccountProfileMenu.jsx');
  const sharedReview = source('./SharedReviewRoom.jsx');
  assert.match(access, /AccountActionsContext\.Provider/);
  assert.doesNotMatch(access, /className="account-bar"/);
  assert.match(app, /AccountProfileMenu initials=/);
  assert.match(menu, /aria-expanded=\{open\}/);
  assert.match(menu, /aria-live="polite"/);
  assert.match(menu, /Importar copia local/);
  assert.match(menu, /Cerrar sesión/);
  assert.match(sharedReview, /<AccountProfileMenu initials=/);
});

test('profile menu closes on Escape/outside click and preserves accessible touch targets', () => {
  const app = source('../main.jsx');
  const css = source('./account-access.css');
  const studio = source('../studio-theme.css');
  const menu = source('./AccountProfileMenu.jsx');
  assert.match(menu, /closeOnOutside/);
  assert.match(menu, /closeOnEscape/);
  assert.match(css, /\.account-profile-trigger\{[^}]*min-height:44px/);
  assert.match(css, /\.account-profile-action,\.account-profile-links button\{[^}]*min-height:44px/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /@keyframes account-popover-enter\{from\{transform:translateY\(-5px\) scale\(\.99\)\}to\{transform:translateY\(0\) scale\(1\)\}\}/);
  assert.match(studio, /\.studio-topbar\{position:relative;z-index:50;/);
});
