const headers={
  'Content-Type':'text/html; charset=utf-8',
  'Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff',
  'X-Frame-Options':'DENY',
  'Referrer-Policy':'no-referrer',
  'Content-Security-Policy':"default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function qaMailboxResponse(method,entries=[],recipient=null){
  if(method!=='GET')return {status:405,headers:{...headers,Allow:'GET'},body:''};
  if(!recipient)return {status:401,headers,body:'Inicia sesión con la cuenta QA destinataria para consultar su buzón.'};
  const ownEntries=entries.filter(message=>String(message.to).trim().toLowerCase()===String(recipient).trim().toLowerCase());
  const body='<h1>Buzón local QA — ningún correo enviado</h1>'+ownEntries.map(message=>`<article><h2>${escape(message.to)}</h2><h3>${escape(message.subject)}</h3><pre>${escape(message.text)}</pre></article>`).join('');
  return {status:200,headers,body};
}

export async function handleQaMailboxRequest(req,res,readEntries,resolveRecipient){
  if(req.method!=='GET'){
    const result=qaMailboxResponse(req.method);
    res.writeHead(result.status,result.headers);res.end(result.body);return;
  }
  const recipient=await resolveRecipient?.(req);
  if(!recipient){const result=qaMailboxResponse(req.method,[],null);res.writeHead(result.status,result.headers);res.end(result.body);return;}
  const entries=await readEntries();
  const result=qaMailboxResponse(req.method,entries,recipient);
  res.writeHead(result.status,result.headers);
  res.end(result.body);
}
