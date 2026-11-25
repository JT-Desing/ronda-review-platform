import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {toFirefoxManifest, FIREFOX_ID} from '../../scripts/extension-manifest.mjs';

const read = path => readFile(new URL(`../../extension/${path}`, import.meta.url), 'utf8');
const chrome = JSON.parse(await read('manifest.json'));
const firefox = toFirefoxManifest(chrome);
const worker = await read('service-worker.js');
const popup = await read('popup/popup.js');

test('firefox manifest runs the worker as a background script with a fixed gecko id', () => {
  assert.deepEqual(firefox.background, {scripts: ['service-worker.js'], type: 'module'});
  assert.equal(firefox.browser_specific_settings.gecko.id, FIREFOX_ID);
  assert.equal(firefox.browser_specific_settings.gecko.strict_min_version, '128.0');
  assert.equal('minimum_chrome_version' in firefox, false);
});

test('firefox manifest swaps the chrome-only auth permission for blocking webRequest', () => {
  assert.equal(firefox.permissions.includes('webRequestAuthProvider'), false);
  assert.ok(firefox.permissions.includes('webRequestBlocking'));
  assert.deepEqual(firefox.optional_host_permissions, chrome.optional_host_permissions);
  assert.deepEqual(firefox.host_permissions, chrome.host_permissions);
});

test('firefox manifest declares the data sent to Ronda: selected text and scroll', () => {
  assert.deepEqual(firefox.browser_specific_settings.gecko.data_collection_permissions, {required: ['websiteContent', 'websiteActivity']});
});

test('the chrome manifest is not modified by the conversion', () => {
  assert.ok(chrome.permissions.includes('webRequestAuthProvider'));
  assert.equal(chrome.background.service_worker, 'service-worker.js');
});

test('auth listener uses blocking on firefox and asyncBlocking on chrome', () => {
  assert.match(worker, /IS_FIREFOX\s*\?\s*\['blocking'\]\s*:\s*\['asyncBlocking'\]/);
});

test('connection survives the popup closing during the permission prompt', () => {
  assert.match(worker, /permissions\.onAdded\.addListener/);
  assert.match(worker, /ronda:pending-connect/);
  assert.match(popup, /ronda:pending-connect/);
});

test('popup asks for the permission before any other await, so firefox keeps the user gesture', () => {
  const handler = popup.slice(popup.indexOf("button.addEventListener('click'"));
  const firstAwait = handler.indexOf('await ');
  assert.ok(firstAwait > 0);
  assert.match(handler.slice(firstAwait, firstAwait + 60), /^await chrome\.permissions\.request/);
});

test('registered bridges are restored on startup for browsers without persistent scripts', () => {
  assert.match(worker, /runtime\.onStartup\.addListener/);
});
