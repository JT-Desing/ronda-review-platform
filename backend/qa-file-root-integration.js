import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {reviewFixture} from './shared-review-qa-fixture.js';
import {createApp} from './app.js';
import {digest} from './security.js';
const f=await reviewFixture();let server;
try{
 const origin='http://file-qa.invalid',value=randomUUID();await f.pool.query("INSERT INTO sessions VALUES($1,$2,now()+interval '1 hour')",[digest(value),f.admin]);
 server=http.createServer(createApp({pool:f.pool,origin,fileRoot:f.root}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const id=randomUUID(),bytes=Buffer.from('isolated QA private file');
 const result=await fetch(`http://127.0.0.1:${server.address().port}/api/files/${id}`,{method:'PUT',headers:{Origin:origin,Cookie:`ronda_session=${value}`,'Content-Type':'text/plain','X-File-Name':'qa.txt'},body:bytes});
 assert.equal(result.status,201);assert.deepEqual(await readFile(join(f.root,f.admin,id)),bytes,'private uploads must honor the isolated root');
 console.log('PASS private QA file root isolation.');
}finally{if(server)await new Promise(r=>server.close(r));await f.close();}
