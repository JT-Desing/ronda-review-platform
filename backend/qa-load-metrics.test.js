import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarizeTimings,timingReport} from './qa-load-metrics.js';
test('metrics separate upload phases and count failures without leaking raw request data',()=>{
 const rows=[{path:'/api/workspaces/:id/projects/:id/uploads',status:201,ms:10},{path:'/api/workspaces/:id/uploads/:id/content',status:200,ms:20},{path:'/api/workspaces/:id/uploads/:id/complete',status:400,ms:30},{path:'/api/workspaces/:id/uploads/:id/complete',status:200,ms:50}];
 const result=summarizeTimings(rows);
 assert.equal(result.length,3);
 assert.deepEqual(result.find(r=>r.phase==='Finalización de carga'),{phase:'Finalización de carga',count:2,errors:1,p50:30,p95:50,max:50});
 const report=timingReport(rows);assert.doesNotMatch(report,/\/api\//);assert.match(report,/no métricas de producción/);
});
