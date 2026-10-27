import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../studio-theme.css', import.meta.url), 'utf8');

test('compact desktop navigation keeps the labeled sidebar instead of a clipped icon rail', () => {
  const compactRule = css.match(/@media\s*\(min-width:\s*781px\)\s*and\s*\(max-width:\s*1050px\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(compactRule, 'compact desktop breakpoint should be defined');
  assert.match(compactRule[1], /\.app-shell\s+\.sidebar:not\(\.collapsed\)\s*\{[^}]*display:\s*flex/);
  assert.match(compactRule[1], /\.app-shell\s+\.sidebar:not\(\.collapsed\)\s*\{[^}]*width:\s*184px/);
  assert.match(compactRule[1], /\.app-shell\s+\.sidebar\s+\.side-nav\s+span[^}]*display:\s*revert/);
  assert.match(compactRule[1], /\.app-shell\s+\.sidebar\.collapsed\s*\{[^}]*width:\s*72px/);
  assert.match(compactRule[1], /\.app-shell\s+\.sidebar\.collapsed\s+\.side-nav\s+span[^}]*display:\s*none/);
});

test('collapsed account control stays visible while the logo stays clear and can still expand navigation', () => {
  const source = readFileSync(new URL('./Sidebar.jsx', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../studio-theme.css', import.meta.url), 'utf8');
  assert.match(source, /aria-label=\{collapsed\?'Expandir navegación':'Contraer navegación'\}/);
  assert.match(styles, /\.app-shell \.sidebar\.collapsed \.sidebar-collapse-indicator\{display:none\}/);
  assert.match(source, /collapsed\?<span className="avatar small sidebar-account-menu-avatar"/);
  assert.match(styles, /\.app-shell \.sidebar\.collapsed \.sidebar-account-avatar\{display:none\}/);
  assert.match(styles, /\.app-shell \.sidebar\.collapsed \.sidebar-account-menu-avatar\{display:grid/);
  assert.match(styles, /\.app-shell \.sidebar\.collapsed \.account-menu-trigger\{width:44px;height:44px/);
});
