import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const extension=new URL('../../public/ronda-review-extension/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',extension),'utf8'));
const popup=await readFile(new URL('popup.js',extension),'utf8');
const bridge=await readFile(new URL('bridge.js',extension),'utf8');

test('review extension requests optional host access per HTTPS domain, never blanket access at install',()=>{
  assert.deepEqual(manifest.permissions,['activeTab','scripting']);
  assert.deepEqual(manifest.optional_host_permissions,['https://*/*']);
  assert.equal('host_permissions' in manifest,false);
  assert.match(popup,/chrome\.permissions\.request\(permission\)/);
  assert.match(popup,/matches:\[`\$\{origin\}\/\*`\]/);
});

test('extension bridge waits for Ronda nonce handshake before publishing scroll or selected content',()=>{
  assert.match(bridge,/event\.origin!==RONDA_ORIGIN/);
  assert.match(bridge,/event\.data\?\.type!=='ronda:web-review:init'/);
  assert.match(bridge,/event\.data\.nonce/);
  assert.match(bridge,/textQuote|quote/);
  assert.match(bridge,/documentHeight/);
});
