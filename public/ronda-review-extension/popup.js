const RONDA_ORIGIN='https://ronda.repolite.link';
const siteSelect=document.querySelector('#site');
const connectButton=document.querySelector('#connect');
const status=document.querySelector('#status');

function setStatus(message,isError=false){status.textContent=message;status.dataset.error=String(isError);}

async function activeRondaTab(){
  const [tab]=await chrome.tabs.query({active:true,lastFocusedWindow:true});
  if(!tab?.id||!tab.url?.startsWith(`${RONDA_ORIGIN}/`))throw new Error('Abre primero el proyecto de Ronda que contiene la web que quieres revisar.');
  return tab;
}

async function findExternalFrames(tabId){
  const [{result=[]}={}]=await chrome.scripting.executeScript({target:{tabId},func:()=>Array.from(document.querySelectorAll('iframe')).map(frame=>frame.src).filter(Boolean)});
  const current=new URL(RONDA_ORIGIN);
  return [...new Map(result.map(value=>{try{const url=new URL(value);return url.protocol==='https:'&&url.origin!==current.origin?[url.origin,url.origin]:null}catch{return null}}).filter(Boolean))].map(([origin])=>origin);
}

async function refreshSites(){
  try{
    const tab=await activeRondaTab();
    const origins=await findExternalFrames(tab.id);
    siteSelect.replaceChildren(...origins.map(origin=>new Option(origin,origin)));
    if(!origins.length){connectButton.disabled=true;setStatus('Carga la web externa en el visor de Ronda y vuelve a abrir esta extensión.');return}
    connectButton.disabled=false;
    setStatus(`${origins.length} dominio${origins.length===1?'':'s'} detectado${origins.length===1?'':'s'}. Solo se pedirá acceso al elegido.`);
  }catch(error){connectButton.disabled=true;setStatus(error.message||'No se pudo detectar Ronda en la pestaña actual.',true)}
}

connectButton.addEventListener('click',async()=>{
  connectButton.disabled=true;
  try{
    const origin=siteSelect.value;
    if(!origin)throw new Error('No hay un dominio seleccionado.');
    const permission={origins:[`${origin}/*`]};
    // Request immediately in the click handler; Chrome requires a live user gesture.
    const allowed=await chrome.permissions.request(permission);
    if(!allowed)throw new Error('No se concedió permiso para este dominio.');
    const tab=await activeRondaTab();
    const id=`ronda-review-${btoa(origin).replace(/[^a-z0-9]/gi,'').toLowerCase().slice(0,32)}`;
    const registered=await chrome.scripting.getRegisteredContentScripts({ids:[id]});
    if(!registered.length)await chrome.scripting.registerContentScripts([{id,matches:[`${origin}/*`],js:['bridge.js'],allFrames:true,matchOriginAsFallback:true,runAt:'document_start',persistAcrossSessions:true}]);
    await chrome.scripting.executeScript({target:{tabId:tab.id,allFrames:true},files:['bridge.js']});
    setStatus(`Conectado a ${origin}. Ya puedes seleccionar texto en la página y comentarlo desde Ronda.`);
    connectButton.textContent='Conectado';
  }catch(error){setStatus(error.message||'No se pudo conectar el dominio.',true);connectButton.disabled=false}
});

refreshSites();
