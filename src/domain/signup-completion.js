export function persistPersonalSignupChoice(choice,storage){
  if(choice!=='personal')return false;
  storage.setItem('ronda-onboarding:v1',JSON.stringify('personal'));
  return true;
}

export async function initializeSignupCompletion({initialize,account,snapshot,choice,storage,flush}){
  initialize(account,snapshot);
  if(choice!=='personal')return;
  persistPersonalSignupChoice(choice,storage);
  await flush();
}
