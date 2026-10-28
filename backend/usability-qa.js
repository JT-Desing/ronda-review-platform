// Local-only, persistent usability lab. Never reads production .env files.
import http from 'node:http';
import {readFile,writeFile,mkdir,appendFile} from 'node:fs/promises';
import {resolve,extname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import {migrate} from './migration-runner.js';
import {createApp} from './app.js';
import {localStorage} from './storage/local.js';
import {createQaFaults,handleQaControlRequest} from './qa-faults.js';
import {qaHealth} from './qa-health.js';
import {qaListeners} from './qa-listeners.js';
import {handleQaMailboxRequest} from './qa-mailbox.js';
import {injectQaDiagnostics,responsiveQaHtml} from './qa-responsive.js';
import {digest} from './security.js';
import {validateQaDatabaseTarget} from './qa-db-target.js';
import {readQaStaticFile} from './qa-static-files.js';
const repo=resolve(fileURLToPath(new URL('../',import.meta.url))),root=join(repo,'.superpowers','ronda-usability'),dist=join(repo,'dist');
await mkdir(root,{recursive:true});
const configPath=join(root,'runtime.json');
let saved;try{saved=JSON.parse(await readFile(configPath,'utf8'));}catch{}
const connectionString=process.env.RONDA_QA_DATABASE_URL||saved?.connectionString;
const qaContainer=process.env.RONDA_QA_CONTAINER||saved?.container;
const target=validateQaDatabaseTarget(connectionString,qaContainer);
const pool=new pg.Pool({connectionString:target.toString()});await migrate(pool);
await writeFile(configPath,JSON.stringify({connectionString,container:process.env.RONDA_QA_CONTAINER||saved?.container,root},null,2),{mode:0o600});
const mailbox=join(root,'mailbox.jsonl'),timings=join(root,'timings.jsonl');
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mailer={enabled:true,async send(message){await appendFile(mailbox,JSON.stringify({...message,capturedAt:new Date().toISOString()})+'\n');return {accepted:[message.to]};}};
const configuredHosts=(process.env.RONDA_QA_HOSTS||'127.0.0.2,127.0.0.3,127.0.0.4,127.0.0.5,127.0.0.6,127.0.0.7,127.0.0.8,127.0.0.9,127.0.0.10').split(',').map(host=>host.trim());
const listeners=qaListeners({hosts:configuredHosts,basePort:Number(process.env.RONDA_QA_BASE_PORT||24101)});
const hosts=listeners.map(listener=>listener.host);
const personas=['Administradora','Editora A','Editor B','Revisora A','Revisor B','Cuenta externa','Registro sin equipo','Registro sin equipo retest','Registro sin equipo final'];
const mime={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.webp':'image/webp','.html':'text/html','.woff2':'font/woff2'};
const servers=[];
for(let index=0;index<hosts.length;index++){
 const origin=`http://${hosts[index]}:${listeners[index].port}`;
 const faults=createQaFaults();
 const app=createApp({pool,origin,mailer,sharedStorage:localStorage(join(root,'shared-files')),fileRoot:join(root,'private-files')});
 const server=http.createServer(async(req,res)=>{
  try{
   const path=new URL(req.url,origin).pathname;
   if(path==='/qa/control'){
    await handleQaControlRequest(req,res,{origin,faults});return;
   }
   if(path==='/qa/responsive'){
    const query=new URL(req.url,origin).searchParams,presets=[[1920,1080],[1366,768],[768,1024],[393,852]];
    const selected=presets.find(([w,h])=>String(w)===query.get('width')&&String(h)===query.get('height'))||presets[3];
    const hash=query.get('hash')||'';
    if(hash&&!/^#team\/[0-9a-f-]{36}(\/[0-9a-f-]{36})?$/i.test(hash)){res.writeHead(400);res.end('Invalid QA route');return;}
    const diagnostics=query.get('diagnostics')==='1';
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
    res.end(responsiveQaHtml({selected,hash,diagnostics}));return;
   }
   if(path==='/qa/mailbox'){
    await handleQaMailboxRequest(req,res,async()=>{const entries=(await readFile(mailbox,'utf8').catch(()=>'' )).trim().split('\n').filter(Boolean);return entries.map(line=>JSON.parse(line));},async request=>{
     const sessionToken=request.headers.cookie?.split(';').map(value=>value.trim()).find(value=>value.startsWith('ronda_session='))?.slice(14);
     if(!sessionToken)return null;
     const result=await pool.query('SELECT users.email FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=$1 AND sessions.expires_at>now() LIMIT 1',[digest(sessionToken)]);
     return result.rows[0]?.email||null;
    });return;
   }
   if(path==='/qa/health'){const health=await qaHealth(pool,personas[index]);res.writeHead(health.status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(health.body));return;}
   if(path.startsWith('/api/')){
    const injected=faults.before({method:req.method,path});
    const start=performance.now();res.on('finish',()=>{const row={at:new Date().toISOString(),persona:index,method:req.method,path:path.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi,':id'),status:res.statusCode,ms:Math.round(performance.now()-start)};appendFile(timings,JSON.stringify(row)+'\n').catch(()=>{});});
    const delay=injected.delayMs||Math.min(2000,Math.max(0,Number(process.env.RONDA_QA_LATENCY_MS)||0));if(delay)await new Promise(r=>setTimeout(r,delay));
    if(injected.status){res.writeHead(injected.status,{'Content-Type':'application/json'});res.end(JSON.stringify({error:injected.error}));return;}
    if(injected.disconnect){req.resume();res.destroy();return;}
    await app(req,res);return;
   }
   const file=await readQaStaticFile(path,dist,{mime});
   if(file.status!==200){res.writeHead(file.status);res.end();return;}
   let bytes=file.bytes;
   if(path==='/'&&new URL(req.url,origin).searchParams.get('qaDiagnostics')==='1')bytes=Buffer.from(injectQaDiagnostics(bytes.toString('utf8')));
   res.writeHead(200,{'Content-Type':path==='/'?'text/html':file.contentType,'Cache-Control':'no-cache'});res.end(bytes);
  }catch(error){if(!res.headersSent)res.writeHead(500,{'Content-Type':'text/plain'});res.end('QA request failed');console.error('qa_error',error.code||'internal');}
 });
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(listeners[index].port,hosts[index],ok);});servers.push(server);console.log(`${personas[index]}: ${origin}`);
}
console.log('QA only. Zero preseeded users. Mailbox: /qa/mailbox. Runtime/files retained under ignored .superpowers/ronda-usability.');
async function stop(){for(const server of servers)server.close();await pool.end();process.exit(0);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
