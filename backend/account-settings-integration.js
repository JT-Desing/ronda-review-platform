import assert from 'node:assert/strict';
import {reviewFixture} from './shared-review-qa-fixture.js';
import {readSettings,updateSettings,changePassword,requestPlanChange} from './account-settings.js';
import {hashPassword,verifyPassword,digest} from './security.js';
import {sendNotificationDigests} from './notifications.js';
const f=await reviewFixture();
try{
  await f.pool.query('UPDATE users SET password_hash=$2 WHERE id=$1',[f.editor,await hashPassword('antigua-clave-12')]);
  assert.equal((await readSettings(f.pool,f.editor)).emailNotifications,'all');
  assert.equal((await updateSettings(f.pool,f.editor,{name:'  Eva Nueva ',emailNotifications:'mentions'})).name,'Eva Nueva');
  await assert.rejects(updateSettings(f.pool,f.editor,{emailNotifications:'spam'}),e=>e.status===400);
  await f.pool.query("INSERT INTO sessions VALUES($1,$2,now()+interval '1 day'),($3,$2,now()+interval '1 day')",[digest('actual'),f.editor,digest('otra')]);
  await assert.rejects(changePassword(f.pool,f.editor,'actual',{currentPassword:'mala-clave-123',newPassword:'nueva-clave-123'}),e=>e.status===403);
  await changePassword(f.pool,f.editor,'actual',{currentPassword:'antigua-clave-12',newPassword:'nueva-clave-123'});
  assert.ok(await verifyPassword('nueva-clave-123',(await f.pool.query('SELECT password_hash FROM users WHERE id=$1',[f.editor])).rows[0].password_hash));
  assert.deepEqual((await f.pool.query('SELECT token_hash FROM sessions WHERE user_id=$1',[f.editor])).rows.map(r=>r.token_hash),[digest('actual')]);
  // Digest respects the preference: a comment stays out, a mention goes out.
  const sent=[];const mailer={enabled:true,send:async m=>sent.push(m)};
  for(const kind of ['comment','mention'])await f.pool.query("INSERT INTO user_notifications(user_id,workspace_id,kind,details) VALUES($1,$2,$3,'{}')",[f.editor,f.space,kind]);
  await sendNotificationDigests({pool:f.pool,mailer,origin:'https://ronda.test'});
  assert.equal(sent.length,1);assert.match(sent[0].subject,/mencionó/);
  const account={id:f.reviewer,name:'QA 2',email:'r@example.invalid'};
  await assert.rejects(requestPlanChange({pool:f.pool,mailer,origin:'https://ronda.test',account,input:{plan:'agencia',workspaceId:f.space}}),e=>e.status===403);
  await requestPlanChange({pool:f.pool,mailer,origin:'https://ronda.test',account,input:{plan:'creador'}});
  assert.match(sent.at(-1).text,/creador/);
  console.log('PASS account settings: profile, email preference in digests, password change, plan request.');
}finally{await f.close();}
