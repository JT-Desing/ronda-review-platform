import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const component=await readFile(new URL('./ExternalWeb.jsx',import.meta.url),'utf8');
const stage=await readFile(new URL('./OriginalMediaStage.jsx',import.meta.url),'utf8');
const css=await readFile(new URL('./external-artifacts.css',import.meta.url),'utf8');

test('external web review wires the shared annotation layer to the saved comment marks',()=>{
  assert.match(stage,/annotationVisibleAt\(mark,currentTime,\['image','web'\]\.includes\(media\?\.type\)\)/);
  assert.match(stage,/<ExternalWeb[^>]+marks=\{visibleMarks\}[^>]+setMarks=/);
  assert.match(component,/<AnnotationLayer activeTool=\{readonly\?'':activeTool\}[^>]+marks=\{marks\}[^>]+setMarks=\{setMarks\}/);
  assert.match(component,/setActiveTool\(tool\)/);
});

test('web annotation coordinates use one fixed review sheet independent of the responsive viewport',()=>{
  assert.match(component,/external-web-sheet/);
  assert.match(css,/width:1000px;height:3000px/);
  assert.match(css,/\.external-web-sheet iframe\{[^}]*width:1000px;height:3000px[^}]*pointer-events:none/);
  assert.match(css,/\.external-web-sheet \.annotation-layer\{position:absolute;inset:0;width:100%;height:100%/);
});
