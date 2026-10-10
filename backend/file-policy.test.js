import test from 'node:test';
import assert from 'node:assert/strict';
import { servedFileType, decodeFileName } from './file-policy.js';

test('media and PDF types keep their declared type', () => {
  for (const type of ['image/png', 'image/svg+xml', 'video/mp4', 'audio/mpeg', 'application/pdf', 'text/plain'])
    assert.equal(servedFileType(type), type);
});

test('types a browser could execute are served as opaque bytes', () => {
  for (const type of ['text/html', 'TEXT/HTML', 'application/xhtml+xml', 'text/xml', 'application/javascript', 'multipart/x-mixed-replace', '', undefined, null])
    assert.equal(servedFileType(type), 'application/octet-stream');
});

test('parameters and casing are normalized before the check', () => {
  assert.equal(servedFileType('Application/PDF; charset=binary'), 'application/pdf');
  assert.equal(servedFileType('text/html; x=image/png'), 'application/octet-stream');
});

test('malformed encoded names fall back instead of failing the upload', () => {
  assert.equal(decodeFileName('informe%20final.pdf'), 'informe final.pdf');
  assert.equal(decodeFileName('%E0%A4%A'), 'archivo');
  assert.equal(decodeFileName(undefined), 'archivo');
  assert.equal(decodeFileName('a'.repeat(300)).length, 255);
});
