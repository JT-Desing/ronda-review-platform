import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('shared review reconnects the original trail, shortcuts and draft-only undo',()=>{
 const source=readFileSync(new URL('./SharedReviewRoom.jsx',import.meta.url),'utf8');
 assert.match(source,/<DrawingTrail enabled=/);
 assert.match(source,/<ShortcutHelp onClose=/);
 assert.match(source,/draftOnlyUndo/);
});
test('both review routes use one image and annotation viewport',()=>{
 const source=readFileSync(new URL('./OriginalMediaStage.jsx',import.meta.url),'utf8');
 assert.match(source,/className="media-section original-media-stage"/);
 assert.match(source,/className=\{`media-viewport \$\{media\?\.type==='image'/);
 assert.match(source,/findLastIndex\(m=>m.draft\)/);
 assert.match(source,/backgroundColor:c/);
 assert.match(source,/const fitZoom=viewportSize\.width&&viewportSize\.height\?Math\.min\(1,viewportSize\.height\*imageRatio\/viewportSize\.width\):1/);
 assert.match(source,/aspectRatio:imageRatio/);
 assert.match(source,/Ajustar a pantalla/);
 assert.match(source,/Ajustar al ancho/);
});
test('image review fits the complete image into a shorter responsive canvas by default',()=>{
 const css=readFileSync(new URL('./original-media-stage.css',import.meta.url),'utf8');
 assert.match(css,/data-media-type=image\] \.media-viewport\{height:clamp\(260px,44dvh,560px\)/);
 assert.match(css,/data-media-type=image\] \.media-viewport\{height:clamp\(240px,42dvh,460px\)/);
 assert.match(css,/\.media-viewport\.is-fit\{display:flex;align-items:flex-start\}/);
});
