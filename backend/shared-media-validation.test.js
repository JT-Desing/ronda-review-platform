import assert from 'node:assert/strict';
import {test} from 'node:test';
import {uploadInput} from './shared-media-service.js';

const base={projectId:'00000000-0000-4000-8000-000000000001',name:'qa.png',mime:'image/png',size:1,requestId:'00000000-0000-4000-8000-000000000002'};

test('upload input distinguishes unsupported/invalid files from the 100 MB limit',()=>{
  assert.equal(uploadInput({...base,size:100*1024*1024}).size,100*1024*1024);
  assert.throws(()=>uploadInput({...base,size:100*1024*1024+1}),error=>error.status===413&&/máximo 100 MB/.test(error.message));
  assert.throws(()=>uploadInput({...base,mime:'application/x-executable'}),error=>error.status===400&&/tipo no compatible/.test(error.message));
  assert.throws(()=>uploadInput({...base,size:0}),error=>error.status===400&&/Archivo inválido/.test(error.message));
});
