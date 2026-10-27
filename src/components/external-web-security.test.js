import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('external live pages keep scripts sandboxed away from the Ronda origin',()=>{
 const source=readFileSync(new URL('./ExternalWeb.jsx',import.meta.url),'utf8');
 const iframe=source.match(/<iframe[\s\S]*?\/>/)?.[0]||'';
 assert.match(iframe,/sandbox="allow-scripts"/);
 assert.doesNotMatch(iframe,/allow-same-origin/);
 assert.match(iframe,/referrerPolicy="no-referrer"/);
 assert.match(source,/Abrir original ↗/);
 assert.match(source,/external-web-frame-notice[\s\S]*?role="note"/);
 assert.match(source,/external-web-viewport/);
 assert.match(source,/pointerEvents:activeTool&&hasDocumentBridge&&!textSelectionMode\?'none':'auto'/);
 assert.match(source,/getDisplayMedia\(/);
 assert.match(source,/ronda:web-capture/);
 assert.match(source,/Capturar vista para anotar/);
});

test('external link empty state is branded, clear and responsive without offering capture before the page loads',()=>{
 const source=readFileSync(new URL('./ExternalWeb.jsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('./external-artifacts.css',import.meta.url),'utf8');
 assert.match(source,/external-web-header-meta/);
 assert.match(source,/external-web-consent-card/);
 assert.match(source,/Prepara esta página para revisarla/);
 assert.match(source,/Cargar en el visor/);
 assert.match(source,/const webHost=new URL\(safe\)\.hostname/);
 assert.match(source,/Al cargarla, podrás capturar la vista/);
 assert.match(css,/\.external-web-consent-card\{[^}]*animation:external-web-consent-enter/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
