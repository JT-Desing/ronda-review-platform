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
 assert.match(source,/className="media-viewport"/);
 assert.match(source,/findLastIndex\(m=>m.draft\)/);
 assert.match(source,/backgroundColor:c/);
 assert.match(source,/Ajustar al ancho/);
});
