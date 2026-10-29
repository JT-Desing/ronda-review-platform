import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../../extension/',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');

test('Ronda browser extension requests only optional site access after an explicit click',async()=>{
  const manifest=JSON.parse(await read('manifest.json'));
  const popup=await read('popup/popup.js');
  const worker=await read('service-worker.js');
  assert.equal(manifest.manifest_version,3);
  assert.deepEqual(manifest.host_permissions,['https://ronda.repolite.link/*']);
  assert.deepEqual(manifest.optional_host_permissions,['https://*/*']);
  assert.match(popup,/button\.addEventListener\('click'/);
  assert.match(popup,/chrome\.permissions\.request\(\{ origins: \[pattern\] \}\)/);
  assert.match(worker,/chrome\.permissions\.contains\(\{ origins: \[originPattern\] \}\)/);
  assert.match(worker,/allFrames: true/);
  assert.match(worker,/content\/live-page-bridge\.js/);
  assert.doesNotMatch(worker,/activeTab|<all_urls>/);
});

test('extension keeps the live review iframe sandboxed and coordinates with its nonce bridge',async()=>{
  const pageBridge=await read('content/live-page-bridge.js');
  const appBridge=await read('content/ronda-app-bridge.js');
  const app=await readFile(new URL('./ExternalWeb.jsx',import.meta.url),'utf8');
  assert.match(pageBridge,/event\.origin !== RONDA_ORIGIN/);
  assert.doesNotMatch(pageBridge,/event\.origin !== 'null'/);
  assert.match(pageBridge,/ronda:web-review:init/);
  assert.match(pageBridge,/selectionchange/);
  assert.match(pageBridge,/addEventListener\('scroll'/);
  assert.match(appBridge,/ronda:web-review:open-connection/);
  assert.match(app,/sandbox="allow-scripts"/);
  assert.doesNotMatch(app,/allow-same-origin/);
});

test('Ronda shows a Chrome Web Store install link only after a store URL is configured',async()=>{
  const app=await readFile(new URL('./ExternalWeb.jsx',import.meta.url),'utf8');
  assert.match(app,/VITE_RONDA_EXTENSION_STORE_URL/);
  assert.match(app,/Extensión en preparación para Chrome Web Store/);
  assert.match(app,/Conectar este sitio/);
  assert.match(app,/Es opcional para el resto de Ronda/);
});
