import assert from 'node:assert/strict';
import {reviewFixture} from './shared-review-qa-fixture.js';
import {purgeExpired} from './maintenance.js';
const f=await reviewFixture();
try{
  const q=(sql,params)=>f.pool.query(sql,params);
  await q("INSERT INTO sessions VALUES('expired',$1,now()-interval '1 minute'),('live',$1,now()+interval '1 day')",[f.admin]);
  await q("INSERT INTO oauth_states VALUES('expired','n','v',now()-interval '1 minute'),('live','n','v',now()+interval '5 minutes')");
  await q("INSERT INTO auth_attempts VALUES('stale',3,now()-interval '25 hours'),('recent',3,now()-interval '2 hours')");
  await q("INSERT INTO event_outbox(event_id,event_type,aggregate_type,aggregate_id,workspace_id,payload,occurred_at) VALUES(gen_random_uuid(),'qa.old','workspace',$1,$1,'{}',now()-interval '31 days')",[f.space]);
  const outboxBefore=(await q('SELECT count(*)::int AS n FROM event_outbox')).rows[0].n;
  assert.deepEqual(await purgeExpired(f.pool),{sessions:1,oauthStates:1,authAttempts:1,outboxEvents:1});
  assert.equal((await q('SELECT count(*)::int AS n FROM event_outbox')).rows[0].n,outboxBefore-1);
  assert.deepEqual((await q('SELECT token_hash FROM sessions')).rows,[{token_hash:'live'}]);
  assert.deepEqual((await q('SELECT token_hash FROM oauth_states')).rows,[{token_hash:'live'}]);
  assert.deepEqual((await q('SELECT key FROM auth_attempts')).rows,[{key:'recent'}]);
  assert.deepEqual(await purgeExpired(f.pool),{sessions:0,oauthStates:0,authAttempts:0,outboxEvents:0});
  console.log('PASS maintenance: expired sessions, OAuth states and stale rate-limit counters and old outbox events purged; live rows kept.');
}finally{await f.close();}
