(() => {
  if (window.top === window || window.__rondaLiveReviewBridge) return;
  window.__rondaLiveReviewBridge = true;
  const RONDA_ORIGIN = 'https://ronda.repolite.link';
  let nonce = '';
  let queued = false;

  function metrics() {
    const html = document.documentElement;
    const page = document.body;
    const viewportWidth = Math.max(1, window.innerWidth || html.clientWidth);
    const viewportHeight = Math.max(1, window.innerHeight || html.clientHeight);
    return {
      scrollX: Math.max(0, window.scrollX || html.scrollLeft || page?.scrollLeft || 0),
      scrollY: Math.max(0, window.scrollY || html.scrollTop || page?.scrollTop || 0),
      viewportWidth,
      viewportHeight,
      documentWidth: Math.max(viewportWidth, html.scrollWidth, page?.scrollWidth || 0),
      documentHeight: Math.max(viewportHeight, html.scrollHeight, page?.scrollHeight || 0),
    };
  }
  function send(type, payload = {}) {
    if (!nonce) return;
    window.parent.postMessage({ type: `ronda:web-review:${type}`, nonce, ...payload }, '*');
  }
  function sendViewport() {
    queued = false;
    send('viewport', metrics());
  }
  function scheduleViewport() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(sendViewport);
  }
  window.addEventListener('message', event => {
    // The review iframe deliberately has an opaque origin (sandbox without
    // allow-same-origin), so its parent is reported as "null". The random
    // nonce is the handshake capability; keep the iframe sandbox unchanged.
    if (event.source !== window.parent || event.origin !== 'null') return;
    if (event.data?.type !== 'ronda:web-review:init' || typeof event.data.nonce !== 'string' || event.data.nonce.length > 100) return;
    nonce = event.data.nonce;
    sendViewport();
  });
  window.addEventListener('scroll', scheduleViewport, { passive: true, capture: true });
  window.addEventListener('resize', scheduleViewport, { passive: true });
  window.visualViewport?.addEventListener('scroll', scheduleViewport, { passive: true });
  window.visualViewport?.addEventListener('resize', scheduleViewport, { passive: true });
  document.addEventListener('selectionchange', () => {
    if (!nonce) return;
    const selection = window.getSelection();
    const quote = selection?.toString()?.replace(/\s+/g, ' ').trim();
    if (!quote) return;
    const range = selection.getRangeAt(0);
    const rects = [...range.getClientRects()].slice(0, 80).map(rect => ({ left: rect.left, top: rect.top, width: rect.width, height: rect.height }));
    if (rects.length) send('selection', { quote: quote.slice(0, 2000), rects, metrics: metrics() });
  });
  window.parent.postMessage({ type: 'ronda:web-review:extension-ready' }, '*');
})();
