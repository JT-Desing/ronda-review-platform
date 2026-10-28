import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { migrate } from './migration-runner.js';

// A dedicated QA PostgreSQL URL is mandatory. Never fall back to backend/.env.
const url=process.env.RONDA_QA_DATABASE_URL;
if(!url || !/^ronda_qa_[a-z0-9_]+$/.test(new URL(url).pathname.slice(1))) throw new Error('Provide a dedicated ronda_qa_* database URL; production is forbidden.');
const pool=new pg.Pool({connectionString:url});
try {
  const existing=await pool.query("SELECT to_regclass('public.users') AS table_name");
  assert.equal(existing.rows[0].table_name,null,'QA database must be empty');
  await migrate(pool);
  const user=(await pool.query("INSERT INTO users(email,name,password_hash) VALUES('model@example.invalid','QA','not-a-login') RETURNING id")).rows[0].id;
  await pool.query('INSERT INTO account_data(user_id,data) VALUES($1,$2)',[user,{private:'preserve'}]);
  const spaces=[];
  for(let i=0;i<2;i++)spaces.push((await pool.query("INSERT INTO workspaces(name,kind) VALUES('QA','team') RETURNING id")).rows[0].id);
  const projects=[];
  for(const space of spaces) projects.push((await pool.query("INSERT INTO shared_projects(workspace_id,name,created_by,request_id) VALUES($1,'QA',$2,$3) RETURNING id",[space,user,randomUUID()])).rows[0].id);
  await assert.rejects(pool.query("INSERT INTO shared_assets(workspace_id,project_id,name,kind,created_by,request_id) VALUES($1,$2,'bad','image',$3,$4)",[spaces[0],projects[1],user,randomUUID()]),{code:'23503'});
  assert.deepEqual((await pool.query('SELECT data FROM account_data WHERE user_id=$1',[user])).rows[0].data,{private:'preserve'});
  // The repository targets the current schema; apply the migrations added after 0004.
  for(const name of (await readdir(dir)).filter(n=>/^\d{4}_.*\.sql$/.test(n)&&n>='0005').sort()) await pool.query(await readFile(new URL(name,dir),'utf8'));
  const {sharedReviewRepository}=await import('./repositories/shared-review.js');
  const repository=sharedReviewRepository(pool);
  await pool.query("INSERT INTO workspace_members VALUES($1,$2,'admin')",[spaces[0],user]);
  const asset=(await pool.query("INSERT INTO shared_assets(workspace_id,project_id,name,kind,created_by,request_id) VALUES($1,$2,'image','image',$3,$4) RETURNING id",[spaces[0],projects[0],user,randomUUID()])).rows[0].id;
  await repository.access(spaces[0],user,async db=>assert.equal((await repository.asset(db,spaces[0],projects[0],asset)).id,asset));
  await assert.rejects(repository.access(spaces[0],user,db=>repository.asset(db,spaces[0],projects[1],asset)),{status:404});
  await assert.rejects(repository.access(spaces[1],user,()=>{}),{status:404});
  console.log('PASS model: cross-space FK rejected; private records preserved.');
} finally {await pool.end();}
