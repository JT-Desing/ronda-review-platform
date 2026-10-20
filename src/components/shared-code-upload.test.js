import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(path,import.meta.url),'utf8');

test('team upload chooser includes website source, React, PDF, office and ZIP files',async()=>{
  const media=await read('./SharedProjectMedia.jsx');
  for(const extension of ['.html','.jsx','.tsx','.pdf','.docx','.pptx','.zip'])assert.ok(media.includes(extension),`${extension} is selectable`);
  assert.match(media,/type="file" hidden accept=/);
});

test('uploaded HTML and code are clearly inert while live websites remain link-based',async()=>{
  const grid=await read('./SharedDeliveryGrid.jsx');
  const room=await read('./SharedReviewRoom.jsx');
  const stage=await read('./OriginalMediaStage.jsx');
  const server=await read('../../backend/modules/shared-review.js');
  assert.match(grid,/no se ejecutan dentro de Ronda/);
  assert.match(room,/kind==='file'.*kind:'file'/);
  assert.match(stage,/media\?\.type==='file'.*Descargar archivo local/);
  assert.match(server,/file\.kind==='file'/);
  assert.match(server,/attachment\?'attachment':'inline'/);
});
