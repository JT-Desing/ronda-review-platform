import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('external live pages keep scripts sandboxed away from the Ronda origin',()=>{
 const source=readFileSync(new URL('./ExternalWeb.jsx',import.meta.url),'utf8');
 const iframe=source.slice(source.indexOf('<iframe'),source.indexOf('/>'));
 assert.match(iframe,/sandbox="allow-scripts"/);
 assert.doesNotMatch(iframe,/allow-same-origin/);
 assert.match(iframe,/referrerPolicy="no-referrer"/);
 assert.match(source,/rel="noopener noreferrer"/);
 assert.match(source,/external-web-frame-notice" role="note"/);
 assert.match(source,/Algunos sitios bloquean su vista dentro de Ronda/);
 assert.match(source,/abre «Abrir original» en otra pestaña/);
});
