// Temporary local UI server. Must only run via dedicated QA runner.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
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
const f=await reviewFixture(),dist=resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
const media=sharedMediaService(sharedReviewRepository(f.pool),localStorage(f.root));
await f.pool.query("UPDATE users SET name=CASE id WHEN $1 THEN 'Ana · Administradora QA' WHEN $2 THEN 'Mateo · Editor QA' WHEN $3 THEN 'Laura · Revisora QA' ELSE 'Externo QA' END",[f.admin,f.editor,f.reviewer]);
await f.pool.query("UPDATE workspaces SET name='Estudio Norte · QA' WHERE id=$1",[f.space]);
await f.pool.query("UPDATE shared_projects SET name='Lanzamiento · QA',client='Empresa ficticia' WHERE id=$1",[f.project]);
const emptyProject=(await f.pool.query("INSERT INTO shared_projects(workspace_id,name,client,created_by,request_id) VALUES($1,'Proyecto vacío · QA','Empresa ficticia',$2,$3) RETURNING id",[f.space,f.admin,randomUUID()])).rows[0].id;
await f.pool.query("INSERT INTO shared_assets(workspace_id,project_id,name,kind,created_by,request_id,deleted_at) VALUES($1,$2,'Pieza recuperable · QA','image',$3,$4,now())",[f.space,emptyProject,f.admin,randomUUID()]);
const image=await readFile(new URL('../src/components/brand-preview-reference-2.png',import.meta.url));
const {uploadId}=await media.reserve(f.space,f.admin,{projectId:f.project,name:'Campaña visual · QA.png',mime:'image/png',size:image.length,requestId:randomUUID()});
await media.receive(f.space,f.admin,uploadId,Readable.from([image]));const {asset,version}=await media.completeUpload(f.space,f.admin,uploadId);
await media.setReviewers(f.space,f.admin,{projectId:f.project,assetId:asset.id,versionId:version.id,reviewerIds:[f.reviewer],revision:0});
await sharedCommentService(sharedReviewRepository(f.pool)).addComment(f.space,f.reviewer,{projectId:f.project,assetId:asset.id,versionId:version.id},{text:'Revisar el encuadre antes de entregar.',priority:'blocking',requestId:randomUUID()});
let app;
const server=http.createServer(async(req,res)=>{
  try{
    if(req.url.startsWith('/qa/login/')){
      const role=req.url.split('/').at(-1),actor={admin:f.admin,editor:f.editor,reviewer:f.reviewer}[role];if(!actor){res.writeHead(404);res.end();return;}
      const value=randomUUID();await f.pool.query("INSERT INTO sessions VALUES($1,$2,now()+interval '1 hour')",[digest(value),actor]);
      res.writeHead(302,{'Set-Cookie':`ronda_session=${value}; HttpOnly; SameSite=Lax; Path=/`,Location:'/'});res.end();return;
    }
    if(req.url==='/qa/stop'){res.end('QA stopped');server.close(async()=>{await f.close();});return;}
    if(req.url.startsWith('/api/')){const latency=Math.min(2000,Math.max(0,Number(process.env.RONDA_QA_LATENCY_MS)||0));if(latency)await new Promise(resolve=>setTimeout(resolve,latency));return await app(req,res);}
    const path=req.url.split('?')[0];const full=resolve(dist,'.'+decodeURIComponent(path));
    if(!full.startsWith(dist+ '/' )&&!full.startsWith(dist+'\\')&&full!==dist){res.writeHead(404);res.end();return;}
    const types={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.html':'text/html','.woff2':'font/woff2'};
    const file=path==='/'?resolve(dist,'index.html'):full;
    const data=await readFile(file).catch(()=>readFile(resolve(dist,'index.html')));res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(data);
  }catch{if(!res.headersSent)res.writeHead(500);res.end('QA error');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;app=createApp({pool:f.pool,origin,sharedStorage:localStorage(f.root)});
console.log('QA_UI_URL='+origin);console.log('Temporary fixture only. Login /qa/login/admin or /qa/login/reviewer; stop /qa/stop.');
