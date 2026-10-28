import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('empty personal projects open their own upload grid without demo annotations',()=>{
 const source=readFileSync(new URL('../main.jsx',import.meta.url),'utf8');
 assert.match(source,/setPersonalProjectId\(project.id\)/);
 assert.match(source,/currentView==='review'&&!media&&!demo/);
 assert.match(source,/DeliveryGrid projectId=\{personalProjectId\}/);
 assert.match(source,/currentView==='review'&&\(media\|\|demo\)/);
 assert.doesNotMatch(source,/if\(project.id==='project-amara'\)/);
 const library=readFileSync(new URL('./StudioWorkspace.jsx',import.meta.url),'utf8');
 assert.match(library,/Abrir parrilla de piezas/);
 assert.match(library,/onOpen\(selectedDetail\)/);
 assert.match(library,/const selectedDetail = detail \? all\.find\(project => project\.id === detail\.id\) : null/);
 assert.match(library,/projectDetailMessage\(selectedDetail\)/);
});
