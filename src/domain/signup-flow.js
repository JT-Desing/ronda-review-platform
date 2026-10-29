import {needsWorkspaceChoice} from './onboarding.js';
import {isValidInvitationCode} from './invitation-link.js';

export const normalizeTeamName=value=>typeof value==='string'?value.trim():'';
export const isValidTeamName=value=>{
  const normalized=normalizeTeamName(value);
  return normalized.length>0&&normalized.length<=80;
};

export const showWorkspaceOnboarding=(workspaces,hasPersonalChoice,onboardingRecovery=false)=>Boolean(onboardingRecovery)||needsWorkspaceChoice(workspaces,hasPersonalChoice);

export async function recoverCreatedSignup({enter,account,onboardingRecovery=false,signupChoice=''}){
  try{
    await enter(account,{onboardingRecovery,signupChoice});
    return {status:'onboarding'};
  }catch(error){
    return {status:'retry',error};
  }
}

export async function completeSignup({api,credentials,setup,enter}){
  if(setup.choice==='create'&&!isValidTeamName(setup.name))throw new Error('Escribe un nombre válido para tu empresa o equipo.');
  if(setup.choice==='join'&&!isValidInvitationCode(setup.code))throw new Error('Pega el código de invitación completo para continuar.');
  const normalizedSetup=setup.choice==='create'?{...setup,name:normalizeTeamName(setup.name)}:setup;
  const registration=await api('/api/auth/register',{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(credentials)
  });
  const account=registration.user;
  const workspace=await applySignupWorkspace({api,setup:normalizedSetup});
  const recoveryOptions={onboardingRecovery:Boolean(workspace.onboardingDraft),signupChoice:workspace.onboardingDraft?'':normalizedSetup.choice};
  try{
    await enter(account,recoveryOptions);
    return {status:'ready',account,...workspace,recoveryOptions};
  }catch(firstError){
    const recovery=await recoverCreatedSignup({enter,account,...recoveryOptions});
    if(recovery.status==='onboarding')return {status:'ready',account,...workspace,recoveryOptions};
    return {status:'retry',account,...workspace,recoveryOptions,error:recovery.error||firstError};
  }
}

export async function applySignupWorkspace({api,setup}){
  if(setup.choice==='personal'){
    return {workspaceId:null,onboardingDraft:null};
  }
  if(setup.choice==='create'&&!isValidTeamName(setup.name)){
    return {workspaceId:null,onboardingDraft:{...setup,error:'Escribe un nombre válido para tu empresa o equipo.'}};
  }
  if(setup.choice==='join'&&!isValidInvitationCode(setup.code)){
    return {workspaceId:null,onboardingDraft:{...setup,error:'Pega el código de invitación completo para continuar.'}};
  }
  const normalizedSetup=setup.choice==='create'?{...setup,name:normalizeTeamName(setup.name)}:setup;
  try{
    const joining=normalizedSetup.choice==='join';
    const result=await api(joining?'/api/workspace-invitations/accept':'/api/workspaces',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(joining?{token:normalizedSetup.code.trim()}:{name:normalizedSetup.name,requestId:normalizedSetup.requestId,plan:normalizedSetup.plan||'estudio'})
    });
    const workspaceId=result.workspaceId||result.workspace?.id;
    if(!workspaceId)throw new Error('No se pudo confirmar el equipo. Puedes reintentar desde el siguiente paso.');
    return {workspaceId,onboardingDraft:null};
  }catch(failure){
    return {workspaceId:null,onboardingDraft:{...normalizedSetup,error:failure.message||'No se pudo completar la entrada al equipo.'}};
  }
}
