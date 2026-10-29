export const assetDto=row=>({id:row.id,workspaceId:row.workspace_id,projectId:row.project_id,name:row.name,kind:row.kind,activeVersionId:row.active_version_id,revision:row.revision,previewFileId:row.preview_file_id||null,previewSize:Number(row.preview_size)||0,versionNumber:row.version_number||1,reviewerCount:Number(row.reviewer_count)||0,approvedCount:Number(row.approved_count)||0,openComments:Number(row.open_comments)||0});
export async function versionDto(db,row){
  const reviewers=(await db.query('SELECT d.user_id,d.decision,u.name FROM shared_review_decisions d JOIN workspace_members m ON m.user_id=d.user_id AND m.workspace_id=$2 JOIN users u ON u.id=d.user_id WHERE d.version_id=$1 AND d.active=true ORDER BY d.user_id',[row.id,row.workspace_id])).rows;
  return {id:row.id,assetId:row.asset_id,number:row.number,fileId:row.file_id,externalUrl:row.external_url||null,mime:row.mime,size:Number(row.size),name:row.name,createdAt:row.created_at,revision:row.revision,status:row.status,reviewerIds:reviewers.map(r=>r.user_id),reviewers:reviewers.map(r=>({id:r.user_id,name:r.name})),decisions:Object.fromEntries(reviewers.map(r=>[r.user_id,r.decision]))};
}
export const recordEvent=(db,space,actor,action,details)=>['project.created','review.version_created'].includes(action)
 ?db.query(`WITH created AS (
    INSERT INTO workspace_events(workspace_id,actor_id,action,details) VALUES($1,$2,$3,$4) RETURNING id
  ) INSERT INTO workspace_event_recipients(event_id,user_id)
    SELECT created.id,m.user_id FROM created CROSS JOIN workspace_members m
    LEFT JOIN shared_projects p ON p.workspace_id=$1 AND p.id=($4::jsonb->>'projectId')::uuid
    WHERE m.workspace_id=$1 AND (m.role='admin' OR NOT p.restricted OR p.created_by=m.user_id OR EXISTS(
      SELECT 1 FROM shared_project_members pm WHERE pm.workspace_id=$1 AND pm.project_id=p.id AND pm.user_id=m.user_id
    ))`,[space,actor,action,details])
 :db.query('INSERT INTO workspace_events(workspace_id,actor_id,action,details) VALUES($1,$2,$3,$4)',[space,actor,action,details]);
