import {createSeedState} from './seed.js';
import {createPlanningDemo} from '../domain/planning-demo.js';
export function createCompanyDemo(now = new Date()) {
  const state=createSeedState(), fixture=createPlanningDemo(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`);
  state.workspace={id:'demo-company',name:'Estudio Norte · DEMO',plan:'studio'};
  state.currentUserId='laura';
  state.members=Object.fromEntries(Object.values(fixture.members).map(m=>[m.id,{...m,email:`${m.id}@example.invalid`,role:m.id==='laura'?'admin':'editor',status:'active'}]));
  state.projects={};state.versions={};state.assets=[];
  Object.values(fixture.projects).forEach((p,index)=>{
    const id=index===0?'project-amara':p.id,versionId=index===0?'version-amara-v3':`demo-version-${p.id}`;
    state.projects[id]={...p,id,client:'Estudio Norte · Empresa ficticia',activeVersionId:versionId};
    state.versions[versionId]={id:versionId,projectId:id,number:3,name:`${p.name} · V3`,reviewerIds:Object.keys(state.members),decisions:{}};
    for(let n=1;n<=4;n++)state.assets.push({id:`demo-${p.id}-${n}`,projectId:id,name:`${p.name} ${n}.svg`,type:'image',mime:'image/svg+xml',extension:'SVG',size:1500,demoTitle:['Una nueva ronda','Ideas que conectan','Otra perspectiva'][index],demoColor:['#c5b1e7','#e4c9a4','#aad0c5'][index],demoIndex:n});
  });
  state.comments=Object.fromEntries(Object.values(fixture.comments).map(c=>{const projectId=c.projectId==='launch'?'project-amara':c.projectId;return [c.id,{...c,projectId,versionId:state.projects[projectId].activeVersionId,frame:Math.floor(c.timeSeconds*24),replies:[]}]}));
  state.activity=Object.values(state.comments).map(c=>({id:`event-${c.id}`,kind:'comment.created',actorId:c.authorId,occurredAt:c.createdAt,commentId:c.id,projectId:c.projectId,versionId:c.versionId})).sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt));
  state.notifications=Object.fromEntries(state.activity.slice(0,8).map(e=>[e.id,{id:e.id,eventId:e.id,memberId:'laura',createdAt:e.occurredAt,projectId:e.projectId,versionId:e.versionId,commentId:e.commentId,readAt:null}]));
  return state;
}
