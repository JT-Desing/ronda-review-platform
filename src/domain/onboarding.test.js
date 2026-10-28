import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as onboarding from './onboarding.js';
test('new personal-only account needs workspace choice; established team or personal choice does not',()=>{
 assert.equal(onboarding.needsWorkspaceChoice([{kind:'personal'}],false),true);
 assert.equal(onboarding.needsWorkspaceChoice([{kind:'personal'},{kind:'team'}],false),false);
 assert.equal(onboarding.needsWorkspaceChoice([{kind:'personal'}],true),false);
});
test('personal workspace choice accepts JSON storage and the earlier plain preference',()=>{
 assert.equal(onboarding.hasPersonalWorkspaceChoice(JSON.stringify('personal')),true);
 assert.equal(onboarding.hasPersonalWorkspaceChoice('personal'),true);
 assert.equal(onboarding.hasPersonalWorkspaceChoice(null),false);
 assert.equal(onboarding.hasPersonalWorkspaceChoice('{bad'),false);
});
