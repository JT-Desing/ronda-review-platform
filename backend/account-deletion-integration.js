import assert from 'node:assert/strict';
import {reviewFixture} from './shared-review-qa-fixture.js';
import {deleteAccount} from './account-deletion.js';
const f=await reviewFixture();
try{
  const who=async id=>(await f.pool.query('SELECT id,email,name FROM users WHERE id=$1',[id])).rows[0];
  const admin=await who(f.admin),reviewer=await who(f.reviewer);
  await assert.rejects(deleteAccount({pool:f.pool,account:reviewer,input:{confirmEmail:'otro@example.invalid'},fileRoot:f.root}),e=>e.status===400);
  await assert.rejects(deleteAccount({pool:f.pool,account:admin,input:{confirmEmail:admin.email},fileRoot:f.root}),e=>e.status===409);
  await f.pool.query("INSERT INTO sessions VALUES('x',$1,now()+interval '1 day')",[f.reviewer]);
  assert.deepEqual(await deleteAccount({pool:f.pool,account:reviewer,input:{confirmEmail:reviewer.email.toUpperCase()},fileRoot:f.root}),{deleted:true});
  const after=await who(f.reviewer);
  assert.equal(after.name,'Cuenta eliminada');assert.notEqual(after.email,reviewer.email);
  assert.equal((await f.pool.query('SELECT count(*)::int AS n FROM workspace_members WHERE user_id=$1',[f.reviewer])).rows[0].n,0);
  assert.equal((await f.pool.query('SELECT count(*)::int AS n FROM sessions WHERE user_id=$1',[f.reviewer])).rows[0].n,0);
  console.log('PASS account deletion: confirmation, last-admin guard, anonymized account, no access left.');
}finally{await f.close();}
