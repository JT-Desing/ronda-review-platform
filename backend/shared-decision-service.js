import {workspaceError} from './workspace-policy.js';
import {requestId} from './project-policy.js';
import {recordEvent,versionDto} from './shared-review-dto.js';
import {requireReviewAction} from './shared-review-policy.js';
export async function reviewSummary(db,versionId){
  const rows=(await db.query('SELECT d.decision FROM shared_review_decisions d JOIN shared_versions v ON v.id=d.version_id JOIN workspace_members m ON m.user_id=d.user_id AND m.workspace_id=v.workspace_id WHERE d.version_id=$1 AND d.active=true',[versionId])).rows;
  const blockers=(await db.query("SELECT count(*)::integer AS count FROM shared_version_comments WHERE version_id=$1 AND status='open' AND priority='blocking'",[versionId])).rows[0].count;
  const approved=rows.filter(r=>r.decision==='approved').length,pending=rows.filter(r=>r.decision==='pending').length,changesRequested=rows.filter(r=>r.decision==='changes_requested').length;
  return {approved,pending,changesRequested,blockers,status:rows.length>0&&approved===rows.length&&blockers===0?'approved':'reviewing'};
}
export function sharedDecisionService(repository){
  return {
    async decide(space,actor,c,input){
      const key=requestId(input.requestId);
      if(!['pending','approved','changes_requested'].includes(input.decision)||!Number.isInteger(input.revision))throw workspaceError(400,'Decisión inválida.');
      return repository.access(space,actor,async(db,role)=>{
        const v=await repository.version(db,space,c.projectId,c.assetId,c.versionId,true);
        let assigned=(await db.query('SELECT * FROM shared_review_decisions WHERE version_id=$1 AND user_id=$2 AND active=true',[c.versionId,actor])).rows[0];
        // On a version nobody was assigned to, a member who can comment may decide directly and
        // becomes its reviewer. Once someone is assigned, only the assigned people decide.
        if(!assigned){
          requireReviewAction(role,'comment');
          const active=(await db.query('SELECT count(*)::integer AS count FROM shared_review_decisions WHERE version_id=$1 AND active=true',[c.versionId])).rows[0].count;
          if(active>0)throw workspaceError(403,'No estás asignado como revisor de esta versión.');
          if(v.status==='approved')throw workspaceError(409,'La versión aprobada es de solo lectura.');
          if(v.revision!==input.revision)throw workspaceError(409,'La versión cambió. Actualiza antes de decidir.');
          assigned=(await db.query("INSERT INTO shared_review_decisions(version_id,user_id) VALUES($1,$2) ON CONFLICT(version_id,user_id) DO UPDATE SET active=true,decision='pending',request_id=NULL,decided_at=NULL RETURNING *",[c.versionId,actor])).rows[0];
        }
        if(assigned.request_id===key){if(assigned.decision!==input.decision)throw workspaceError(409,'Solicitud utilizada con otra decisión.');return {version:await versionDto(db,v)};}
        if(v.status==='approved')throw workspaceError(409,'La versión aprobada es de solo lectura.');
        if(v.revision!==input.revision)throw workspaceError(409,'La versión cambió. Actualiza antes de decidir.');
        if(input.decision==='approved'&&(await reviewSummary(db,c.versionId)).blockers)throw workspaceError(409,'Resuelve los comentarios bloqueantes antes de aprobar.');
        await db.query('UPDATE shared_review_decisions SET decision=$1,request_id=$2,decided_at=now() WHERE version_id=$3 AND user_id=$4',[input.decision,key,c.versionId,actor]);
        const summary=await reviewSummary(db,c.versionId);
        await db.query('UPDATE shared_versions SET status=$1,revision=revision+1 WHERE id=$2',[summary.status,c.versionId]);
        await recordEvent(db,space,actor,'review.decision',{...c,decision:input.decision,status:summary.status});
        return {version:await versionDto(db,await repository.version(db,space,c.projectId,c.assetId,c.versionId))};
      },true);
    },
  };
}
