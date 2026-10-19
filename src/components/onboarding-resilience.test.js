import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('personal-only onboarding retries a failed save and keeps its error visible', () => {
  const access = readFileSync(new URL('./AccountAccess.jsx', import.meta.url), 'utf8');
  const onboarding = readFileSync(new URL('./WorkspaceOnboarding.jsx', import.meta.url), 'utf8');
  assert.match(access, /ronda-onboarding:v1',JSON\.stringify\('personal'\)\);await retryAccount\(\)/);
  assert.match(onboarding, /await onComplete\(null\);\}catch\(reason\)\{setError\(reason\.message\|\|'No se pudo guardar esta opción/);
  assert.match(onboarding, /role="alert" className="account-error"/);
});

test('signup password can be inspected accessibly without clearing it and resets on auth-mode change',()=>{
  const access=readFileSync(new URL('./AccountAccess.jsx',import.meta.url),'utf8');
  const css=readFileSync(new URL('./account-access.css',import.meta.url),'utf8');
  assert.match(access,/const \[passwordVisible,setPasswordVisible\]=useState\(false\)/);
  assert.match(access,/type=\{passwordVisible\?'text':'password'\}/);
  assert.match(access,/aria-describedby=\{mode === 'register'\?'signup-password-hint':undefined\}/);
  assert.match(access,/<small id="signup-password-hint">Usa al menos 12 caracteres/);
  assert.match(access,/type="button" aria-label=\{passwordVisible\?'Ocultar contraseña':'Mostrar contraseña'\} aria-pressed=\{passwordVisible\}/);
  assert.equal((access.match(/setPasswordVisible\(false\)/g)||[]).length,3,'switching login/register or using the duplicate-account shortcut hides the password');
  assert.match(css,/\.account-password-toggle\{[^}]*min-height:44px/);
  assert.match(css,/\.account-password-toggle:focus-visible\{outline:2px solid var\(--accent\)/);
});

test('duplicate signup keeps the email, clears the attempted password and offers a direct login path',()=>{
  const access=readFileSync(new URL('./AccountAccess.jsx',import.meta.url),'utf8');
  assert.match(access,/if\(mode==='register'&&e\.status===409\)/);
  assert.match(access,/const form=event\.currentTarget;\s*const input = Object\.fromEntries\(new FormData\(form\)\)/);
  assert.match(access,/form\.elements\.namedItem\('password'\)/);
  assert.match(access,/setDuplicateRegistration\(true\)/);
  assert.match(access,/Ir a iniciar sesión con este correo/);
  assert.match(access,/setMode\('login'\);setPasswordVisible\(false\);setDuplicateRegistration\(false\);setError\(''\)/);
  assert.match(access,/value=\{email\} onChange=\{event=>setEmail\(event\.target\.value\)\}/);
});

test('new-account onboarding offers separate company, invite-code and personal paths',()=>{
  const access=readFileSync(new URL('./AccountAccess.jsx',import.meta.url),'utf8');
  const onboarding=readFileSync(new URL('./WorkspaceOnboarding.jsx',import.meta.url),'utf8');
  assert.match(access,/setOnboarding\(invitationOnboarding\|\|showWorkspaceOnboarding\(workspaces,hasPersonalWorkspaceChoice/);
  assert.match(access,/setOnboardingDraft\(current=>current\|\|\{choice:'join',name:'',code:invitationCode\}\)/);
  assert.match(access,/useState\(\(\)=>invitationCode\?'register':'login'\)/);
  assert.match(access,/choice:'join',name:'',code:invitationCode/);
  assert.match(access,/name="workspaceChoice" value="personal"/);
  assert.match(access,/name="workspaceChoice" value="create"/);
  assert.match(access,/name="workspaceChoice" value="join"/);
  assert.match(access,/name="teamName" autoComplete="organization" required/);
  assert.match(access,/name="invitationCode" autoComplete="off" spellCheck=\{false\} required/);
  assert.match(access,/const \{workspaceChoice,teamName,invitationCode,...credentials\}=input/);
  assert.match(access,/completeSignup\(\{api,credentials,setup,enter:async\(account,options\)=>enter\(account,options\)\}\)/);
  assert.match(access,/location\.hash=`#team\/\$\{completion\.workspaceId\}`/);
  assert.match(access,/setOnboardingDraft\(completion\.onboardingDraft\)/);
  assert.match(access,/initializeSignupCompletion\(\{initialize:initializeAccount,account,snapshot,choice:signupChoice,storage:accountStorage,flush:retryAccount\}\)/);
  assert.match(access,/showWorkspaceOnboarding\(workspaces,hasPersonalWorkspaceChoice\(/);
  assert.match(access,/requestId:crypto\.randomUUID\(\)/);
  assert.match(access,/if\(completion\.status==='retry'\)/);
  assert.match(access,/setSignupRecovery\(\{account:completion\.account,\.\.\.completion\.recoveryOptions\}\)/);
  assert.match(access,/Tu sesión sigue activa\. No vuelvas a registrarte/);
  assert.match(access,/setSignupRecovery\(\{account:result\.user,onboardingRecovery:false,signupChoice:''\}\)/);
  assert.match(access,/Tu sesión sigue activa, pero no pudimos cargar tu espacio/);
  assert.match(access,/<h1>Tu cuenta está activa<\/h1>/);
  assert.match(access,/Reintentar cargar mi espacio/);
  assert.match(access,/no repetiremos el registro ni la incorporación automáticamente/);
  assert.match(access,/catch \(e\) \{\s*setOnboardingDraft\(null\);\s*if\(mode==='register'&&e\.status===409\)/);
  assert.match(access,/initialChoice=\{onboardingDraft\?\.choice\} initialName=\{onboardingDraft\?\.name\} initialCode=\{onboardingDraft\?\.code\} initialError=\{onboardingDraft\?\.error\|\|''\} initialRequestId=\{onboardingDraft\?\.requestId\}/);
  assert.match(onboarding,/Crear mi equipo/);
  assert.match(onboarding,/Tengo invitación/);
  assert.match(onboarding,/choice==='join'\?'\/api\/workspace-invitations\/accept':'\/api\/workspaces'/);
  assert.match(onboarding,/Nombre de tu empresa o equipo/);
  assert.match(onboarding,/Código de invitación/);
  assert.match(onboarding,/debe coincidir con la dirección invitada/);
  assert.match(onboarding,/Continuar en mi espacio personal/);
  assert.match(onboarding,/initialChoice='',initialName='',initialCode=''/);
  assert.match(onboarding,/initialError='',initialRequestId=''/);
  assert.match(onboarding,/initialRequestId\|\|crypto\.randomUUID\(\)/);
  assert.match(onboarding,/choice==='join'\?\{token:code\.trim\(\)\}:\{name:normalizeTeamName\(name\),requestId:key\}/);
});

test('company team name validation is explained and blocks registration before account creation',()=>{
  const access=readFileSync(new URL('./AccountAccess.jsx',import.meta.url),'utf8');
  const onboarding=readFileSync(new URL('./WorkspaceOnboarding.jsx',import.meta.url),'utf8');
  assert.match(access,/import \{completeSignup,isValidTeamName,showWorkspaceOnboarding\}/);
  assert.match(access,/aria-invalid=\{signupWorkspace\.name\.length>0&&!isValidTeamName\(signupWorkspace\.name\)\}/);
  assert.match(access,/signup-team-name-hint/);
  assert.match(access,/disabled=\{busy\|\|\(mode==='register'&&signupWorkspace\.choice==='create'&&!isValidTeamName\(signupWorkspace\.name\)\)\|\|\(mode==='register'&&signupWorkspace\.choice==='join'&&!isValidInvitationCode\(signupWorkspace\.code\)\)\}/);
  assert.match(onboarding,/if\(busy\|\|\(choice==='create'&&!isValidTeamName\(name\)\)\|\|\(choice==='join'&&!isValidInvitationCode\(code\)\)\)return/);
  assert.match(onboarding,/name:normalizeTeamName\(name\)/);
});

test('manual invitation code validation explains malformed values and prevents premature registration',()=>{
  const access=readFileSync(new URL('./AccountAccess.jsx',import.meta.url),'utf8');
  const onboarding=readFileSync(new URL('./WorkspaceOnboarding.jsx',import.meta.url),'utf8');
  const flow=readFileSync(new URL('../domain/signup-flow.js',import.meta.url),'utf8');
  assert.match(access,/import \{isValidInvitationCode,readInvitationCode\}/);
  assert.match(access,/aria-invalid=\{signupWorkspace\.code\.length>0&&!isValidInvitationCode\(signupWorkspace\.code\)\}/);
  assert.match(access,/signup-invitation-code-hint/);
  assert.match(access,/signupWorkspace\.choice==='join'&&!isValidInvitationCode\(signupWorkspace\.code\)/);
  assert.match(onboarding,/choice==='join'&&!isValidInvitationCode\(code\)/);
  assert.match(onboarding,/workspace-invitation-code-hint/);
  assert.match(flow,/setup\.choice==='join'&&!isValidInvitationCode\(setup\.code\)\)throw new Error/);
  assert.match(flow,/setup\.choice==='join'&&!isValidInvitationCode\(setup\.code\)\)\{/);
});
