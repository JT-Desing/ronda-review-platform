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
