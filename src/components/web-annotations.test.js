import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const component=await readFile(new URL('./ExternalWeb.jsx',import.meta.url),'utf8');
const stage=await readFile(new URL('./OriginalMediaStage.jsx',import.meta.url),'utf8');
const css=await readFile(new URL('./external-artifacts.css',import.meta.url),'utf8');
const delivery=await readFile(new URL('./SharedProjectMedia.jsx',import.meta.url),'utf8');

test('external web review wires the shared annotation layer to the saved comment marks',()=>{
  assert.match(stage,/annotationVisibleAt\(mark,currentTime,\['image','web'\]\.includes\(media\?\.type\)\)/);
  assert.match(stage,/<ExternalWeb[^>]+marks=\{visibleMarks\}[^>]+setMarks=/);
  assert.match(component,/<AnnotationLayer activeTool=\{readonly\?'':activeTool\}[^>]+marks=\{marks\}[^>]+setMarks=\{setMarks\}/);
  assert.match(component,/setActiveTool\(tool\)/);
});

test('web annotation overlay tracks the actual responsive iframe viewport',()=>{
  assert.match(component,/external-web-viewport/);
  assert.match(component,/pointerEvents:activeTool\?'none':'auto'/);
  assert.match(css,/\.external-web-viewport iframe\{position:absolute;inset:0;display:block;width:100%;height:100%/);
  assert.match(css,/\.external-web-viewport \.annotation-layer\{position:absolute;inset:0;width:100%;height:100%/);
  assert.doesNotMatch(css,/\.external-web-sheet|\.external-web-scroll/);
});

test('fullscreen expands the whole web review and gives the iframe remaining viewport height',()=>{
  assert.match(component,/holder\.current\?\.requestFullscreen/);
  assert.match(css,/\.external-web:fullscreen\{position:fixed;inset:0/);
  assert.match(css,/\.external-web:fullscreen \.external-web-viewport\{height:auto;min-height:0;flex:1 1 auto\}/);
});

test('blocked external pages can be captured only with browser permission and saved as project image assets',()=>{
  assert.match(component,/getDisplayMedia\(\{video:\{displaySurface:'browser'\},audio:false\}\)/);
  assert.match(component,/ronda:web-capture/);
  assert.match(component,/new File\(\[blob\].*type:'image\/png'/);
  assert.match(delivery,/addWebCapture=async file=>\{if\(!file\)return;await mutate\(async\(\)=>\{const result=await uploadFile\(context,file/);
  assert.match(delivery,/addWebCapture\(event\.detail\?\.file\)/);
  assert.match(component,/Algunos sitios impiden la vista integrada/);
});
