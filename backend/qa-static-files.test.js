import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve,sep} from 'node:path';
import {readQaStaticFile} from './qa-static-files.js';

const dist=resolve('qa','dist');
const read=async path=>{
  if(path.endsWith(`${sep}index.html`))return Buffer.from('<!doctype html><main>app</main>');
  if(path.endsWith(`${sep}assets${sep}current.js`))return Buffer.from('export default true');
  const error=new Error('missing');error.code='ENOENT';throw error;
};

test('missing JavaScript assets return 404 instead of the SPA document',async()=>{
  const result=await readQaStaticFile('/assets/stale.js',dist,{read,mime:{'.js':'text/javascript'}});
  assert.equal(result.status,404);
  assert.equal(result.bytes,undefined);
});

test('existing assets are served with their actual content type',async()=>{
  const result=await readQaStaticFile('/assets/current.js',dist,{read,mime:{'.js':'text/javascript'}});
  assert.equal(result.status,200);
  assert.equal(result.contentType,'text/javascript');
  assert.equal(result.bytes.toString(),'export default true');
});

test('extensionless client routes still receive the SPA entry point',async()=>{
  const result=await readQaStaticFile('/team/project-id',dist,{read,mime:{'.html':'text/html'}});
  assert.equal(result.status,200);
  assert.equal(result.contentType,'text/html');
  assert.match(result.bytes.toString(),/<!doctype html>/i);
});
