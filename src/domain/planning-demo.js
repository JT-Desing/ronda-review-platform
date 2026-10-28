// Disposable fixtures: never passed to the persistence reducer or server.
export function createPlanningDemo(month) {
  const members=Object.fromEntries([['sofia','Sofía Castillo','SC'],['mateo','Mateo Ruiz','MR'],['laura','Laura Méndez','LM']].map(([id,name,initials])=>[id,{id,name,initials}]));
  const projects={launch:{id:'launch',name:'Campaña lanzamiento'},video:{id:'video',name:'Video de producto'},landing:{id:'landing',name:'Landing de campaña'}};
  const counts=[8,14,2,0,7,22,8,14,47,5,0,4,16,38,11,9,3,0,0,6,12,22,8,2,0,3,9,14,6,4,2];
  const [year,m]=month.split('-').map(Number),days=new Date(Date.UTC(year,m,0)).getUTCDate(),comments={};
  const texts=['@Mateo Ruiz ajustar el contraste del carrusel.','@Laura Méndez revisar el cierre del video.','Cambio de titular aprobado.','@Sofía Castillo adaptar la pieza al formato vertical.','Validar el copy antes de la próxima entrega.'];
  for(let day=1;day<=days;day++)for(let i=0;i<(counts[day-1]||0);i++){const id=`demo-${month}-${day}-${i}`,projectId=Object.keys(projects)[i%3];comments[id]={id,projectId,text:texts[i%texts.length],authorId:Object.keys(members)[i%3],assigneeId:i%4===0?'laura':null,status:i%3===2?'resolved':'open',priority:i%7===0?'blocking':'normal',createdAt:`${month}-${String(day).padStart(2,'0')}T${String(14+i%8).padStart(2,'0')}:${String(i%60).padStart(2,'0')}:00Z`,timeSeconds:i%30};}
  return {members,projects,versions:{},comments};
}
