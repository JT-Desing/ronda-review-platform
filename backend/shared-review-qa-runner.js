// Dedicated temporary database container, never loads .env or production volumes.
import { execFileSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { fileURLToPath } from 'node:url';
const name='ronda-review-qa-'+randomUUID().replaceAll('-','');
const password=randomUUID()+randomUUID();
const db='ronda_qa_'+randomUUID().replaceAll('-','');
const script=process.argv[2]||'shared-review-model-integration.js';
if(!/^[a-z0-9-]+\.js$/.test(script))throw new Error('Invalid QA script');
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
let container;
try{
  container=docker('run','-d','--name',name,'--label','ronda.qa=shared-review','-e',`POSTGRES_PASSWORD=${password}`,'-e',`POSTGRES_DB=${db}`,'-p','127.0.0.1::5432','postgres:17-alpine');
  const port=docker('port',name,'5432/tcp').split(':').at(-1);
  const url=`postgresql://postgres:${password}@127.0.0.1:${port}/${db}`;
  let ready=false;
  for(let i=0;i<40;i++){
    const p=new pg.Pool({connectionString:url,connectionTimeoutMillis:1000});
    try{await p.query('SELECT 1');ready=true;break;}catch{}finally{await p.end();}
    await new Promise(r=>setTimeout(r,250));
  }
  if(!ready)throw new Error('QA database unavailable');
  const exit=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[fileURLToPath(new URL(script,import.meta.url))],{env:{...process.env,RONDA_QA_DATABASE_URL:url,RONDA_QA_CONTAINER:name,DATABASE_URL:url},stdio:'inherit'});
    child.on('error',reject);child.on('close',resolve);
  });
  process.exitCode=exit||0;
}finally{
  if(container){
    const label=docker('inspect','--format','{{index .Config.Labels "ronda.qa"}}',name);
    if(label==='shared-review')docker('rm','-f','-v',name);
  }
}
