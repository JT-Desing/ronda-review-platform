import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('icon-only mobile share and refresh keep accessible names when captions are hidden',()=>{
 const share=readFileSync(new URL('./ShareProjectButton.jsx',import.meta.url),'utf8');
 const review=readFileSync(new URL('./SharedReviewRoom.jsx',import.meta.url),'utf8');
 assert.match(share,/<button[^>]*aria-label="Compartir"[^>]*className="secondary share-project-trigger"/);
 assert.match(review,/<button[^>]*aria-label="Actualizar"[^>]*className="secondary"/);
});
