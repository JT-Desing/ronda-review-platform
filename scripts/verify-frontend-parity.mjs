import {createHash} from 'node:crypto';

// Public static files only. Does not send cookies or read account/project data.
const [production,...targets]=process.argv.slice(2);
if(!production||!targets.length)throw new Error('Usage: node scripts/verify-frontend-parity.mjs PRODUCTION_URL QA_URL [QA_URL...]');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const assetPaths=bytes=>[...new Set([...bytes.toString().matchAll(/(?:src|href)="(\/assets\/[^"?#]+\.(?:js|mjs|css))"/g)].map(match=>match[1]))].sort();
async function download(base,path='/'){
  const url=new URL(path,base);
  if(url.origin!==new URL(base).origin)throw new Error('Cross-origin asset reference rejected');
  const response=await fetch(url,{signal:AbortSignal.timeout(15000),cache:'no-store',redirect:'error'});
  if(!response.ok)throw new Error(`${url.origin}${url.pathname}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
const index=await download(production);
const assets=assetPaths(index);
if(!assets.length)throw new Error('No frontend assets found in production entry');
const hashes=Object.fromEntries(await Promise.all(assets.map(async path=>[path,digest(await download(production,path))])));
const results=await Promise.all(targets.map(async target=>{
  try{
    // Cloudflare appends a dynamic gateway script to public HTML. Compare the
    // app entry references, then independently hash every referenced app file.
    const sameEntry=JSON.stringify(assetPaths(await download(target)))===JSON.stringify(assets);
    const differences=(await Promise.all(assets.map(async path=>{
      try{return digest(await download(target,path))===hashes[path]?null:path;}catch(error){return error.message;}
    }))).filter(Boolean);
    return {target,sameEntry,sameAssets:differences.length===0,differences};
  }catch(error){return {target,sameEntry:false,sameAssets:false,error:error.message};}
}));
const passed=results.every(result=>result.sameEntry&&result.sameAssets);
console.log(JSON.stringify({production,entrypointSha256:digest(Buffer.from(JSON.stringify(hashes))),entryComparison:'App script/stylesheet references; gateway-injected HTML excluded',assetsChecked:assets.length,assets:hashes,targets:results,passed},null,2));
if(!passed)process.exitCode=1;
