let session = null;
export const demoSession = () => session;
export function beginDemoSession(state) {
  session = { data: {}, files: new Map() };
  const campaigns=Object.values(state.projects).map(p=>({id:p.id,name:p.name,group:'Lanzamientos · DEMO',adGroups:[{id:'prospecting',name:'Prospección'},{id:'retargeting',name:'Remarketing'}],pieces:state.assets.filter(a=>a.projectId===p.id).map((a,i)=>({id:a.id,assetId:a.id,name:a.name,format:'SVG',type:'image',adGroupId:i%2?'retargeting':'prospecting',version:'V3',status:'review',config:{Plataforma:'Meta Ads',Objetivo:'Reconocimiento',Audiencia:'Audiencia de ejemplo',Ubicaciones:'Instagram Feed',Presupuesto:'COP 500.000 · Simulado',Fechas:'Octubre · Demo','Texto del anuncio':'Una nueva ronda. Una mejor versión.',Destino:'https://example.invalid'},comments:[],history:[]}))}));
  session.data['ronda-pauta:v1']=JSON.stringify({groups:['Lanzamientos · DEMO'],campaigns});
  for (const asset of state.assets) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080"><rect width="1080" height="1080" fill="${asset.demoColor}"/><circle cx="940" cy="840" r="390" fill="none" stroke="#ffffff" stroke-opacity=".2" stroke-width="140"/><text x="80" y="140" fill="#20202a" font-family="sans-serif" font-size="28">ESTUDIO NORTE · DEMO</text><text x="80" y="480" fill="#20202a" font-family="sans-serif" font-size="70">${asset.demoTitle}</text><text x="80" y="950" fill="#20202a" font-family="sans-serif" font-size="28">Pieza ficticia · ${asset.demoIndex}</text></svg>`;
    session.files.set(asset.id, new File([svg],asset.name,{type:'image/svg+xml'}));
  }
}
export function endDemoSession() { session = null; }
