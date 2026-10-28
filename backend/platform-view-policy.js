import {withPlatformRole} from './platform-access.js';
// Workspace administrators may invite and manage pending invitations in their own team.
// The service still checks membership and role; this guard never grants membership.
export function restrictedWorkspaceAdministration({path,method,account}){
 if(withPlatformRole(account)?.platformRole==='superadmin')return false;
 return /^\/api\/workspaces\/[^/]+$/.test(path)&&method==='GET'||/^\/api\/workspaces\/[^/]+\/members(?:\/|$)/.test(path);
}
