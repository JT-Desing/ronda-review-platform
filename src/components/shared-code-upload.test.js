import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(path,import.meta.url),'utf8');

test('team upload chooser includes website source, React, PDF, office and ZIP files',async()=>{
  const media=await read('./SharedProjectMedia.jsx');
  for(const extension of ['.html','.jsx','.tsx','.pdf','.docx','.pptx','.zip'])assert.ok(media.includes(extension),`${extension} is selectable`);
  assert.match(media,/type="file" hidden accept=/);
});

test('uploaded HTML has a sandboxed review surface while code remains inert and downloadable',async()=>{
  const grid=await read('./SharedDeliveryGrid.jsx');
  const room=await read('./SharedReviewRoom.jsx');
  const stage=await read('./OriginalMediaStage.jsx');
  const documentReview=await read('./DocumentReview.jsx');
  const preview=await read('./SharedAssetPreview.jsx');
  const server=await read('../../backend/modules/shared-review.js');
  assert.match(grid,/HTML se revisa aislado y el código React\/ZIP queda como fuente descargable/);
  assert.match(room,/data\.asset\.kind==='html'.*kind:'html'/);
  assert.match(room,/kind==='file'.*kind:'file'/);
  assert.match(stage,/media\?\.type==='file'.*Descargar archivo local/);
  assert.match(documentReview,/sandbox="allow-same-origin" srcDoc=\{html\}/);
  assert.match(documentReview,/document-sheet html-sheet[\s\S]*\{renderAnnotations\?\.\(drawing\)\}\{renderToolbar\?\.\(drawing\)\}/);
  assert.doesNotMatch(documentReview.match(/<header>(.*?)<\/header>/s)?.[1]||'',/renderToolbar/);
  assert.match(documentReview,/default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; form-action 'none'; base-uri 'none'/);
  assert.match(documentReview,/contentDocument/);
  assert.match(documentReview,/height:htmlHeight/);
  assert.match(documentReview,/onHtmlHeightChange\?\.\(measured\)/);
  assert.match(room,/html-annotation-tools/);
  assert.match(room,/\['pen','arrow','square','type'\]/);
  for(const tool of ['undo','redo'])assert.match(room,new RegExp(`name="${tool}"`));
  assert.match(room,/coordinateSpace:'document'/);
  assert.match(grid,/asset\.kind==='html'\?'HTML'/);
  assert.match(preview,/HTML anotable/);
  assert.match(server,/\['file','html'\]\.includes\(file\.kind\)/);
  assert.match(server,/Content-Security-Policy.*sandbox/);
  assert.match(server,/attachment\?'attachment':'inline'/);
});

test('uploading a new team asset preserves the selected unsaved review instead of silently rejecting the file',async()=>{
  const media=await read('./SharedProjectMedia.jsx');
  assert.match(media,/allowDirty=false,preserveSelection=false,preserveDirtyState=false/);
  assert.match(media,/allowDirty:keepReview,preserveSelection:keepReview,preserveDirtyState:keepReview/);
  assert.match(media,/if\(!keepReview\)setSelected\(result\.asset\.id\)/);
});
