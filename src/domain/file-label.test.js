import test from 'node:test';
import assert from 'node:assert/strict';
import { fileLabel } from './file-label.js';
test('etiqueta formato real sin llamar MP4 a documentos o audio',()=>{
  for(const [name,label] of [['pagina.html','HTML'],['informe.pdf','PDF'],['voz.mp3','MP3'],['entrega.pptx','PPTX'],['texto.docx','DOCX'],['foto.png','PNG']])assert.equal(fileLabel({name}),label);
});
test('datos incompletos no inventan formato',()=>{assert.equal(fileLabel(null),'DEMO');assert.equal(fileLabel({type:'audio'}),'AUDIO');assert.equal(fileLabel({}),'ARCHIVO')});
