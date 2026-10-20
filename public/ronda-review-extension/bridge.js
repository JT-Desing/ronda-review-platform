(() => {
  const RONDA_ORIGIN='https://ronda.repolite.link';
  if(window===window.top){
    if(location.origin===RONDA_ORIGIN)window.postMessage({type:'ronda:web-review:extension-ready'},RONDA_ORIGIN);
    return;
  }
  let nonce='';
  let lastRange=null;
  let frame=0;
  const root=()=>document.scrollingElement||document.documentElement;
  const metrics=()=>{
    const scrollRoot=root(),body=document.body;
    return {scrollX:Math.max(0,window.scrollX||scrollRoot.scrollLeft||0),scrollY:Math.max(0,window.scrollY||scrollRoot.scrollTop||0),viewportWidth:Math.max(1,window.innerWidth),viewportHeight:Math.max(1,window.innerHeight),documentWidth:Math.max(window.innerWidth,scrollRoot.scrollWidth,scrollRoot.clientWidth,body?.scrollWidth||0),documentHeight:Math.max(window.innerHeight,scrollRoot.scrollHeight,scrollRoot.clientHeight,body?.scrollHeight||0)};
  };
  const send=(type,data={})=>window.parent.postMessage({type,nonce,...data},'*');
  // The extension can be injected after the iframe's load event. Ask Ronda to
  // repeat its nonce handshake; the parent validates this frame's WindowProxy.
  window.parent.postMessage({type:'ronda:web-review:extension-ready'},'*');
  const selectionData=()=>{
    if(!lastRange)return null;
    try{
      const quote=lastRange.toString().replace(/\s+/g,' ').trim().slice(0,2000);
      if(!quote)return null;
      const rects=Array.from(lastRange.getClientRects()).filter(rect=>rect.width>0&&rect.height>0).slice(0,80).map(({left,top,width,height})=>({left,top,width,height}));
      return rects.length?{quote,rects,metrics:metrics()}:null;
    }catch{return null}
  };
  const publish=()=>{
    if(!nonce||window.parent===window)return;
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(()=>{
      send('ronda:web-review:viewport',metrics());
      const selection=selectionData();if(selection)send('ronda:web-review:selection',selection);
    });
  };
  const updateSelection=()=>{
    const selection=window.getSelection();
    if(!selection||selection.isCollapsed||!selection.rangeCount)return;
    lastRange=selection.getRangeAt(0).cloneRange();
    publish();
  };
  window.addEventListener('message',event=>{
    if(event.source!==window.parent||event.origin!==RONDA_ORIGIN||event.data?.type!=='ronda:web-review:init'||typeof event.data.nonce!=='string'||event.data.nonce.length<20)return;
    nonce=event.data.nonce;publish();
  });
  window.addEventListener('mouseup',updateSelection,true);
  window.addEventListener('keyup',updateSelection,true);
  document.addEventListener('selectionchange',updateSelection,true);
  document.addEventListener('scroll',publish,{passive:true,capture:true});
  window.addEventListener('scroll',publish,{passive:true});
  window.addEventListener('resize',publish,{passive:true});
  window.visualViewport?.addEventListener('scroll',publish,{passive:true});
  window.visualViewport?.addEventListener('resize',publish,{passive:true});
  const observer=new ResizeObserver(publish);observer.observe(document.documentElement);if(document.body)observer.observe(document.body);
})();
