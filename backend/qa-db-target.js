import {execFileSync} from 'node:child_process';

const databasePattern=/^ronda_qa_[a-f0-9]{32}$/;
const containerPattern=/^ronda-review-qa-[a-f0-9]{32}$/;

export function validateQaDatabaseTarget(connectionString,containerName,inspectContainer=defaultInspect){
  let url;
  try{url=new URL(connectionString);}catch{throw new Error('Dedicated local QA database required');}
  const database=url.pathname.slice(1);
  const port=Number(url.port);
  if(!['postgres:','postgresql:'].includes(url.protocol)||url.hostname!=='127.0.0.1'||url.username!=='postgres'||!url.password||!port||port===5432||!databasePattern.test(database)||!containerPattern.test(containerName||''))throw new Error('Dedicated local QA database required');
  let container;
  try{container=inspectContainer(containerName);}catch{throw new Error('Dedicated labeled QA database container required');}
  if(container?.State?.Running!==true||container?.Config?.Labels?.['ronda.qa']!=='shared-review')throw new Error('Dedicated labeled QA database container required');
  const databaseEnv=(container.Config.Env||[]).find(value=>value.startsWith('POSTGRES_DB='));
  const portBindings=container.NetworkSettings?.Ports?.['5432/tcp']||[];
  if(databaseEnv!==`POSTGRES_DB=${database}`||!portBindings.some(binding=>binding.HostIp==='127.0.0.1'&&Number(binding.HostPort)===port))throw new Error('QA connection does not match the labeled local container');
  return url;
}

function defaultInspect(containerName){
  const result=execFileSync('docker',['inspect',containerName],{encoding:'utf8',stdio:['ignore','pipe','ignore']});
  const parsed=JSON.parse(result);
  if(!Array.isArray(parsed)||parsed.length!==1)throw new Error('Container inspection failed');
  return parsed[0];
}
