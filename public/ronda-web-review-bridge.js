(() => {
  const script = document.currentScript;
  const configuredOrigin = new URL(script?.src || location.href).searchParams.get('parentOrigin') || 'https://ronda.repolite.link';
  let nonce = '';
  const scrollingElement = () => document.scrollingElement || document.documentElement;
  const dimensions = () => {
    const root = scrollingElement();
    const body = document.body;
    return {
      scrollX: Math.max(0, window.scrollX || root.scrollLeft || 0),
      scrollY: Math.max(0, window.scrollY || root.scrollTop || 0),
      viewportWidth: Math.max(1, window.innerWidth),
      viewportHeight: Math.max(1, window.innerHeight),
      documentWidth: Math.max(window.innerWidth, root.scrollWidth, root.clientWidth, body?.scrollWidth || 0),
      documentHeight: Math.max(window.innerHeight, root.scrollHeight, root.clientHeight, body?.scrollHeight || 0),
    };
  };
  let frame = 0;
  const publish = () => {
    if (!nonce || window.parent === window) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => window.parent.postMessage({type:'ronda:web-review:viewport',nonce,...dimensions()}, configuredOrigin));
  };
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin !== configuredOrigin || event.data?.type !== 'ronda:web-review:init' || typeof event.data.nonce !== 'string' || event.data.nonce.length < 20) return;
    nonce = event.data.nonce;
    publish();
  });
  window.addEventListener('scroll', publish, {passive:true});
  window.addEventListener('resize', publish, {passive:true});
  window.visualViewport?.addEventListener('scroll', publish, {passive:true});
  window.visualViewport?.addEventListener('resize', publish, {passive:true});
  const observer = new ResizeObserver(publish);
  observer.observe(document.documentElement);
  if (document.body) observer.observe(document.body);
  new MutationObserver(publish).observe(document.documentElement, {childList:true,subtree:true});
})();
