import {randomUUID} from 'node:crypto';
import {writeFileSync,readFileSync,unlinkSync} from 'node:fs';
import {Pool} from 'pg';
import {rm} from 'node:fs/promises';
const fixture='/tmp/ronda-ui-fixture.json';
if(process.argv[2]==='prepare'){
  const email=`ui-qa-${randomUUID()}@example.invalid`;
  const response=await fetch('http://127.0.0.1:3000/api/auth/register',{method:'POST',headers:{Origin:process.env.APP_ORIGIN,'Content-Type':'application/json'},body:JSON.stringify({email,name:'Prueba de interfaz',password:'Temporary-QA-Only-2026!Discard'})});
  if(!response.ok)throw new Error('QA account could not be created');
  const {user}=await response.json();writeFileSync(fixture,JSON.stringify(user),{mode:0o600});console.log(email);
}else{
  const pool=new Pool({connectionString:process.env.DATABASE_URL});
  let user;
  if(process.argv[3]){
    if(!/^ui-qa-[0-9a-f-]{36}@example\.invalid$/.test(process.argv[3]))throw new Error('Only isolated QA emails may be removed');
    user=(await pool.query('SELECT id,email FROM users WHERE email=$1',[process.argv[3]])).rows[0];
  }else user=JSON.parse(readFileSync(fixture,'utf8'));
  if(!user)throw new Error('QA account not found');
  await pool.query('DELETE FROM workspaces WHERE id IN (SELECT workspace_id FROM workspace_members WHERE user_id=$1)',[user.id]);
  await pool.query('DELETE FROM users WHERE id=$1 AND email=$2',[user.id,user.email]);await rm(`/data/files/${user.id}`,{recursive:true,force:true});await pool.end();if(!process.argv[3])unlinkSync(fixture);console.log('Only temporary UI QA account and its QA media removed.');
}
