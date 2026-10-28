// Temporary local UI server. Must only run via dedicated QA runner.
import http from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {reviewFixture} from './shared-review-qa-fixture.js';
import {localStorage} from './storage/local.js';
import {sharedMediaService} from './shared-media-service.js';
import {sharedReviewRepository} from './repositories/shared-review.js';
import {sharedCommentService} from './shared-comment-service.js';
import {createApp} from './app.js';
import {digest} from './security.js';
import {readQaStaticFile} from './qa-static-files.js';
import {injectQaDiagnostics,responsiveQaHtml} from './qa-responsive.js';
import {shutdownQaUi} from './qa-ui-shutdown.js';
import {createSeedState,STORAGE_KEY} from '../src/data/seed.js';
const f=await reviewFixture(),dist=resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
const media=sharedMediaService(sharedReviewRepository(f.pool),localStorage(f.root));
await f.pool.query("UPDATE users SET name=CASE id WHEN $1 THEN 'Ana · Administradora QA' WHEN $2 THEN 'Mateo · Editor QA' WHEN $3 THEN 'Laura · Revisora QA' ELSE 'Externo QA' END",[f.admin,f.editor,f.reviewer]);
await f.pool.query("UPDATE workspaces SET name='Estudio Norte · QA' WHERE id=$1",[f.space]);
await f.pool.query("UPDATE shared_projects SET name='Lanzamiento · QA',client='Empresa ficticia' WHERE id=$1",[f.project]);
const emptyProject=(await f.pool.query("INSERT INTO shared_projects(workspace_id,name,client,created_by,request_id) VALUES($1,'Proyecto vacío · QA','Empresa ficticia',$2,$3) RETURNING id",[f.space,f.admin,randomUUID()])).rows[0].id;
await f.pool.query("INSERT INTO shared_assets(workspace_id,project_id,name,kind,created_by,request_id,deleted_at) VALUES($1,$2,'Pieza recuperable · QA','image',$3,$4,now())",[f.space,emptyProject,f.admin,randomUUID()]);
const image=await readFile(new URL('../src/components/brand-preview-reference-2.png',import.meta.url));
const assetCount=Math.min(8,Math.max(1,Number.parseInt(process.env.RONDA_QA_ASSET_COUNT||'1',10)||1));
const versionCount=Math.min(5,Math.max(1,Number.parseInt(process.env.RONDA_QA_VERSION_COUNT||'1',10)||1));
const seededAssets=[];
for(let index=1;index<=assetCount;index++){
  const {uploadId}=await media.reserve(f.space,f.admin,{projectId:f.project,name:`Campaña visual · QA ${index}.png`,mime:'image/png',size:image.length,requestId:randomUUID()});
  await media.receive(f.space,f.admin,uploadId,Readable.from([image]));
  seededAssets.push(await media.completeUpload(f.space,f.admin,uploadId));
}
const {asset,version}=seededAssets[0];
await media.setReviewers(f.space,f.admin,{projectId:f.project,assetId:asset.id,versionId:version.id,reviewerIds:[f.reviewer],revision:0});
for(let number=2;number<=versionCount;number++){
  const {uploadId}=await media.reserve(f.space,f.admin,{projectId:f.project,assetId:asset.id,name:`Campaña visual · QA versión ${number}.png`,mime:'image/png',size:image.length,requestId:randomUUID()});
  await media.receive(f.space,f.admin,uploadId,Readable.from([image]));
  await media.completeUpload(f.space,f.admin,uploadId);
}
const pdfFixture=process.env.RONDA_QA_PERSONAL_PDF==='1';
const pdfChunkLatency=Math.min(1500,Math.max(0,Number(process.env.RONDA_QA_PDF_CHUNK_LATENCY_MS)||0));
let privateFileRoot;
if(pdfFixture){
  privateFileRoot=join(f.root,'private-files');
  const bytes=await readFile(new URL('../docs/qa/fixtures/ronda-synthetic-review.pdf',import.meta.url));
  const pdfId=randomUUID(),versionId=`asset-${pdfId}-v1`,personalProject='project-amara';
  await mkdir(join(privateFileRoot,f.admin),{recursive:true});
  await writeFile(join(privateFileRoot,f.admin,pdfId),bytes,{mode:0o600});
  await f.pool.query('INSERT INTO files(id,user_id,name,mime,size) VALUES($1,$2,$3,$4,$5)',[pdfId,f.admin,'ronda-synthetic-review.pdf','application/pdf',bytes.length]);
  const owner=(await f.pool.query('SELECT id,email,name FROM users WHERE id=$1',[f.admin])).rows[0];
  const state=createSeedState();
  state.currentUserId=f.admin;
  state.workspace={id:`account-${f.admin}`,name:'Cuenta PDF · QA',plan:'free'};
  state.members={[f.admin]:{...owner,initials:'AQ',role:'admin',status:'active'}};
  state.projects={[personalProject]:{id:personalProject,name:'Revisión PDF sintética · QA',client:'Fixture de navegador',activeVersionId:versionId}};
  state.assets=[{id:pdfId,fileId:pdfId,projectId:personalProject,name:'ronda-synthetic-review.pdf',type:'pdf',mime:'application/pdf',size:bytes.length,extension:'PDF'}];
  state.versions={[versionId]:{id:versionId,projectId:personalProject,assetId:pdfId,number:1,name:'ronda-synthetic-review.pdf',reviewerIds:[f.admin],decisions:{}}};
  state.comments={};state.annotations={};state.activity=[];state.notifications={};
  await f.pool.query('INSERT INTO account_data(user_id,data) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET data=EXCLUDED.data,revision=0,updated_at=now()',
    [f.admin,{[STORAGE_KEY]:JSON.stringify(state)}]);
  console.log(`QA personal PDF fixture ready: ${versionId}`);
}
const pagination=process.env.RONDA_QA_PAGINATION==='1';
const comments=sharedCommentService(sharedReviewRepository(f.pool)),context={projectId:f.project,assetId:asset.id,versionId:version.id};
await comments.addComment(f.space,f.reviewer,context,{text:'Revisar el encuadre antes de entregar.',priority:pagination?'normal':'blocking',requestId:randomUUID()});
if(pagination){
  for(let index=2;index<=123;index++)await comments.addComment(f.space,f.reviewer,context,{text:`QA paginación ${index}: ${index===123?'Bloqueante fuera de primera página':'Comentario sintético'}`,priority:index===123?'blocking':'normal',requestId:randomUUID()});
}
let app;
const capturedQaMail=[];
const qaMailer={enabled:true,async send(message){capturedQaMail.push({...message,capturedAt:new Date().toISOString()});return {accepted:[message.to]};}};
const server=http.createServer(async(req,res)=>{
  try{
    const requestUrl=new URL(req.url,origin),path=requestUrl.pathname;
    if(path==='/qa/responsive'){
      const presets=[[1920,1080],[1366,768],[768,1024],[393,852]];
      const selected=presets.find(([width,height])=>String(width)===requestUrl.searchParams.get('width')&&String(height)===requestUrl.searchParams.get('height'))||presets[3];
      const hash=requestUrl.searchParams.get('hash')||'';
      if(hash&&!/^#team\/[0-9a-f-]{36}(\/[0-9a-f-]{36})?$/i.test(hash)){res.writeHead(400);res.end('Invalid QA route');return;}
      const diagnostics=requestUrl.searchParams.get('diagnostics')==='1';
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
      res.end(responsiveQaHtml({selected,hash,diagnostics}));return;
    }
    if(req.url.startsWith('/qa/login/')){
      const role=req.url.split('/').at(-1),actor={admin:f.admin,editor:f.editor,reviewer:f.reviewer,outsider:f.outsider}[role];if(!actor){res.writeHead(404);res.end();return;}
      const value=randomUUID();await f.pool.query("INSERT INTO sessions VALUES($1,$2,now()+interval '1 hour')",[digest(value),actor]);
      res.writeHead(302,{'Set-Cookie':`ronda_session=${value}; HttpOnly; SameSite=Lax; Path=/`,Location:'/'});res.end();return;
    }
    if(req.url==='/qa/stop'){
      res.writeHead(200,{'Connection':'close','Content-Type':'text/plain; charset=utf-8'});
      res.end('QA stopped',async()=>{
        try{process.exit(await shutdownQaUi({server,closeFixture:()=>f.close()})?0:1);}
        catch{process.exit(1);}
      });
      return;
    }
    if(path==='/qa/mailbox'&&req.method==='GET'){
      const cookieHeader=req.headers.cookie||'';
      const sessionToken=cookieHeader.split(';').map(value=>value.trim()).find(value=>value.startsWith('ronda_session='))?.slice('ronda_session='.length);
      if(!sessionToken){res.writeHead(401,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:'QA session required'}));return;}
      const recipient=(await f.pool.query('SELECT users.email FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=$1 AND sessions.expires_at>now() LIMIT 1',[digest(sessionToken)])).rows[0]?.email;
      if(!recipient){res.writeHead(401,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:'QA session required'}));return;}
      const messages=capturedQaMail.filter(message=>String(message.to).toLowerCase()===String(recipient).toLowerCase());
      res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify({qa:true,delivery:'capture-only',messages}));return;
    }
    if(req.url.startsWith('/api/')){const latency=Math.min(2000,Math.max(0,Number(process.env.RONDA_QA_LATENCY_MS)||0));if(latency)await new Promise(resolve=>setTimeout(resolve,latency));return await app(req,res);}
    const types={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.html':'text/html','.woff2':'font/woff2'};
    if(pdfChunkLatency&&/^\/assets\/PdfReview-[^/]+\.js$/.test(path))await new Promise(resolve=>setTimeout(resolve,pdfChunkLatency));
    const file=await readQaStaticFile(path,dist,{mime:types});
    if(file.status!==200){res.writeHead(file.status);res.end();return;}
    const bytes=path==='/'&&requestUrl.searchParams.get('qaDiagnostics')==='1'?Buffer.from(injectQaDiagnostics(file.bytes.toString('utf8'))):file.bytes;
    res.writeHead(200,{'Content-Type':file.contentType});res.end(bytes);
  }catch{if(!res.headersSent)res.writeHead(500);res.end('QA error');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;app=createApp({pool:f.pool,origin,mailer:qaMailer,sharedStorage:localStorage(f.root),...(privateFileRoot?{fileRoot:privateFileRoot}:{})});
console.log('QA_UI_URL='+origin);console.log(`Temporary fixture only (${assetCount} synthetic pieces, up to ${versionCount} versions on first piece${pdfFixture?', personal PDF fixture enabled':''}${pdfChunkLatency?`, PDF chunk delayed ${pdfChunkLatency} ms for branded-loader verification`:''}). Login /qa/login/admin or /qa/login/reviewer; use /qa/responsive?width=393&height=852&hash=%23team%2F${f.space}%2F${f.project}&diagnostics=1 for the responsive harness; stop /qa/stop.`);
