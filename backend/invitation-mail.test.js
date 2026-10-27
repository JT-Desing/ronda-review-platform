import test from 'node:test';
import assert from 'node:assert/strict';
import {sendInvitationMail} from './invitation-mail.js';
const result={invitation:{email:'invitee@example.invalid',expires_at:'2026-10-21T00:00:00Z'},token:'A'.repeat(43)};
const origin='https://ronda.repolite.link';
test('invitation email uses stored recipient, code and public origin',async()=>{
  let message;
  const mailer={enabled:true,send:async value=>{message=value;return {accepted:[result.invitation.email]};}};
  assert.deepEqual(await sendInvitationMail({mailer,origin,result}),{status:'accepted'});
  assert.equal(message.to,result.invitation.email);
  assert.ok(message.text.includes(result.token));
  assert.ok(message.text.includes(origin));
  assert.match(message.html,/Te invitaron a colaborar en Ronda/);
  assert.match(message.html,/Aceptar invitación/);
  assert.match(message.html,/href="https:\/\/ronda\.repolite\.link\/#invite\//);
  assert.match(message.html,/src="cid:ronda-mark@ronda"/);
  assert.equal(message.attachments[0].cid,'ronda-mark@ronda');
  assert.ok(message.attachments[0].content.length>0);
  assert.ok(message.html.includes(result.token));
  assert.match(message.html,/un solo uso/);
  assert.ok(message.text.includes('Proyectos → Unirme con un código de invitación'));
  const invitationUrl=new URL(message.text.match(/https:\/\/[^\s]+#invite\/[^\s]+/)[0]);
  assert.equal(invitationUrl.search,'');
  assert.equal(invitationUrl.hash,`#invite/${result.token}`);
});
test('SMTP rejection or failure never claims email was accepted',async()=>{
  for(const send of [async()=>({accepted:[]}),async()=>{throw new Error('SMTP secret response');}]) {
    assert.deepEqual(await sendInvitationMail({mailer:{enabled:true,send},origin,result}),{status:'failed'});
  }
  assert.equal(result.token,'A'.repeat(43));
});
test('missing mail configuration provides explicit fallback without sending',async()=>{
  assert.deepEqual(await sendInvitationMail({origin,result}),{status:'unavailable'});
});

test('invitation email escapes the invited address before inserting it into HTML',async()=>{
  let message;
  const unsafe={invitation:{...result.invitation,email:'<img src=x onerror=alert(1)>@example.invalid'},token:result.token};
  await sendInvitationMail({mailer:{enabled:true,send:async value=>{message=value;return {accepted:[unsafe.invitation.email]};}},origin,result:unsafe});
  assert.doesNotMatch(message.html,/<img src=x/i);
  assert.match(message.html,/&lt;img src=x onerror=alert\(1\)&gt;/);
});
