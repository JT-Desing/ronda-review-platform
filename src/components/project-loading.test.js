import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('initial projects load does not retrigger when the resolved workspace arrives',()=>{
 const source=readFileSync(new URL('./SharedProjects.jsx',import.meta.url),'utf8');
 assert.match(source,/\[requestedSpace, selected, refresh\]/);
 assert.doesNotMatch(source,/\[space, selected, refresh\]/);
 assert.match(source,/if\(loading&&!space&&!error\)return/);
 assert.match(source,/data-mode=\{selected\?'project':'gallery'\}/);
});
