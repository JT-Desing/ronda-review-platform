import assert from 'node:assert/strict';
import {reviewFixture} from './shared-review-qa-fixture.js';
import {sharedProjectRepository} from './repositories/shared-projects.js';
import {sharedProjectService} from './shared-project-service.js';
const f=await reviewFixture();
try{
 const service=sharedProjectService(sharedProjectRepository(f.pool));
 const p=(await service.read(f.space,f.admin,f.project)).project;
 const input={revision:p.revision,confirmName:p.name};
 for(const actor of [f.editor,f.reviewer])await assert.rejects(service.trash(f.space,actor,f.project,input),{status:403});
 await assert.rejects(service.trash(f.space,f.outsider,f.project,input));
 await assert.rejects(service.trash(f.space,f.admin,f.project,{...input,confirmName:'wrong'}),{status:409});
 await service.comment(f.space,f.reviewer,f.project,{text:'Retained comment',requestId:crypto.randomUUID()});
 await service.trash(f.space,f.admin,f.project,input);
 assert.equal((await service.list(f.space,f.reviewer)).projects.length,0);
 assert.equal((await service.list(f.space,f.reviewer)).deletedProjects.length,0);
 const deleted=(await service.list(f.space,f.admin)).deletedProjects[0];
 assert.equal(deleted.id,f.project);
 await assert.rejects(service.read(f.space,f.admin,f.project),{status:404});
 await assert.rejects(service.update(f.space,f.editor,f.project,{...input,name:'Changed'}),{status:404});
 await assert.rejects(service.trash(f.space,f.editor,f.project,{...input,revision:deleted.revision},true),{status:403});
 await service.trash(f.space,f.admin,f.project,{...input,revision:deleted.revision},true);
 assert.equal((await service.read(f.space,f.admin,f.project)).comments[0].text,'Retained comment');
 assert.equal((await f.pool.query("SELECT count(*)::integer AS n FROM workspace_events WHERE action IN ('project.trashed','project.restored')")).rows[0].n,2);
 console.log('PASS project trash: admin, confirmation, CAS, hidden access, restore and retained comments.');
}finally{await f.close();}
