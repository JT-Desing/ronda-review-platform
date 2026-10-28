// Low-volume, unauthenticated probes only. No credentials, destructive writes or load tests.
import {writeFile} from 'node:fs/promises';
const origin='https://ronda.repolite.link';
const results=[];
async function probe(name,path,options,check){
 const started=Date.now();
 try{const response=await fetch(origin+path,{...options,redirect:'manual',signal:AbortSignal.timeout(15000)});const body=await response.text();results.push({name,status:response.status,elapsedMs:Date.now()-started,...check(response,body)});}
 catch(error){results.push({name,passed:false,error:error.name});}
}
await probe('security_headers','/',{},r=>({passed:['content-security-policy','strict-transport-security','x-content-type-options','referrer-policy','x-frame-options','permissions-policy'].every(h=>r.headers.has(h)),headers:Object.fromEntries(['content-security-policy','strict-transport-security','x-content-type-options','referrer-policy','x-frame-options','permissions-policy'].map(h=>[h,r.headers.get(h)]))}));
await probe('anonymous_session','/api/auth/session',{},(r,b)=>({passed:r.status===200&&JSON.parse(b).user===null,noStore:r.headers.get('cache-control')?.includes('no-store')}));
await probe('anonymous_workspaces','/api/workspaces',{},r=>({passed:r.status===401}));
await probe('anonymous_account_data','/api/data',{},r=>({passed:r.status===401}));
await probe('anonymous_test_project','/api/workspaces/422d7111-2f9b-4aed-8d6f-69cc25ff11e6/projects/5f0f407b-ca15-46a4-9197-d61efa071188/assets',{},r=>({passed:r.status===401}));
await probe('cross_origin_write_rejected','/api/auth/logout',{method:'POST',headers:{Origin:'https://example.invalid','Content-Type':'application/json'},body:'{}'},r=>({passed:r.status===403}));
await probe('missing_origin_write_rejected','/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'},r=>({passed:r.status===403}));
await probe('invalid_json_handled','/api/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{'},(r,b)=>({passed:r.status===400&&!/stack|at .*\.js:\d/i.test(b)}));
for(const path of ['/.env','/.git/config'])await probe('no_sensitive_file_'+path,path,{},(r,b)=>({passed:r.status===404||(r.headers.get('content-type')?.includes('text/html')&&b.includes('<div id="root">')&&!/DATABASE_URL=|SMTP_PASS=|\[core\]/.test(b)),spaFallback:r.status===200}));
const report={checkedAt:new Date().toISOString(),origin,scope:'Unauthenticated non-destructive production smoke; not a penetration-test certification',results,passed:results.every(r=>r.passed)};
const runId=report.checkedAt.replace(/[:.]/g,'-');
await writeFile(new URL(`../docs/qa/production-security-smoke-${runId}.json`,import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
process.exitCode=report.passed?0:1;
