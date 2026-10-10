import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { rm } from 'node:fs/promises';
const origin = process.env.APP_ORIGIN;
const base = 'http://127.0.0.1:3000';
const users = [];
async function request(path, method='GET', input, cookie) {
  return fetch(base+path, { method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? {Cookie:cookie}: {}) }, ...(input === undefined ? {} : {body:JSON.stringify(input)}) });
}
try {
  for (let i=0;i<2;i++) {
    const response = await request('/api/auth/register', 'POST', {name:'QA isolation',email:`qa-${randomUUID()}@example.invalid`,password:randomUUID()+randomUUID()});
    assert.equal(response.status,200);
    users.push({user:(await response.json()).user,cookie:response.headers.get('set-cookie').split(';')[0]});
  }
  assert.equal((await request('/api/data')).status,401);
  const a=users[0], b=users[1];
  const snapshot=await (await request('/api/data','GET',undefined,a.cookie)).json();
  const data={'ronda-pauta:v1':JSON.stringify({groups:[],campaigns:[{id:'qa-private'}]})};
  assert.equal((await request('/api/data','PUT',{data,revision:snapshot.revision},a.cookie)).status,200);
  assert.equal((await request('/api/data','PUT',{data,revision:snapshot.revision},a.cookie)).status,409);
  const privateData=await (await request('/api/data','GET',undefined,b.cookie)).json();
  assert.deepEqual(privateData.data,{});
  const id=randomUUID();
  const upload=await fetch(base+'/api/files/'+id,{method:'PUT',headers:{Origin:origin,Cookie:a.cookie,'Content-Type':'text/html','X-File-Name':'qa.html'},body:'<h1>Private QA</h1>'});
  assert.equal(upload.status,201);
  assert.equal((await request('/api/files/'+id,'GET',undefined,b.cookie)).status,404);
  assert.equal((await request('/api/files/'+id)).status,401);
  const download=await request('/api/files/'+id,'GET',undefined,a.cookie);
  assert.equal(download.headers.get('content-type'),'application/octet-stream');
  assert.equal(await download.text(),'<h1>Private QA</h1>');
  console.log('PASS account isolation, anonymous rejection, stale revision conflict, private file upload/download and HTML attachment safety.');
} finally {
  const pool=new Pool({connectionString:process.env.DATABASE_URL});
  for(const {user} of users){
    await pool.query('DELETE FROM workspaces WHERE id IN (SELECT workspace_id FROM workspace_members WHERE user_id=$1)',[user.id]);
    await pool.query('DELETE FROM users WHERE id=$1 AND email=$2',[user.id,user.email]);
    await rm(`/data/files/${user.id}`,{recursive:true,force:true});
  }
  await pool.end();
  console.log('Isolated QA accounts and QA media removed.');
}
