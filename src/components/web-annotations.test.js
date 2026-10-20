import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const component=await readFile(new URL('./ExternalWeb.jsx',import.meta.url),'utf8');
const stage=await readFile(new URL('./OriginalMediaStage.jsx',import.meta.url),'utf8');
const css=await readFile(new URL('./external-artifacts.css',import.meta.url),'utf8');
const pinCss=await readFile(new URL('./external-web-pin.css',import.meta.url),'utf8');
const delivery=await readFile(new URL('./SharedProjectMedia.jsx',import.meta.url),'utf8');
const layer=await readFile(new URL('./AnnotationLayer.jsx',import.meta.url),'utf8');
const shared=await readFile(new URL('./SharedReviewRoom.jsx',import.meta.url),'utf8');
const app=await readFile(new URL('../main.jsx',import.meta.url),'utf8');

test('external web review wires the shared annotation layer to the saved comment marks',()=>{
  assert.match(stage,/annotationVisibleAt\(mark,currentTime,\['image','web'\]\.includes\(media\?\.type\)\)/);
  assert.match(stage,/<ExternalWeb[^>]+marks=\{visibleMarks\}[^>]+setMarks=/);
  assert.match(component,/<AnnotationLayer activeTool=\{readonly\?'':activeTool\}[^>]+marks=\{viewportMarks\}[^>]+setMarks=\{saveViewportMarks\}/);
  assert.match(component,/setActiveTool\(tool\)/);
  assert.doesNotMatch(component,/disabled=\{readonly\|\|!webMetrics\}/);
});

test('web annotation overlay tracks the actual responsive iframe viewport',()=>{
  assert.match(component,/external-web-viewport/);
  assert.match(component,/pointerEvents:activeTool&&!textSelectionMode\?'none':'auto'/);
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
  assert.match(component,/La página se muestra directamente/);
});

test('creating or selecting a web annotation opens an anchored comment composer',()=>{
  assert.match(layer,/onAnnotationCreated\(saved\)/);
  assert.match(component,/onAnnotationCreated=\{mark=>openComment\(viewportMarkToDocument\(mark,webMetrics\)\)\}/);
  assert.match(component,/external-web-comment-popover/);
  assert.match(component,/onQuickComment\(commentMark,commentDraft\.trim\(\)\)/);
  assert.match(css,/\.external-web-comment-popover\{position:absolute;z-index:8/);
  assert.match(shared,/async function quickWebComment\(mark,text\)/);
  assert.match(shared,/annotation:sharedAnnotation\(mark\)/);
  assert.match(app,/const addWebComment=async\(mark,text\)/);
  assert.match(app,/annotationId:mark\.id,annotationContext/);
});

test('document bridge follows iframe scroll without relaxing the iframe sandbox',()=>{
  assert.match(component,/sandbox="allow-scripts"/);
  assert.doesNotMatch(component,/allow-same-origin/);
  assert.match(component,/event\.source!==iframe\.current\?\.contentWindow\|\|event\.origin!==\x27null\x27/);
  assert.match(component,/event\.data\?\.nonce!==bridgeNonce\.current/);
  assert.match(component,/documentMarkToViewport\(mark,webMetrics\)/);
  assert.match(component,/viewportMarkToDocument\(mark,webMetrics\)/);
});

test('text selection mode hands pointer input to the reviewed page and saves the selection anchor',()=>{
  assert.match(component,/text-selection-mode/);
  assert.match(component,/Seleccionar texto/);
  assert.match(component,/selectionToDocumentMark\(event\.data,metrics,activeColor\)/);
  assert.match(component,/setMarks\(\[\.\.\.viewportMarks,documentMarkToViewport\(mark,metrics\)\]\)/);
  assert.match(component,/selectionRects/);
  assert.match(css,/figure-selection-highlight/);
});

test('web annotation pin number is centered in a square fixed-size hit area',()=>{
  assert.match(pinCss,/\.external-web \.external-web-viewport \.figure-pin\s*\{[^}]*display:\s*grid;[^}]*place-items:\s*center;[^}]*box-sizing:\s*border-box;[^}]*width:\s*36px;[^}]*height:\s*36px;[^}]*padding:\s*0;[^}]*line-height:\s*1;/);
});
