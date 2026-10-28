// Test-only fixture preparation through real registration; no DB inserts or session bypass.
import {randomUUID} from 'node:crypto';
import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const actors=[['Eva Editora','eva'],['Mario Editor','mario'],['Lucía Revisora','lucia'],['Diego Revisor','diego'],['Persona Externa','externa']];
const out=[];
for(let index=0;index<actors.length;index++){
 const [name,key]=actors[index],origin=`http://127.0.0.${index+3}:${24102+index}`,email=`${key}@aurora.example.invalid`,password=`Only-QA-account-${2026}!`;
 const response=await fetch(origin+'/api/auth/register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({name,email,password})});
 if(!response.ok)throw new Error(`Registration failed for ${key}: ${response.status}`);
 out.push({name,email,origin,userId:(await response.json()).user.id});
}
const root=fileURLToPath(new URL('../.superpowers/ronda-usability/',import.meta.url));await mkdir(root,{recursive:true});await writeFile(root+'actors.json',JSON.stringify(out,null,2));console.log('Registered five fictitious QA users through real API. Password fixture is QA-only; no browser session injected.');
