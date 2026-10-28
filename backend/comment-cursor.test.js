import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validCommentCursorTime} from './comment-cursor.js';
test('cursor retains PostgreSQL microsecond timestamps and rejects calendar rollover',()=>{
 for(const value of ['2026-01-01 12:00:00.123456+00','2026-01-01T12:00:00Z','2024-02-29T23:59:59.999999Z'])assert.equal(validCommentCursorTime(value),true,value);
 for(const value of ['2026-02-30T00:00:00Z','2026-02-29T00:00:00Z','2026-04-31T00:00:00Z','2026-01-01T24:00:00Z','2026-01-01T00:00:00+23:00','0000-01-01T00:00:00Z','2026-01-01',null,123])assert.equal(validCommentCursorTime(value),false,String(value));
});
