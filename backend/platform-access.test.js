import test from 'node:test';
import assert from 'node:assert/strict';
import {withPlatformRole} from './platform-access.js';
import {canAccessCompanyDemo} from '../src/domain/platform-access.js';

test('workspace administrators and signed-out accounts cannot enter internal demos',()=>{
  assert.equal(canAccessCompanyDemo(null),false);
  assert.equal(canAccessCompanyDemo({role:'admin'}),false);
  assert.equal(canAccessCompanyDemo({role:'superadmin'}),false);
  assert.equal(canAccessCompanyDemo(withPlatformRole({id:'ordinary',role:'admin'},'')),false);
});

test('only server-configured account IDs receive the superadmin demo capability',()=>{
  const account={id:'trusted-id',email:'admin@example.invalid'};
  assert.equal(canAccessCompanyDemo(withPlatformRole(account,'other-id, trusted-id ')),true);
  assert.equal(canAccessCompanyDemo(withPlatformRole(account,'admin@example.invalid')),false);
  assert.equal(canAccessCompanyDemo(withPlatformRole({...account,id:'another-id'},'trusted-id')),false);
});

test('client-provided or historical platform roles cannot override the server assignment',()=>{
  assert.equal(withPlatformRole({id:'normal',platformRole:'superadmin'},'').platformRole,'user');
  assert.equal(withPlatformRole({id:'normal',capabilities:{companyDemo:true}},'').platformRole,'user');
  assert.equal(withPlatformRole(null,'trusted-id'),null);
});
