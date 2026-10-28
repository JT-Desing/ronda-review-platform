import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('team error feedback shows retry only for transient failures', () => {
  const source=readFileSync(new URL('./WorkspaceTeam.jsx',import.meta.url),'utf8');
  assert.match(source,/teamErrorCanRetry\(reason\)/);
  assert.match(source,/\{retryableError&&<button disabled=\{busy\} onClick=\{\(\) => setRevision\(value => value \+ 1\)\}>Volver a cargar<\/button>\}/);
});
