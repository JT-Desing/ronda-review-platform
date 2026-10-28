export function notifySessionExpired(path,error,target=globalThis.window){
 if(error?.status===401&&String(path).startsWith('/api/')&&!String(path).startsWith('/api/auth/'))target?.dispatchEvent(new CustomEvent('ronda-session-expired'));
}

export async function reauthenticateAccount(account,password,request){
 const result=await request('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:account.email,password})});
 if(result.user?.id!==account.id){
  await request('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  throw new Error('Vuelve a entrar con la misma cuenta para conservar este borrador.');
 }
 return result.user;
}
