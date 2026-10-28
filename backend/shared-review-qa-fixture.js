import {randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import pg from 'pg';
import {migrate} from './migration-runner.js';
import {validateQaDatabaseTarget} from './qa-db-target.js';
export async function reviewFixture(){
  const url=process.env.RONDA_QA_DATABASE_URL;
  const target=validateQaDatabaseTarget(url,process.env.RONDA_QA_CONTAINER);
  const pool=new pg.Pool({connectionString:target.toString()});
  if((await pool.query("SELECT to_regclass('public.users') AS name")).rows[0].name)throw new Error('QA database must be empty');
  await migrate(pool);
  const users=[];
  for(let i=0;i<4;i++)users.push((await pool.query('INSERT INTO users(email,name,password_hash) VALUES($1,$2,$3) RETURNING id',[`review-${i}@example.invalid`,`QA ${i}`,'not-a-login'])).rows[0].id);
  const space=(await pool.query("INSERT INTO workspaces(name,kind) VALUES('QA','team') RETURNING id")).rows[0].id;
  for(let i=0;i<3;i++)await pool.query('INSERT INTO workspace_members VALUES($1,$2,$3)',[space,users[i],['admin','editor','reviewer'][i]]);
  const project=(await pool.query("INSERT INTO shared_projects(workspace_id,name,created_by,request_id) VALUES($1,'QA',$2,$3) RETURNING id",[space,users[0],randomUUID()])).rows[0].id;
  const root=await mkdtemp(join(tmpdir(),'ronda-review-qa-'));
  return {pool,space,project,admin:users[0],editor:users[1],reviewer:users[2],outsider:users[3],root,async close(){await pool.end();await rm(root,{recursive:true});}};
}
