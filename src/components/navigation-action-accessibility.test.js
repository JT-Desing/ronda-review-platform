import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('notification trigger announces whether its popover is expanded',()=>{
 const source=readFileSync(new URL('../main.jsx',import.meta.url),'utf8');
 assert.match(source,/className="notification-trigger" aria-label=\{`\$\{unread\.length\} notificaciones sin leer`\} aria-expanded=\{open\}/);
});

test('planning demo clearly declares read-only mode and exposes no live mutation controls',()=>{
 const source=readFileSync(new URL('./Planning.jsx',import.meta.url),'utf8');
 const styles=readFileSync(new URL('../planning.css',import.meta.url),'utf8');
 assert.match(source,/DEMO · Datos ficticios · Solo lectura · No se guardan en tu cuenta/);
 assert.match(source,/disabled=\{demo\} title=\{demo\?'Disponible al salir del modo de demostración'/);
 assert.equal((source.match(/disabled=\{demo\} title=\{demo\?'Disponible al salir del modo de demostración'/g)||[]).length,2);
 assert.match(styles,/\.planning-demo-control:has\(button\[aria-pressed=true\]\)\+\.planning-page \.planning-card footer\{display:none\}/);
});

test('tablet layout keeps a labeled left navigation instead of a cramped icon rail',()=>{
 const styles=readFileSync(new URL('../studio-theme.css',import.meta.url),'utf8');
 assert.match(styles,/\.app-shell \.sidebar \.side-nav>button>\.icon\{width:20px;height:20px;flex:0 0 20px\}/);
 assert.match(styles,/@media\(min-width:781px\) and \(max-width:1050px\)/);
 assert.match(styles,/\.app-shell \.sidebar:not\(\.collapsed\)\{display:flex;width:184px;flex:0 0 184px/);
 assert.match(styles,/\.app-shell \.sidebar \.side-nav span,\.app-shell \.sidebar \.side-label,\.app-shell \.sidebar \.account-copy\{display:revert\}/);
 assert.match(styles,/\.app-shell \.sidebar\.collapsed\{display:flex;width:72px;flex:0 0 72px/);
 assert.match(styles,/\.app-shell \.sidebar\.collapsed \.brand-name,\.app-shell \.sidebar\.collapsed \.side-nav span,\.app-shell \.sidebar\.collapsed \.side-label,\.app-shell \.sidebar\.collapsed \.account-copy\{display:none\}/);
 assert.doesNotMatch(styles,/\.app-shell \.sidebar\{display:none\}/);
});
