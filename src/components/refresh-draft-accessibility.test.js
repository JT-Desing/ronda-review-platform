import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('disabled review refresh explains that the current draft must be published or discarded',()=>{
  const source=readFileSync(new URL('./SharedReviewRoom.jsx',import.meta.url),'utf8');
  const styles=readFileSync(new URL('./shared-review-room.css',import.meta.url),'utf8');
  assert.match(source,/aria-describedby=\{hasDraft\(\)\?'review-refresh-draft-hint':undefined\}/);
  assert.match(source,/title=\{hasDraft\(\)\?'Publica o descarta tu borrador antes de actualizar los datos de revisión\.'\:undefined\}/);
  assert.match(source,/<p id="review-refresh-draft-hint" className="review-refresh-hint" role="status">Publica o descarta tu borrador antes de actualizar los datos de revisión\.<\/p>/);
  assert.match(styles,/\.shared-review-room>\.review-refresh-hint\{[^}]*padding:[^}]*font-size:12px/);
  assert.match(styles,/@media\(max-width:780px\)\{\.shared-review-room>\.review-refresh-hint\{padding:8px 12px\}\}/);
});
