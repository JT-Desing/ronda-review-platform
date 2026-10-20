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
  const server=await read('../../backend/modules/shared-review.js');
  assert.match(grid,/no se ejecutan dentro de Ronda/);
  assert.match(room,/data\.asset\.kind==='html'.*kind:'html'/);
  assert.match(room,/kind==='file'.*kind:'file'/);
  assert.match(stage,/media\?\.type==='file'.*Descargar archivo local/);
  assert.match(documentReview,/sandbox="" srcDoc=\{html\}/);
  assert.match(server,/\['file','html'\]\.includes\(file\.kind\)/);
  assert.match(server,/Content-Security-Policy.*sandbox/);
  assert.match(server,/attachment\?'attachment':'inline'/);
});
