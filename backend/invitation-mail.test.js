import test from 'node:test';
import assert from 'node:assert/strict';
import {sendInvitationMail} from './invitation-mail.js';
const result={invitation:{email:'invitee@example.invalid',expires_at:'2026-10-21T00:00:00Z'},token:'private-code'};
const origin='https://ronda.repolite.link';
test('invitation email uses stored recipient, code and public origin',async()=>{
  let message;
  const mailer={enabled:true,send:async value=>{message=value;return {accepted:[result.invitation.email]};}};
  assert.deepEqual(await sendInvitationMail({mailer,origin,result}),{status:'accepted'});
  assert.equal(message.to,result.invitation.email);
  assert.ok(message.text.includes(result.token));
  assert.ok(message.text.includes(origin));
  assert.ok(message.text.includes('Unirme a otro espacio'));
});
test('SMTP rejection or failure never claims email was accepted',async()=>{
  for(const send of [async()=>({accepted:[]}),async()=>{throw new Error('SMTP secret response');}]) {
    assert.deepEqual(await sendInvitationMail({mailer:{enabled:true,send},origin,result}),{status:'failed'});
  }
  assert.equal(result.token,'private-code');
});
test('missing mail configuration provides explicit fallback without sending',async()=>{
  assert.deepEqual(await sendInvitationMail({origin,result}),{status:'unavailable'});
});
