import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const phase=row=>row.path.endsWith('/uploads')?'Reserva de carga':row.path.endsWith('/content')?'Transferencia de archivo':row.path.endsWith('/complete')?'Finalización de carga':row.path.includes('/media/')?'Entrega de medio':row.path==='/api/links/inspect'?'Inspección de enlace':row.path.includes('/versions')?'Datos de revisión':'Otras peticiones';
export function summarizeTimings(rows){
 const groups=new Map();
 for(const row of rows){
  if(!Number.isFinite(row.ms)||row.ms<0||typeof row.path!=='string'||!Number.isInteger(row.status))continue;
  const label=phase(row),group=groups.get(label)||{label,times:[],errors:0};
  group.times.push(row.ms);if(row.status>=400)group.errors++;groups.set(label,group);
 }
 return [...groups.values()].map(group=>{
  group.times.sort((a,b)=>a-b);
  const quantile=p=>group.times[Math.max(0,Math.ceil(group.times.length*p)-1)];
  return {phase:group.label,count:group.times.length,errors:group.errors,p50:quantile(.5),p95:quantile(.95),max:group.times.at(-1)};
 }).sort((a,b)=>a.phase.localeCompare(b.phase));
}
export function timingReport(rows){
 const summaries=summarizeTimings(rows);
 return '# Mediciones HTTP del laboratorio QA\n\nDatos locales de iteraciones mixtas, no métricas de producción ni rendimiento de usuarios reales. Solo peticiones concluidas: las esperas sin respuesta no figuran aquí y se registran aparte en la matriz de fallos. Los tiempos no incluyen renderizado completo, interacción ni velocidad de red de otras personas.\n\n| Etapa | Peticiones | Errores HTTP | p50 ms | p95 ms | Máximo ms |\n|---|---:|---:|---:|---:|---:|\n'+summaries.map(r=>'| '+[r.phase,r.count,r.errors,r.p50,r.p95,r.max].join(' | ')+' |').join('\n')+'\n\nTransferencia y finalización se miden por separado. Sin registro de bytes ni duración completa del gesto de subir, no se calcula ancho de banda ni tiempo total de carga. Errores esperados de permisos y formato también cuentan en Errores HTTP. No se incluyen tokens, correos ni contenido privado.\n';
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const source=await readFile(new URL('../.superpowers/ronda-usability/timings.jsonl',import.meta.url),'utf8');
 const rows=source.trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));
 console.log(timingReport(rows));
}
