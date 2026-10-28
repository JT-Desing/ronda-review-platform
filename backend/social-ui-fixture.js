// Isolated, disposable UI fixture; never changes an existing account.
import {randomUUID} from 'node:crypto';
const email=`ui-qa-${randomUUID()}@example.invalid`,base='http://127.0.0.1:3000';
const response=await fetch(base+'/api/auth/register',{method:'POST',headers:{Origin:process.env.APP_ORIGIN,'Content-Type':'application/json'},body:JSON.stringify({email,name:'QA Preview Social',password:'Temporary-QA-Only-2026!Discard'})});
if(!response.ok)throw new Error('Registration failed');
const cookie=response.headers.get('set-cookie').split(';')[0],user=(await response.json()).user;
const assets=[];
for(const [i,color] of ['#b9a5db','#b9eeeb'].entries()){
 const id=randomUUID(),name=`Lámina QA ${i+1}.svg`,body=`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="800" height="1000" fill="${color}"/><circle cx="600" cy="220" r="230" fill="#eee8f8"/><text x="70" y="650" font-size="64" font-family="sans-serif" fill="#202126">RONDA ${i+1}</text></svg>`;
 const upload=await fetch(base+'/api/files/'+id,{method:'PUT',headers:{Origin:process.env.APP_ORIGIN,Cookie:cookie,'Content-Type':'image/svg+xml','X-File-Name':encodeURIComponent(name)},body});if(!upload.ok)throw new Error('Upload failed');
 assets.push({id,name,type:'image',mime:'image/svg+xml',size:body.length,extension:'SVG',projectId:'project-amara'});
}
const state={schemaVersion:1,workspace:{id:'qa',name:'QA Social',plan:'studio'},currentUserId:'qa',members:{qa:{id:'qa',name:'QA Social',initials:'QA',email,role:'admin'}},projects:{'project-amara':{id:'project-amara',name:'Campaña QA Social',activeVersionId:`asset-${assets[0].id}-v1`,socialPreview:{assetIds:assets.map(a=>a.id),account:'ronda.studio',caption:'Dos láminas de prueba. Preview orientativa.',ratio:'4/5'}}},versions:Object.fromEntries(assets.map(a=>[`asset-${a.id}-v1`,{id:`asset-${a.id}-v1`,projectId:'project-amara',number:1,name:a.name,reviewerIds:['qa'],decisions:{}}])),assets,comments:{},annotations:{},activity:[],notifications:{}};
const snapshot=await(await fetch(base+'/api/data',{headers:{Cookie:cookie}})).json();
const save=await fetch(base+'/api/data',{method:'PUT',headers:{Origin:process.env.APP_ORIGIN,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({revision:snapshot.revision,data:{'ronda-state:v1':JSON.stringify(state)}})});if(!save.ok)throw new Error('State save failed');
console.log(email);
