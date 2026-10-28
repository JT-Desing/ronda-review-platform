import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=name=>readFileSync(new URL(`./${name}`,import.meta.url),'utf8');

test('permission denial refreshes workspace authorization without remounting the active review',()=>{
 const projects=source('SharedProjects.jsx');
 const media=source('SharedProjectMedia.jsx');
 const room=source('SharedReviewRoom.jsx');
 assert.match(projects,/const refreshPermissions=useCallback\(\(\)=>\{setRole\(''\);setPermissionRevision\(value=>value\+1\);setRefresh\(value=>value\+1\);\},\[\]\)/);
 assert.match(projects,/permissionRevision=\{permissionRevision\} onPermissionDenied=\{refreshPermissions\}/);
 assert.match(projects,/onRoleUpdate=\{setRole\}/);
 assert.match(media,/if\(e\.status===403\)onPermissionDenied\?\.\(\)/);
 assert.match(media,/setSelected\(current=>active\.assets\.some\(asset=>asset\.id===current\)\?current:active\.assets\[0\]\?\.id\|\|''\)/);
 assert.match(media,/permissionRevision=\{permissionRevision\}[^>]*onPermissionDenied=\{onPermissionDenied\}/);
 assert.match(media,/workspaceRole=\{role\}/);
 assert.match(media,/if\(room\.role\)onRoleUpdate\?\.\(room\.role\)/);
 assert.match(room,/\['admin','editor'\]\.includes\(workspaceRole\)&&\['admin','editor'\]\.includes\(room\?\.role\)/);
 assert.match(room,/permissionRevision\]\)/);
 assert.match(room,/if\(e\.status===403\)onPermissionDenied\?\.\(\)/);
 assert.doesNotMatch(media,/key=\{workspaceId\+'\:'\+projectId\+'\:'\+selected\+.*role/);
});
