import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL(`./${name}`,import.meta.url),'utf8');

test('delivery add actions pair decorative icons with readable labels',()=>{
 const grid=read('SharedDeliveryGrid.jsx'),link=read('LinkImport.jsx'),icon=read('Icon.jsx'),css=read('delivery-grid-polish.css');
 assert.match(grid,/<Icon name="upload" size=\{16\}\/?>\s*<span>Agregar archivos<\/span>/);
 assert.match(link,/<Icon name="link" size=\{16\}\/?>\s*<span>Agregar enlace<\/span>/);
 assert.match(icon,/upload:\s*Upload/);
 assert.match(css,/delivery-add-actions[^\n]*gap:8px/);
});
