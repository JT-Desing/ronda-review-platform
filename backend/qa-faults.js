const labels={normal:'Normal',slow:'Red lenta (2 s por petición)',error_next_review:'Error 503 en la próxima lectura de revisión',error_next_workspaces:'Error 503 en la próxima lectura de espacios',error_next_workspace_create:'Error 503 en la próxima creación de equipo',error_next_invitation_accept:'Error 503 en la próxima aceptación de invitación',disconnect_next_upload:'Desconectar la próxima transferencia',disconnect_uploads:'Desconectar transferencias hasta restaurar Normal'};
export function createQaFaults(){
 let mode='normal';
 return {
  set(next){if(!Object.hasOwn(labels,next))throw new Error('Modo QA inválido');mode=next;},
  get mode(){return mode;},
  before({method,path}){
   if(mode==='disconnect_uploads'&&method==='PUT'&&path.endsWith('/content'))return {disconnect:true};
   if(mode==='slow')return {delayMs:2000};
   if(mode==='error_next_review'&&method==='GET'&&path.includes('/versions')){mode='normal';return {status:503,error:'QA: servidor temporalmente no disponible. Vuelve a intentarlo.'};}
   if(mode==='error_next_workspaces'&&method==='GET'&&path==='/api/workspaces'){mode='normal';return {status:503,error:'QA: no se pudo cargar la lista de espacios. Vuelve a intentarlo.'};}
   if(mode==='error_next_workspace_create'&&method==='POST'&&path==='/api/workspaces'){mode='normal';return {status:503,error:'QA: no se pudo crear el equipo por un fallo temporal. Vuelve a intentarlo.'};}
   if(mode==='error_next_invitation_accept'&&method==='POST'&&path==='/api/workspace-invitations/accept'){mode='normal';return {status:503,error:'QA: no se pudo aceptar la invitación por un fallo temporal. Vuelve a intentarlo.'};}
   if(mode==='disconnect_next_upload'&&method==='PUT'&&path.endsWith('/content')){mode='normal';return {disconnect:true};}
   return {};
  },
 };
}
export function qaFaultPage(mode){
 return '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fallos controlados QA</title></head><body style="background:#17131e;color:#eee;font:16px system-ui;padding:24px"><h1>Fallos controlados QA</h1><p>Solo afecta este origen y esta identidad ficticia. No cambia producción.</p><p role="status">Modo actual: '+labels[mode]+'</p><form method="post" action="/qa/control">'+Object.entries(labels).map(([value,label])=>'<button style="display:block;margin:12px 0;padding:12px" name="mode" value="'+value+'">'+label+'</button>').join('')+'</form></body></html>';
}
export async function handleQaControlRequest(req,res,{origin,faults}){
 if(req.method==='POST'){
  if(req.headers.origin!==origin){res.writeHead(403);res.end('QA origin required');return;}
  let body='';for await(const chunk of req){body+=chunk;if(body.length>1024){res.writeHead(413);res.end();return;}}
  try{faults.set(new URLSearchParams(body).get('mode'));}catch{res.writeHead(400);res.end('Invalid QA mode');return;}
  res.writeHead(303,{'Location':'/qa/control','Cache-Control':'no-store'});res.end();return;
 }
 if(req.method!=='GET'){res.writeHead(405);res.end();return;}
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(qaFaultPage(faults.mode));
}
