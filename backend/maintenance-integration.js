import assert from 'node:assert/strict';
import {reviewFixture} from './shared-review-qa-fixture.js';
import {purgeExpired} from './maintenance.js';
const f=await reviewFixture();
try{
  const q=(sql,params)=>f.pool.query(sql,params);
  await q("INSERT INTO sessions VALUES('expired',$1,now()-interval '1 minute'),('live',$1,now()+interval '1 day')",[f.admin]);
  await q("INSERT INTO oauth_states VALUES('expired','n','v',now()-interval '1 minute'),('live','n','v',now()+interval '5 minutes')");
  await q("INSERT INTO auth_attempts VALUES('stale',3,now()-interval '25 hours'),('recent',3,now()-interval '2 hours')");
  assert.deepEqual(await purgeExpired(f.pool),{sessions:1,oauthStates:1,authAttempts:1});
  assert.deepEqual((await q('SELECT token_hash FROM sessions')).rows,[{token_hash:'live'}]);
  assert.deepEqual((await q('SELECT token_hash FROM oauth_states')).rows,[{token_hash:'live'}]);
  assert.deepEqual((await q('SELECT key FROM auth_attempts')).rows,[{key:'recent'}]);
  assert.deepEqual(await purgeExpired(f.pool),{sessions:0,oauthStates:0,authAttempts:0});
  console.log('PASS maintenance: expired sessions, OAuth states and stale rate-limit counters purged; live rows kept.');
}finally{await f.close();}
