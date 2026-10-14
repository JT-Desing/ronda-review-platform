import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('one branded loader is reused for session, projects, review and documents',()=>{
 for(const name of ['AccountAccess','SharedProjects','ReviewLoading','WorkspaceTeam','PdfReview','DocumentReview','SocialPreview'])assert.match(readFileSync(new URL(`./${name}.jsx`,import.meta.url),'utf8'),/BrandLoader/);
 const css=readFileSync(new URL('./brand-loader.css',import.meta.url),'utf8');
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/ronda-loader-breathe/);
 assert.match(readFileSync(new URL('../../index.html',import.meta.url),'utf8'),/brand-boot/);
});
