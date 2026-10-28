import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('campaign selector relies on visible native button text and keeps selected state',()=>{
 const source=readFileSync(new URL('./Pauta.jsx',import.meta.url),'utf8');
 const styles=readFileSync(new URL('./pauta-accessibility.css',import.meta.url),'utf8');
 assert.doesNotMatch(source,/aria-label=\{`Campaña \$\{c\.name\}/,'visible native button text is not overridden by an aria-label');
 assert.doesNotMatch(source,/aria-labelledby=\{`pauta-campaign-name-/,'visible native button text is not overridden by aria-labelledby');
 assert.match(source,/>\{c\.name\}<small>\{c\.pieces\.length\} piezas<\/small><\/button>/);
 assert.match(styles,/\.pauta-explorer button\[aria-current="true"\]/);
});

test('failed local persistence preserves campaign, linked-piece and comment drafts',()=>{
 const source=readFileSync(new URL('./Pauta.jsx',import.meta.url),'utf8');
 assert.match(source,/if\(save\(\{groups:\[\.\.\.new Set/,'campaign selection and form reset happen only after save succeeds');
 assert.match(source,/if\(save\(\{\.\.\.data,campaigns:data\.campaigns\.map\(c=>c\.id!==selected\?c:\{\.\.\.c,pieces:/,'linked piece becomes selected only after its campaign save succeeds');
 assert.match(source,/if\(update\(p=>\(\{\.\.\.p,status:request\?'changes':p\.status,comments:/,'comment draft clears only after its update persists');
});

test('mobile ad-group form stays in layout instead of covering upload and map controls',()=>{
 const styles=readFileSync(new URL('./pauta-responsive-fix.css',import.meta.url),'utf8');
 assert.match(styles,/@media\s*\(max-width:\s*780px\)[\s\S]*details\[open\]\s*>\s*form\s*\{[^}]*position:\s*static/);
 assert.match(styles,/details\[open\]\s*>\s*form\s*\{[^}]*width:\s*100%/);
});
