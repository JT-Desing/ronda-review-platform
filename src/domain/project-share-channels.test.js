import test from 'node:test';
import assert from 'node:assert/strict';
import {projectShareChannels} from './project-share-channels.js';
test('email and WhatsApp prepare the same project URL without sending or granting access',()=>{
 const url='https://ronda.example/#team/a/b',channels=projectShareChannels(url);
 assert.equal(new URL(channels.email).protocol,'mailto:');
 assert.equal(new URL(channels.whatsapp).hostname,'wa.me');
 assert.ok(new URL(channels.whatsapp).searchParams.get('text').includes(url));
 assert.ok(new URL(channels.email).searchParams.get('body').includes(url));
 assert.throws(()=>projectShareChannels('javascript:alert(1)'));
});
