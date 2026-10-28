import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import http from 'node:http';
import {reviewFixture} from './shared-review-qa-fixture.js';
import {createApp} from './app.js';
import {localStorage} from './storage/local.js';
import {digest} from './security.js';

const f=await reviewFixture(),origin='http://upload-performance-qa.invalid';let server;
try{
  const token=randomUUID();
  await f.pool.query("INSERT INTO sessions VALUES($1,$2,now()+interval '1 day')",[digest(token),f.admin]);
  server=http.createServer(createApp({pool:f.pool,origin,sharedStorage:localStorage(f.root)}));
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const base=`http://127.0.0.1:${server.address().port}`;
  const projectPath=`/api/workspaces/${f.space}/projects/${f.project}`;
  const auth={Origin:origin,Cookie:`ronda_session=${token}`};
  const samples=[];
  for(const size of [1024*1024,10*1024*1024,50*1024*1024])for(let repetition=1;repetition<=3;repetition++){
    const payload=Buffer.alloc(size);
    Buffer.from('89504e470d0a1a0a','hex').copy(payload);
    const name=`qa-synthetic-${size}-${repetition}.png`;
    const requestId=randomUUID();
    let start=performance.now();
    const reservation=await fetch(base+projectPath+'/uploads',{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({name,mime:'image/png',size,projectId:f.project,requestId})});
    assert.equal(reservation.status,201,`reservation for ${size} bytes`);
    const {uploadId}=await reservation.json();
    const reserveMs=performance.now()-start;

    start=performance.now();
    const transfer=await fetch(`${base}/api/workspaces/${f.space}/uploads/${uploadId}/content`,{method:'PUT',headers:{...auth,'Content-Type':'image/png'},body:payload});
    assert.equal(transfer.status,200,`transfer for ${size} bytes`);
    const transferMs=performance.now()-start;

    start=performance.now();
    const finalize=await fetch(`${base}/api/workspaces/${f.space}/uploads/${uploadId}/complete`,{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:'{}'});
    assert.equal(finalize.status,200,`finalization for ${size} bytes`);
    const finalizeMs=performance.now()-start;
    samples.push({bytes:size,repetition,reserveMs:Number(reserveMs.toFixed(2)),transferMs:Number(transferMs.toFixed(2)),transferMiBPerSecond:Number((size/1048576/(transferMs/1000)).toFixed(2)),finalizeMs:Number(finalizeMs.toFixed(2))});
  }
  console.log('PASS synthetic QA upload performance (local loopback only): '+JSON.stringify(samples));
}finally{
  if(server)await new Promise(resolve=>server.close(resolve));
  await f.close();
}
