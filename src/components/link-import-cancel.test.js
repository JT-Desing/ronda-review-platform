import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('cancel discards the URL, detected link, name and prior error',()=>{
 const source=readFileSync(new URL('./LinkImport.jsx',import.meta.url),'utf8');
 assert.match(source,/function cancel\(\)\{setOpen\(false\);setUrl\(''\);setName\(''\);setLink\(null\);setError\(''\);\}/);
 assert.match(source,/<button type="button" disabled=\{busy\} onClick=\{cancel\}>Cancelar<\/button>/);
});
