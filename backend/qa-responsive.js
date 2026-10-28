const diagnosticBootstrap = `
<script>
(()=>{
  const report=(kind,detail={})=>{
    try{parent.postMessage({type:'ronda-qa-diagnostic',kind,pathname:location.pathname,detail},location.origin)}catch{}
  };
  const original=MutationObserver.prototype.observe;
  MutationObserver.prototype.observe=function(target,options){
    try{return original.call(this,target,options)}catch(error){
      let detail={targetType:target===null?'null':typeof target,targetNodeType:null,targetConstructor:null,stack:null};
      try{if(target&&typeof target==='object'){detail.targetNodeType=target.nodeType??null;detail.targetConstructor=target.constructor?.name??null;}}catch{detail.targetInspectionFailed=true;}
      try{if(typeof error?.stack==='string')detail.stack=error.stack.slice(0,5000);}catch{}
      report('MutationObserver.observe',detail);
      throw error;
    }
  };
  addEventListener('error',event=>{let stack=null;try{if(typeof event.error?.stack==='string')stack=event.error.stack.slice(0,5000)}catch{}report('window.error',{filename:(()=>{try{return new URL(event.filename,location.href).pathname}catch{return null}})(),line:event.lineno||null,column:event.colno||null,stack})},true);
  addEventListener('unhandledrejection',event=>{let stack=null;try{if(typeof event.reason?.stack==='string')stack=event.reason.stack.slice(0,5000)}catch{}report('unhandledrejection',{stack})},true);
})();
</script>`;

const parentDiagnosticBootstrap = `
<script>
(()=>{
  const safePath=value=>{
    try{const url=new URL(value,location.href);return url.origin===location.origin?url.pathname.slice(0,240):'<external>'}catch{return null}
  };
  const safeStack=value=>{
    if(typeof value!=='string')return null;
    return value.split('\\n').slice(1,13).map(line=>line.replace(/https?:\\/\\/[^\\s)]+/g,raw=>{
      const suffix=raw.match(/:(\\d+)(?::(\\d+))?$/);
      const base=suffix?raw.slice(0,-suffix[0].length):raw;
      try{const url=new URL(base);const path=url.origin===location.origin?url.origin+url.pathname.slice(0,240):'<external>';return path+(suffix?':'+suffix[1]+(suffix[2]?':'+suffix[2]:''):'')}catch{return '<url>'}
    })).join('\\n').slice(0,5000);
  };
  const report=(kind,detail={})=>{
    try{const panel=document.getElementById('qa-diagnostics');if(panel)panel.textContent+='\\n'+JSON.stringify({frame:'parent',kind,pathname:location.pathname,detail})}catch{}
  };
  const original=MutationObserver.prototype.observe;
  MutationObserver.prototype.observe=function(target,options){
    try{return original.call(this,target,options)}catch(error){
      let detail={targetType:target===null?'null':typeof target,targetNodeType:null,targetConstructor:null,stack:null};
      try{if(target&&typeof target==='object'){detail.targetNodeType=target.nodeType??null;detail.targetConstructor=target.constructor?.name??null;}}catch{detail.targetInspectionFailed=true;}
      try{detail.stack=safeStack(error?.stack)}catch{}
      report('MutationObserver.observe',detail);
      throw error;
    }
  };
  addEventListener('error',event=>report('window.error',{filename:safePath(event.filename),line:event.lineno||null,column:event.colno||null,errorType:typeof event.error?.name==='string'?event.error.name.slice(0,80):null,stack:safeStack(event.error?.stack)}),true);
  addEventListener('unhandledrejection',event=>report('unhandledrejection',{reasonType:typeof event.reason?.name==='string'?event.reason.name.slice(0,80):typeof event.reason,stack:safeStack(event.reason?.stack)}),true);
})();
</script>`;

export function injectQaDiagnostics(html){
  const source=String(html);
  const scriptTag=/<script\b/i.exec(source);
  if(scriptTag)return source.slice(0,scriptTag.index)+diagnosticBootstrap+source.slice(scriptTag.index);
  const headEnd=source.search(/<\/head\s*>/i);
  if(headEnd>=0)return source.slice(0,headEnd)+diagnosticBootstrap+source.slice(headEnd);
  throw new Error('QA diagnostics require an HTML document with a head or script');
}

export function responsiveQaHtml({selected,hash,diagnostics=false}){
  const presets=[[1920,1080],[1366,768],[768,1024],[393,852]];
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const links=presets.map(([width,height])=>{
    const query=new URLSearchParams({width:String(width),height:String(height),hash});
    if(diagnostics)query.set('diagnostics','1');
    return `<a href="/qa/responsive?${esc(query)}">${width} × ${height}</a>`;
  }).join(' · ');
  const src=`/${diagnostics?'?qaDiagnostics=1':''}${esc(hash)}`;
  const panel=diagnostics?'<h2>Diagnóstico QA temporal</h2><pre id="qa-diagnostics" role="status">Esperando errores no capturados; no se registra contenido de la página.</pre>'+parentDiagnosticBootstrap+'<script>addEventListener("message",event=>{const frame=document.getElementById("qa-app");if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.type!=="ronda-qa-diagnostic")return;const panel=document.getElementById("qa-diagnostics");const item={frame:"iframe",kind:event.data.kind,pathname:event.data.pathname,detail:event.data.detail};panel.textContent+=String.fromCharCode(10)+JSON.stringify(item,null,2)})</script>':'';
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Responsive QA aislado</title></head><body style="margin:12px;background:#25212b;color:#eee;font-family:system-ui"><h1>Responsive QA aislado</h1><p>Marco real ${selected[0]} × ${selected[1]} CSS px. Misma sesión ficticia; sin acceso a producción.</p><nav style="padding:12px;background:#ddd">${links}</nav>${panel}<iframe id="qa-app" title="Aplicación Ronda QA" src="${src}" style="display:block;border:0;margin-top:12px;width:${selected[0]}px;height:${selected[1]}px"></iframe></body></html>`;
}
