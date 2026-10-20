import {workspaceError} from './workspace-policy.js';
import {UUID_PATTERN} from './project-policy.js';
export function selectedProjectRole({workspaceRole,creatorId,actor,restricted,memberRole}){
 if(!['admin','editor','reviewer'].includes(workspaceRole))throw workspaceError(404,'Proyecto no disponible.');
 if(workspaceRole==='admin'||creatorId===actor||!restricted)return workspaceRole;
 if(!['editor','reviewer'].includes(memberRole))throw workspaceError(404,'Proyecto no disponible.');
 return workspaceRole==='reviewer'||memberRole==='reviewer'?'reviewer':'editor';
}
export async function validateProjectMembers(db,space,input){
 if(input===undefined)return null;
 if(!Array.isArray(input)||input.length>100||input.some(m=>!m||!UUID_PATTERN.test(m.userId||'')||!['editor','reviewer'].includes(m.role))||new Set(input.map(m=>m.userId)).size!==input.length)throw workspaceError(400,'Selecciona miembros y roles válidos, sin duplicados.');
 const rows=(await db.query('SELECT user_id,role FROM workspace_members WHERE workspace_id=$1 AND user_id=ANY($2::uuid[])',[space,input.map(m=>m.userId)])).rows;
 if(rows.length!==input.length)throw workspaceError(400,'Todas las personas deben pertenecer al equipo.');
 if(input.some(m=>m.role==='editor'&&rows.find(row=>row.user_id===m.userId).role==='reviewer'))throw workspaceError(400,'Un revisor del equipo no puede recibir permisos de editor en el proyecto.');
 return input.map(({userId,role})=>({userId,role})).sort((a,b)=>a.userId.localeCompare(b.userId));
}
export async function replaceProjectMembers(db,space,project,members){
 await db.query('DELETE FROM shared_project_members WHERE workspace_id=$1 AND project_id=$2',[space,project]);
 for(const member of members||[])await db.query('INSERT INTO shared_project_members(workspace_id,project_id,user_id,role) VALUES($1,$2,$3,$4)',[space,project,member.userId,member.role]);
 await db.query('UPDATE shared_projects SET restricted=$3 WHERE workspace_id=$1 AND id=$2',[space,project,members!==null]);
}
