import test from 'node:test';
import assert from 'node:assert/strict';
import {createInvitationLink,isValidInvitationCode,readInvitationCode} from './invitation-link.js';

const token='A'.repeat(43);

test('invitation link carries the token only in the fragment and round-trips it',()=>{
  const link=createInvitationLink('https://ronda.example/any/path',token);
  const url=new URL(link);
  assert.equal(url.pathname,'/');
  assert.equal(url.search,'');
  assert.equal(url.hash,`#invite/${token}`);
  assert.equal(readInvitationCode(url.hash),token);
});

test('invalid invitation fragments and link inputs are ignored',()=>{
  assert.equal(readInvitationCode('#invite/not-a-token'),'');
  assert.equal(readInvitationCode(`#invite/${token}?next=/`),'');
  assert.throws(()=>createInvitationLink('javascript:alert(1)',token));
  assert.throws(()=>createInvitationLink('https://ronda.example','short'));
});

test('manual invite codes accept only the complete URL-safe token, allowing surrounding whitespace',()=>{
  assert.equal(isValidInvitationCode(token),true);
  assert.equal(isValidInvitationCode(` ${token} `),true);
  assert.equal(isValidInvitationCode(token.slice(0,-1)),false);
  assert.equal(isValidInvitationCode(`${token}!`),false);
  assert.equal(isValidInvitationCode(''),false);
});
