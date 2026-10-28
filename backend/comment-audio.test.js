import {test} from 'node:test';
import assert from 'node:assert/strict';
import {commentAudio} from './comment-audio.js';
const mp3={name:'nota.mp3',dataUrl:'data:audio/mpeg;base64,'+Buffer.from('ID3 test audio').toString('base64')};
test('audio validation bounds payload and disallows executable or remote content',()=>{
 assert.equal(commentAudio([mp3])[0].mime,'audio/mpeg');
 assert.throws(()=>commentAudio([{...mp3,dataUrl:'https://other.invalid/audio.mp3'}]),{status:400});
 assert.throws(()=>commentAudio([{...mp3,dataUrl:'data:audio/mpeg;base64,'+Buffer.from('<html>not audio').toString('base64')}]),{status:400});
 assert.throws(()=>commentAudio([mp3,mp3,mp3,mp3]),{status:400});
});
