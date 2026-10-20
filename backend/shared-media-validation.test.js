import assert from 'node:assert/strict';
import {test} from 'node:test';
import {uploadInput,mediaSignature} from './shared-media-service.js';

const base={projectId:'00000000-0000-4000-8000-000000000001',name:'qa.png',mime:'image/png',size:1,requestId:'00000000-0000-4000-8000-000000000002'};

test('upload input distinguishes unsupported/invalid files from the 100 MB limit',()=>{
  assert.equal(uploadInput({...base,size:100*1024*1024}).size,100*1024*1024);
  assert.throws(()=>uploadInput({...base,size:100*1024*1024+1}),error=>error.status===413&&/máximo 100 MB/.test(error.message));
  assert.throws(()=>uploadInput({...base,mime:'application/x-executable'}),error=>error.status===400&&/tipo no compatible/.test(error.message));
  assert.throws(()=>uploadInput({...base,size:0}),error=>error.status===400&&/Archivo inválido/.test(error.message));
});

test('shared projects accept PDF, HTML, React source and ZIP bundles as inert downloadable files',()=>{
  for(const [name,mime,kind] of [['brief.pdf','application/pdf','pdf'],['page.html','text/html','html'],['Card.jsx','text/plain','file'],['app.tsx','text/plain','file'],['react-source.zip','application/zip','file'],['design.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document','file']]){
    assert.equal(uploadInput({...base,name,mime}).kind,kind,`${name} is accepted`);
  }
  assert.throws(()=>uploadInput({...base,name:'app.exe',mime:'application/octet-stream'}),error=>error.status===400);
  assert.equal(mediaSignature(Buffer.from('<html><h1>review</h1></html>'),'text/html'),true);
  assert.equal(mediaSignature(Buffer.from([0,255,0]),'text/html'),false);
  assert.equal(mediaSignature(Buffer.from('<script>run()</script>'),'text/html'),true,'HTML is stored safely as a file; it is never executed by the media service');
  assert.equal(mediaSignature(Buffer.from('PK\x03\x04archive'),'application/zip'),true);
  assert.equal(mediaSignature(Buffer.from('%PDF-1.7'),'application/pdf'),true);
});
