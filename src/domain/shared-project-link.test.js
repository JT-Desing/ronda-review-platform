import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readSharedProjectLink,sharedProjectLink} from './shared-project-link.js';
test('project links round-trip only scoped UUID identifiers',()=>{
 const workspaceId='e9a7c001-67bd-4be9-968d-13e465cd1210',projectId='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
 const url=sharedProjectLink('https://ronda.repolite.link',workspaceId,projectId);
 assert.deepEqual(readSharedProjectLink(new URL(url).hash),{workspaceId,projectId});
 assert.equal(new URL(url).origin,'https://ronda.repolite.link');
 for(const value of ['#team/a/b','#team/../../x','#review/a',url+'?extra'])assert.equal(readSharedProjectLink(value),null);
 assert.throws(()=>sharedProjectLink('https://ronda.repolite.link','invalid',projectId));
});
