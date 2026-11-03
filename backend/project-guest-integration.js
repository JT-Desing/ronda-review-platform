import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {reviewFixture} from './shared-review-qa-fixture.js';
import {workspaceRepository} from './repositories/workspaces.js';
import {workspaceService} from './workspace-service.js';
import {sharedProjectRepository} from './repositories/shared-projects.js';
import {sharedProjectService} from './shared-project-service.js';
import {workspaceSeatsUsed} from './repositories/plans.js';
const f=await reviewFixture();
try{
  const teams=workspaceRepository(f.pool),service=workspaceService(teams);
  const projects=id=>sharedProjectService(sharedProjectRepository(f.pool,{projectId:id}));
  const other=(await projects().create(f.space,f.admin,{name:'Otro cliente',client:'',requestId:randomUUID()})).project;
  const email=(await f.pool.query('SELECT email FROM users WHERE id=$1',[f.outsider])).rows[0].email;
  const seats=await workspaceSeatsUsed(f.pool,f.space);
  await assert.rejects(service.invite(f.space,f.admin,{email,role:'guest'}),e=>e.status===400);
  const {token}=await service.invite(f.space,f.admin,{email,role:'guest',projectId:f.project});
  await service.accept({id:f.outsider,email},token);
  assert.equal(await workspaceSeatsUsed(f.pool,f.space),seats);
  const listed=(await projects().list(f.space,f.outsider)).projects.map(p=>p.id);
  assert.deepEqual(listed,[f.project]);
  await projects(f.project).read(f.space,f.outsider,f.project);
  await assert.rejects(projects(other.id).read(f.space,f.outsider,other.id),e=>e.status===404);
  const view=await teams.read(f.space,f.outsider);
  assert.deepEqual(view.members,[]);assert.deepEqual(view.events,[]);
  await assert.rejects(teams.reviewActivity(f.space,f.outsider),e=>e.status===403);
  console.log('PASS guests: one project only, no seat, no team data.');
}finally{await f.cleanup?.();await f.close?.();}
